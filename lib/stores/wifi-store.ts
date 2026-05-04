import NetInfo from '@react-native-community/netinfo';
import { type Permission, PermissionsAndroid, Platform } from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import { create } from 'zustand';
import type { WifiSongMapping } from '../types/wifi';
import {
  AUDIO_SOURCE_TYPES,
  hasBluetoothPriority,
  isPlaying,
  playSound,
  stopSound,
} from '../utils/controls';
import { logger } from '../utils/logger';
import {
  deleteMappingWifiUtil,
  getMappingByBSSID,
  loadMappingsWifiUtil,
  saveMappingWifiUtil,
  updateVolumeWifiUtil,
} from '../utils/wifimapping';

// Module-level refs (store is a singleton)
let previousWifi: { ssid: string | null; bssid: string | null } = { ssid: null, bssid: null };

const ensureWifiPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const permissions: (Permission | undefined)[] = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    Platform.Version >= 33 ? PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES : undefined,
  ];
  const toCheck = permissions.filter(Boolean) as Permission[];
  if (!toCheck.length) return true;
  const results = await Promise.all(toCheck.map((p) => PermissionsAndroid.check(p)));
  return results.every(Boolean);
};

interface WiFiState {
  mappings: WifiSongMapping[];
  currentWifi: { ssid: string; bssid: string | null };
  locationBlocked: boolean;
}

interface WiFiActions {
  loadMappings: () => Promise<WifiSongMapping[]>;
  saveMapping: (bssid: string, ssid: string, songUri: string, songName: string) => Promise<boolean>;
  deleteMapping: (bssid: string) => Promise<boolean>;
  testMapping: (bssid: string) => Promise<boolean>;
  updateVolume: (bssid: string, volume: number) => Promise<boolean>;
  getCurrentWifi: () => Promise<{ ssid: string; bssid: string | null }>;
  playSongForCurrentWifi: (forcePlay?: boolean) => Promise<void>;
  playSongForCurrentWifiImmediate: (wifiInfo: {
    ssid: string;
    bssid: string | null;
  }) => Promise<void>;
}

