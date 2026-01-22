import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import {
  BluetoothSongMapping,
  BluetoothSongMappingContextType,
} from "../lib/types/ble";
import {
  deleteMappingBTUtil,
  getMappingByID,
  loadMappingsBTUtil,
  saveMappingBTUtil,
} from "../lib/utils/btmapping";
import {
  AUDIO_SOURCE_TYPES,
  playSound,
  stopSound,
} from "../lib/utils/controls";

const bleManager = new BleManager();

const BluetoothSongMappingContext = createContext<
  BluetoothSongMappingContextType | undefined
>(undefined);

export const BluetoothSongMappingProvider: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [mappings, setMappings] = useState<BluetoothSongMapping[]>([]);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [currentPairedDevice, setCurrentPairedDevice] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [nearbyDevices, setNearbyDevices] = useState<Device[]>([]);
  const previousDeviceRef = useRef<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousNearbyDevicesRef = useRef<Device[]>([]);
  const songLoopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const refreshMappings = useCallback(() => {
    setRefreshFlag((prev) => prev + 1);
  }, []);

  const loadMappings = useCallback(async () => {
    try {
      const mappingsArray = await loadMappingsBTUtil();
      setMappings(mappingsArray);
      return mappingsArray;
    } catch (error) {
      console.error("Error in loadMappings:", error);
      return [];
    }
  }, []);

  useEffect(() => {
    loadMappings();
  }, [loadMappings, refreshFlag]);

  const requestPermissions = useCallback(async () => {
    if (Platform.OS === "android") {
      const granted = await Promise.all([
        PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ),
        PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ),
        PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ),
      ]).then((results) =>
        results.every(
          (result) => result === PermissionsAndroid.RESULTS.GRANTED,
        ),
      );

      return granted;
    }
    return true;
  }, []);

  const scanForNearbyDevices = useCallback(async () => {
    try {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        return [];
      }

      const bluetoothState = await bleManager.state();
      if (bluetoothState !== "PoweredOn") {
        setNearbyDevices([]);
        return [];
      }

      const foundDevices = new Map<string, Device>();

      return new Promise<Device[]>((resolve) => {
        bleManager.startDeviceScan(
          null,
          { allowDuplicates: false },
          (error, device) => {
            if (error) {
              console.error("BLE Scan error:", error);
              return;
            }

            if (device && device.rssi && device.rssi > -70) {
              foundDevices.set(device.id, device);

              const sortedDevices = Array.from(foundDevices.values())
                .filter((d) => d.rssi && d.rssi > -70)
                .sort((a, b) => (b.rssi || -100) - (a.rssi || -100));

              setNearbyDevices(sortedDevices);
            }
          },
        );

        setTimeout(() => {
          bleManager.stopDeviceScan();

          const finalDevices = Array.from(foundDevices.values())
            .filter((device) => device.rssi && device.rssi > -70)
            .sort((a, b) => (b.rssi || -100) - (a.rssi || -100));

          setNearbyDevices(finalDevices);
          resolve(finalDevices);
        }, 10000);
      });
    } catch (error) {
      console.error("Error scanning for nearby devices:", error);
      return [];
    }
  }, [requestPermissions]);

  const checkForMappedDevices = useCallback(
    async (devices: Device[]) => {
      try {
        for (const device of devices) {
          const mapping = await getMappingByID(device.id);
          if (mapping && device.id !== previousDeviceRef.current) {
            previousDeviceRef.current = device.id;
            setCurrentPairedDevice({
              id: device.id,
              name: device.name || "Unknown Device",
            });

            const startContinuousPlayback = async () => {
              await playSound(
                mapping.songUri,
                device.id,
                AUDIO_SOURCE_TYPES.BLUETOOTH,
                { forceReplay: false },
              );
            };

            await startContinuousPlayback();

            songLoopIntervalRef.current = setInterval(async () => {
              try {
                const currentDeviceIds = nearbyDevices.map((d) => d.id);
                if (currentDeviceIds.includes(device.id)) {
                  await startContinuousPlayback();
                }
              } catch (error) {
                console.error("Error in song loop:", error);
              }
            }, 180000);

            break;
          }
        }
      } catch (error) {
        console.error("Error checking for mapped devices:", error);
      }
    },
    [nearbyDevices],
  );

  const checkForDisconnectedDevices = useCallback(
    async (currentDevices: Device[]) => {
      try {
        const currentDeviceIds = new Set(
          currentDevices.map((device) => device.id),
        );

        if (
          currentPairedDevice &&
          !currentDeviceIds.has(currentPairedDevice.id)
        ) {
          await stopSound();
          if (songLoopIntervalRef.current) {
            clearInterval(songLoopIntervalRef.current);
            songLoopIntervalRef.current = null;
          }

          setCurrentPairedDevice(null);
          previousDeviceRef.current = null;
        }

        previousNearbyDevicesRef.current = currentDevices;
      } catch (error) {
        console.error("Error checking for disconnected devices:", error);
      }
    },
    [currentPairedDevice],
  );

  useEffect(() => {
    const handleDeviceChanges = async () => {
      await checkForDisconnectedDevices(nearbyDevices);
      await checkForMappedDevices(nearbyDevices);
    };

    handleDeviceChanges();
  }, [nearbyDevices, checkForMappedDevices, checkForDisconnectedDevices]);

  const startContinuousScanning = useCallback(() => {
    if (isScanning) return;

    setIsScanning(true);

    const performScan = async () => {
      try {
        const devices = await scanForNearbyDevices();
        await checkForMappedDevices(devices);
      } catch (error) {
        console.error("Error in continuous scanning:", error);
      }
    };

    performScan();

    scanIntervalRef.current = setInterval(performScan, 25000);
  }, [isScanning, scanForNearbyDevices, checkForMappedDevices]);

  const stopContinuousScanning = useCallback(() => {
    setIsScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (songLoopIntervalRef.current) {
      clearInterval(songLoopIntervalRef.current);
      songLoopIntervalRef.current = null;
    }
    bleManager.stopDeviceScan();
  }, []);

  const startScanningRef = useRef(startContinuousScanning);
  const stopScanningRef = useRef(stopContinuousScanning);

  useEffect(() => {
    startScanningRef.current = startContinuousScanning;
    stopScanningRef.current = stopContinuousScanning;
  }, [startContinuousScanning, stopContinuousScanning]);

  useEffect(() => {
    startScanningRef.current();

    return () => {
      stopScanningRef.current();
    };
  }, []);

  const saveMapping = useCallback(
    async (
      address: string,
      deviceName: string,
      songUri: string,
      songName: string,
    ) => {
      const result = await saveMappingBTUtil(
        address,
        deviceName,
        songUri,
        songName,
      );
      if (result) {
        refreshMappings();
      }
      return result;
    },
    [refreshMappings],
  );

  const deleteMapping = useCallback(
    async (address: string) => {
      try {
        if (currentPairedDevice?.id === address) {
          await stopSound();

          if (songLoopIntervalRef.current) {
            clearInterval(songLoopIntervalRef.current);
            songLoopIntervalRef.current = null;
          }
        }

        const result = await deleteMappingBTUtil(address);
        if (result) {
          refreshMappings();
        }
        return result;
      } catch (error) {
        console.error("Error deleting Bluetooth mapping:", error);
        return false;
      }
    },
    [currentPairedDevice, refreshMappings],
  );

  const testMapping = useCallback(async (address: string) => {
    try {
      const mapping = await getMappingByID(address);
      if (mapping) {
        await playSound(
          mapping.songUri,
          address,
          AUDIO_SOURCE_TYPES.BLUETOOTH,
          { forceReplay: true },
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error testing Bluetooth mapping:", error);
      return false;
    }
  }, []);

  const contextValue: BluetoothSongMappingContextType = {
    mappings,
    saveMapping,
    deleteMapping,
    testMapping,
    loadMappings,
    refreshMappings,
    nearbyDevices,
    scanForNearbyDevices,
    startContinuousScanning,
    stopContinuousScanning,
    isScanning,
    currentPairedDevice,
  };

  return (
    <BluetoothSongMappingContext.Provider value={contextValue}>
      {children}
    </BluetoothSongMappingContext.Provider>
  );
};

export const useBluetoothSongMapping = (): BluetoothSongMappingContextType => {
  const context = useContext(BluetoothSongMappingContext);
  if (context === undefined) {
    throw new Error(
      "useBluetoothSongMapping must be used within a BluetoothSongMappingProvider",
    );
  }
  return context;
};
