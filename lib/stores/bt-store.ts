import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, type Device } from 'react-native-ble-plx';
import { create } from 'zustand';
import type { BluetoothSongMapping } from '../types/ble';
import {
  deleteMappingBTUtil,
  getMappingByID,
  loadMappingsBTUtil,
  saveMappingBTUtil,
  updateVolumeBTUtil,
} from '../utils/btmapping';
import { AUDIO_SOURCE_TYPES, playSound, stopSound } from '../utils/controls';
import { logger } from '../utils/logger';

const bleManager = new BleManager();

// Module-level refs (store is a singleton)
let previousDeviceId: string | null = null;
let songLoopInterval: ReturnType<typeof setInterval> | null = null;
let scanTimer: ReturnType<typeof setTimeout> | null = null;
let scanActive = false;

// Discovery mode: infrequent long scans when no device is paired.
// Monitoring mode: short frequent scans while a device is paired so disappearance
// is detected within ~8 seconds instead of ~35 seconds.
const DISCOVERY = { scanMs: 10_000, waitMs: 25_000 };
const MONITORING = { scanMs: 3_000, waitMs: 5_000 };

async function runScanCycle(): Promise<void> {
  if (!scanActive) return;
  const store = useBtStore.getState();
  const mode = store.currentPairedDevice ? MONITORING : DISCOVERY;
  try {
    const devices = await store.scanForNearbyDevices(mode.scanMs);
    await store.checkForDisconnectedDevices(devices);
    await store.checkForMappedDevices(devices);
  } catch (e) {
    logger.error('BTStore', 'Scan cycle error', e);
  }
  if (scanActive) {
    const waitMode = useBtStore.getState().currentPairedDevice ? MONITORING : DISCOVERY;
    scanTimer = setTimeout(runScanCycle, waitMode.waitMs);
  }
}

const requestPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const results = await Promise.all([
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN),
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT),
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION),
    ]);
    return results.every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  return true;
};

interface BTState {
  mappings: BluetoothSongMapping[];
  nearbyDevices: Device[];
  isScanning: boolean;
  currentPairedDevice: { id: string; name: string } | null;
}

interface BTActions {
  loadMappings: () => Promise<BluetoothSongMapping[]>;
  saveMapping: (id: string, name: string, songUri: string, songName: string) => Promise<boolean>;
  deleteMapping: (id: string) => Promise<boolean>;
  testMapping: (id: string) => Promise<boolean>;
  updateVolume: (id: string, volume: number) => Promise<boolean>;
  scanForNearbyDevices: (scanDuration?: number) => Promise<Device[]>;
  startContinuousScanning: () => void;
  stopContinuousScanning: () => void;
  checkForMappedDevices: (devices: Device[]) => Promise<void>;
  checkForDisconnectedDevices: (devices: Device[]) => Promise<void>;
}

export const useBtStore = create<BTState & BTActions>((set, get) => ({
  mappings: [],
  nearbyDevices: [],
  isScanning: false,
  currentPairedDevice: null,

  loadMappings: async () => {
    try {
      const mappings = await loadMappingsBTUtil();
      set({ mappings });
      return mappings;
    } catch (error) {
      logger.error('BTStore', 'Error loading mappings', error);
      return [];
    }
  },

  saveMapping: async (id, name, songUri, songName) => {
    const result = await saveMappingBTUtil(id, name, songUri, songName);
    if (result) await get().loadMappings();
    return result;
  },

  deleteMapping: async (id) => {
    try {
      const { currentPairedDevice } = get();
      if (currentPairedDevice?.id === id) {
        await stopSound();
        if (songLoopInterval) {
          clearInterval(songLoopInterval);
          songLoopInterval = null;
        }
      }
      const result = await deleteMappingBTUtil(id);
      if (result) await get().loadMappings();
      return result;
    } catch (error) {
      logger.error('BTStore', 'Error deleting BT mapping', error);
      return false;
    }
  },

  testMapping: async (id) => {
    try {
      const mapping = await getMappingByID(id);
      if (mapping) {
        await playSound(mapping.songUri, id, AUDIO_SOURCE_TYPES.BLUETOOTH, {
          forceReplay: true,
          volume: mapping.volume,
          notificationTitle: mapping.songName,
          networkName: mapping.name,
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('BTStore', 'Error testing BT mapping', error);
      return false;
    }
  },

  updateVolume: async (id, volume) => {
    const result = await updateVolumeBTUtil(id, volume);
    if (result) await get().loadMappings();
    return result;
  },

  scanForNearbyDevices: async (scanDuration = 10_000) => {
    try {
      const hasPerms = await requestPermissions();
      if (!hasPerms) return [];

      const btState = await bleManager.state();
      if (btState !== 'PoweredOn') {
        set({ nearbyDevices: [] });
        return [];
      }

      const foundDevices = new Map<string, Device>();

      return new Promise<Device[]>((resolve) => {
        bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
          if (error) {
            logger.error('BTStore', 'BLE scan error', error);
            return;
          }
          if (device?.rssi && device.rssi > -70) {
            foundDevices.set(device.id, device);
            const sorted = Array.from(foundDevices.values())
              .filter((d) => d.rssi && d.rssi > -70)
              .sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100));
            set({ nearbyDevices: sorted });
          }
        });

        setTimeout(() => {
          bleManager.stopDeviceScan();
          const final = Array.from(foundDevices.values())
            .filter((d) => d.rssi && d.rssi > -70)
            .sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100));
          set({ nearbyDevices: final });
          resolve(final);
        }, scanDuration);
      });
    } catch (error) {
      logger.error('BTStore', 'Error scanning for nearby devices', error);
      return [];
    }
  },

  checkForMappedDevices: async (devices) => {
    try {
      for (const device of devices) {
        const mapping = await getMappingByID(device.id);
        if (mapping && device.id !== previousDeviceId) {
          previousDeviceId = device.id;
          set({ currentPairedDevice: { id: device.id, name: device.name ?? 'Unknown Device' } });

          const play = () =>
            playSound(mapping.songUri, device.id, AUDIO_SOURCE_TYPES.BLUETOOTH, {
              forceReplay: false,
              volume: mapping.volume,
              notificationTitle: mapping.songName,
              networkName: device.name ?? mapping.name,
            });
          await play();

          songLoopInterval = setInterval(async () => {
            try {
              const { nearbyDevices } = get();
              if (nearbyDevices.some((d) => d.id === device.id)) await play();
            } catch (error) {
              logger.error('BTStore', 'Error in song loop', error);
            }
          }, 180000);

          break;
        }
      }
    } catch (error) {
      logger.error('BTStore', 'Error checking for mapped devices', error);
    }
  },

  checkForDisconnectedDevices: async (currentDevices) => {
    try {
      const ids = new Set(currentDevices.map((d) => d.id));
      const { currentPairedDevice } = get();
      if (currentPairedDevice && !ids.has(currentPairedDevice.id)) {
        await stopSound();
        if (songLoopInterval) {
          clearInterval(songLoopInterval);
          songLoopInterval = null;
        }
        set({ currentPairedDevice: null });
        previousDeviceId = null;
      }
    } catch (error) {
      logger.error('BTStore', 'Error checking for disconnected devices', error);
    }
  },

  startContinuousScanning: () => {
    if (scanActive) return;
    scanActive = true;
    set({ isScanning: true });
    runScanCycle();
  },

  stopContinuousScanning: () => {
    scanActive = false;
    set({ isScanning: false });
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
    if (songLoopInterval) {
      clearInterval(songLoopInterval);
      songLoopInterval = null;
    }
    bleManager.stopDeviceScan();
  },
}));