export const useWifiStore = create<WiFiState & WiFiActions>((set, get) => ({
  mappings: [],
  currentWifi: { ssid: '', bssid: null },
  locationBlocked: false,

  loadMappings: async () => {
    try {
      const mappings = await loadMappingsWifiUtil();
      set({ mappings });
      return mappings;
    } catch (error) {
      logger.error('WiFiStore', 'Error loading mappings', error);
      return [];
    }
  },

  saveMapping: async (bssid, ssid, songUri, songName) => {
    const result = await saveMappingWifiUtil(bssid, ssid, songUri, songName);
    if (result) await get().loadMappings();
    return result;
  },

  deleteMapping: async (bssid) => {
    if (isPlaying(bssid)) await stopSound();
    const result = await deleteMappingWifiUtil(bssid);
    if (result) await get().loadMappings();
    return result;
  },

  updateVolume: async (bssid, volume) => {
    const result = await updateVolumeWifiUtil(bssid, volume);
    if (result) await get().loadMappings();
    return result;
  },

  testMapping: async (bssid) => {
    try {
      const mapping = await getMappingByBSSID(bssid);
      if (mapping) {
        await playSound(mapping.songUri, bssid, AUDIO_SOURCE_TYPES.WIFI, {
          forceReplay: true,
          volume: mapping.volume,
          notificationTitle: mapping.songName,
          networkName: mapping.wifiName,
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('WiFiStore', 'Error testing mapping', error);
      return false;
    }
  },

  playSongForCurrentWifiImmediate: async ({ ssid, bssid }) => {
    if (!bssid || !ssid) {
      if (!hasBluetoothPriority()) await stopSound();
      return;
    }
    try {
      if (hasBluetoothPriority()) return;
      const mapping = await getMappingByBSSID(bssid);
      if (mapping) {
        await playSound(mapping.songUri, bssid, AUDIO_SOURCE_TYPES.WIFI, {
          volume: mapping.volume,
          notificationTitle: mapping.songName,
          networkName: ssid,
        });
      } else if (!hasBluetoothPriority()) {
        await stopSound();
      }
    } catch (error) {
      logger.error('WiFiStore', 'Error in immediate playback', error);
      if (!hasBluetoothPriority()) await stopSound();
    }
  },

  getCurrentWifi: async () => {
    if (Platform.OS === 'android') {
      const hasPerms = await ensureWifiPermissions();
      if (!hasPerms) {
        await stopSound();
        previousWifi = { ssid: null, bssid: null };
        set({ currentWifi: { ssid: '', bssid: null }, locationBlocked: true });
        return { ssid: '', bssid: null };
      }
    }
    try {
      // Check NetInfo first — prevents acting on a stale SSID that WifiManager
      // briefly returns right after the OS disconnects from a network.
      const netState = await NetInfo.fetch();
      if (netState.type !== 'wifi' || !netState.isConnected) {
        if (!hasBluetoothPriority()) await stopSound();
        previousWifi = { ssid: null, bssid: null };
        set({ currentWifi: { ssid: '', bssid: null }, locationBlocked: false });
        return { ssid: '', bssid: null };
      }

      const ssid = await WifiManager.getCurrentWifiSSID();
      let bssid: string | null = null;

      if (!ssid || ssid === '' || ssid.toLowerCase() === '<unknown ssid>') {
        const wifiConnectedButBlocked = netState.type === 'wifi' && netState.isConnected === true;
        if (!hasBluetoothPriority()) await stopSound();
        previousWifi = { ssid: null, bssid: null };
        set({ currentWifi: { ssid: '', bssid: null }, locationBlocked: wifiConnectedButBlocked });
        return { ssid: '', bssid: null };
      }

      try {
        const networks = await WifiManager.loadWifiList();
        bssid = networks.find((n) => n.SSID === ssid)?.BSSID ?? null;
      } catch (error) {
        logger.warn('WiFiStore', 'Error loading WiFi list', error);
      }

      const wifiChanged = previousWifi.ssid !== ssid || previousWifi.bssid !== bssid;
      set({ currentWifi: { ssid, bssid }, locationBlocked: false });

      if (wifiChanged) {
        previousWifi = { ssid, bssid };
        await get().playSongForCurrentWifiImmediate({ ssid, bssid });
      }

      return { ssid, bssid };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // "Not connected or connecting." = no WiFi, not a location issue
      const isDisconnected = /not connected/i.test(msg);
      logger.error('WiFiStore', 'Error getting current WiFi', error);
      if (!hasBluetoothPriority()) await stopSound();
      previousWifi = { ssid: null, bssid: null };
      set({ currentWifi: { ssid: '', bssid: null }, locationBlocked: !isDisconnected });
      return { ssid: '', bssid: null };
    }
  },

  playSongForCurrentWifi: async (forcePlay = false) => {
    try {
      if (!forcePlay && hasBluetoothPriority()) return;
      const { bssid, ssid } = await get().getCurrentWifi();
      if (!bssid || !ssid) {
        if (!hasBluetoothPriority()) await stopSound();
        return;
      }
      const allMappings = await get().loadMappings();
      const mapping = allMappings.find((m) => m.bssid === bssid);
      if (mapping) {
        await playSound(mapping.songUri, mapping.bssid, AUDIO_SOURCE_TYPES.WIFI, {
          forceReplay: forcePlay,
          volume: mapping.volume,
          notificationTitle: mapping.songName,
          networkName: mapping.wifiName,
        });
      } else if (!hasBluetoothPriority()) {
        await stopSound();
      }
    } catch (error) {
      logger.error('WiFiStore', 'Error playing song for current WiFi', error);
      if (!hasBluetoothPriority()) await stopSound();
    }
  },
}));
