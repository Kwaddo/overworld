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
import RNBluetoothClassic from "react-native-bluetooth-classic";
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
  const previousDeviceRef = useRef<string | null>(null);

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

  const playSongForPairedDevice = useCallback(async (deviceId: string) => {
    try {
      const mapping = await getMappingByID(deviceId);

      if (mapping) {
        await playSound(
          mapping.songUri,
          deviceId,
          AUDIO_SOURCE_TYPES.BLUETOOTH,
          { forceReplay: true }
        );
      } else {
        await stopSound();
      }
    } catch (error) {
      console.error("Error playing song for paired device:", error);
      await stopSound();
    }
  }, []);

  const getPairedDevices = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
      }

      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        setCurrentPairedDevice(null);
        return null;
      }

      const pairedDevices = await RNBluetoothClassic.getBondedDevices();

      if (pairedDevices.length > 0) {
        const connectedDevices = [];
        for (const device of pairedDevices) {
          try {
            const isConnected = await RNBluetoothClassic.isDeviceConnected(
              device.address
            );
            if (isConnected) {
              connectedDevices.push(device);
            }
          } catch (error) {
            console.log(
              `Could not check connection status for ${device.address}:`,
              error
            );
          }
        }

        if (connectedDevices.length > 0) {
          const latestDevice = connectedDevices[0];
          const deviceChanged =
            previousDeviceRef.current !== latestDevice.address;

          setCurrentPairedDevice({
            id: latestDevice.address,
            name: latestDevice.name || latestDevice.address,
          });

          if (deviceChanged) {
            previousDeviceRef.current = latestDevice.address;
            await playSongForPairedDevice(latestDevice.address);
          }

          return {
            id: latestDevice.address,
            name: latestDevice.name || latestDevice.address,
          };
        } else {
          // No connected devices, stop music if previously playing
          if (previousDeviceRef.current !== null) {
            previousDeviceRef.current = null;
            setCurrentPairedDevice(null);
            await stopSound();
          }
          return null;
        }
      } else {
        if (previousDeviceRef.current !== null) {
          previousDeviceRef.current = null;
          setCurrentPairedDevice(null);
          await stopSound();
        }
        return null;
      }
    } catch (error) {
      console.error("Error getting paired devices:", error);
      setCurrentPairedDevice(null);
      return null;
    }
  }, [playSongForPairedDevice]);

  const saveMapping = useCallback(
    async (
      address: string,
      deviceName: string,
      songUri: string,
      songName: string
    ) => {
      const result = await saveMappingBTUtil(
        address,
        deviceName,
        songUri,
        songName
      );
      if (result) {
        refreshMappings();
      }
      return result;
    },
    [refreshMappings]
  );

  const deleteMapping = useCallback(
    async (address: string) => {
      try {
        if (currentPairedDevice?.id === address) {
          await stopSound();
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
    [currentPairedDevice, refreshMappings]
  );

  const testMapping = useCallback(async (address: string) => {
    try {
      const mapping = await getMappingByID(address);
      if (mapping) {
        await playSound(
          mapping.songUri,
          address,
          AUDIO_SOURCE_TYPES.BLUETOOTH,
          { forceReplay: true }
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error testing Bluetooth mapping:", error);
      return false;
    }
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let initialCheckTimeout: ReturnType<typeof setTimeout>;

    const setupBluetoothMonitoring = async () => {
      initialCheckTimeout = setTimeout(async () => {
        await getPairedDevices();
      }, 1000);

      intervalId = setInterval(async () => {
        try {
          await getPairedDevices();
        } catch (error) {
          console.error("Error in Bluetooth check interval:", error);
        }
      }, 5000);
    };

    setupBluetoothMonitoring();

    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(intervalId);
    };
  }, [getPairedDevices]);

  const contextValue: BluetoothSongMappingContextType = {
    mappings,
    saveMapping,
    deleteMapping,
    testMapping,
    loadMappings,
    refreshMappings,
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
      "useBluetoothSongMapping must be used within a BluetoothSongMappingProvider"
    );
  }
  return context;
};
