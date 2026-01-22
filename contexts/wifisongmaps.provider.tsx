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
import { Permission, PermissionsAndroid, Platform } from "react-native";
import WifiManager from "react-native-wifi-reborn";
import {
  WiFiSongMappingContextType as SongMappingContextType,
  WifiSongMapping,
} from "../lib/types/wifi";
import {
  AUDIO_SOURCE_TYPES,
  hasBluetoothPriority,
  playSound,
  stopSound,
} from "../lib/utils/controls";
import {
  deleteMappingWifiUtil,
  getMappingByBSSID,
  loadMappingsWifiUtil,
  saveMappingWifiUtil,
} from "../lib/utils/wiifmapping";

const WiFiSongMappingContext = createContext<
  SongMappingContextType | undefined
>(undefined);

export const WiFiSongMappingProvider: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const previousWifiRef = useRef<{
    ssid: string | null;
    bssid: string | null;
  }>({
    ssid: null,
    bssid: null,
  });

  const [mappings, setMappings] = useState<WifiSongMapping[]>([]);
  const [currentWifi, setCurrentWifi] = useState<{
    ssid: string;
    bssid: string | null;
  }>({
    ssid: "",
    bssid: null,
  });

  const [refreshFlag, setRefreshFlag] = useState(0);

  const refreshMappings = useCallback(() => {
    setRefreshFlag((prev) => prev + 1);
  }, []);

  const loadMappings = useCallback(async () => {
    try {
      const mappingsArray = await loadMappingsWifiUtil();
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

  const ensureWifiPermissions = useCallback(async () => {
    if (Platform.OS !== "android") return true;

    const permissions: (Permission | undefined)[] = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES
        : undefined,
    ];

    const toRequest = permissions.filter(Boolean) as Permission[];
    if (!toRequest.length) return true;

    const result = await PermissionsAndroid.requestMultiple(toRequest);
    const granted = toRequest.every(
      (perm) => result[perm] === PermissionsAndroid.RESULTS.GRANTED,
    );

    return granted;
  }, []);

  const getCurrentWifi = useCallback(async () => {
    if (Platform.OS === "android") {
      const hasPerms = await ensureWifiPermissions();
      if (!hasPerms) {
        await stopSound();
        previousWifiRef.current = { ssid: null, bssid: null };
        setCurrentWifi({ ssid: "", bssid: null });
        return { ssid: "", bssid: null };
      }
    }

    try {
      const ssid = await WifiManager.getCurrentWifiSSID();
      let bssid = null;

      if (!ssid || ssid === "" || ssid.toLowerCase() === "<unknown ssid>") {
        await stopSound();
        previousWifiRef.current = { ssid: null, bssid: null };
        setCurrentWifi({ ssid: "", bssid: null });
        return { ssid: "", bssid: null };
      }

      try {
        const networks = await WifiManager.loadWifiList();
        const currentNetwork = networks.find(
          (network) => network.SSID === ssid,
        );
        bssid = currentNetwork?.BSSID || null;
      } catch (error) {
        console.error("Error loading WiFi list:", error);
      }

      const wifiChanged =
        previousWifiRef.current.ssid !== ssid ||
        previousWifiRef.current.bssid !== bssid;

      setCurrentWifi({ ssid, bssid });

      if (wifiChanged) {
        previousWifiRef.current = { ssid, bssid };
        await playSongForCurrentWifiImmediate({ ssid, bssid });
      }

      return { ssid, bssid };
    } catch (error) {
      console.error("Error getting current WiFi:", error);
      await stopSound();
      previousWifiRef.current = { ssid: null, bssid: null };
      setCurrentWifi({ ssid: "", bssid: null });
      return { ssid: "", bssid: null };
    }
  }, [ensureWifiPermissions]);

  const saveMapping = useCallback(
    async (bssid: string, ssid: string, songUri: string, songName: string) => {
      const result = await saveMappingWifiUtil(bssid, ssid, songUri, songName);
      if (result) {
        refreshMappings();
      }
      return result;
    },
    [refreshMappings],
  );

  const deleteMapping = useCallback(
    async (bssid: string) => {
      if (currentWifi.bssid === bssid) {
        await stopSound();
      }

      const result = await deleteMappingWifiUtil(bssid);

      if (result) {
        refreshMappings();
      }

      return result;
    },
    [currentWifi, refreshMappings],
  );

  const playSongForCurrentWifiImmediate = async (wifiInfo: {
    ssid: string;
    bssid: string | null;
  }) => {
    const { bssid, ssid } = wifiInfo;

    if (!bssid || !ssid) {
      if (!hasBluetoothPriority()) {
        await stopSound();
      }
      return;
    }

    try {
      if (hasBluetoothPriority()) {
        return;
      }

      const mapping = await getMappingByBSSID(bssid);

      if (mapping) {
        await playSound(mapping.songUri, bssid, AUDIO_SOURCE_TYPES.WIFI);
      } else {
        if (!hasBluetoothPriority()) {
          await stopSound();
        }
      }
    } catch (error) {
      console.error("Error in immediate playback:", error);
      if (!hasBluetoothPriority()) {
        await stopSound();
      }
    }
  };

  const testMapping = useCallback(async (bssid: string) => {
    try {
      const mapping = await getMappingByBSSID(bssid);
      if (mapping) {
        await playSound(mapping.songUri, bssid, AUDIO_SOURCE_TYPES.WIFI, {
          forceReplay: true,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error testing mapping:", error);
      return false;
    }
  }, []);

  const playSongForCurrentWifi = useCallback(
    async (forcePlay = false) => {
      try {
        if (!forcePlay && hasBluetoothPriority()) {
          return;
        }

        const { bssid, ssid } = await getCurrentWifi();

        if (!bssid || !ssid) {
          if (!hasBluetoothPriority()) {
            await stopSound();
          }
          return;
        }

        const allMappings = await loadMappings();
        const mapping = allMappings.find((m) => m.bssid === bssid);

        if (mapping) {
          await playSound(
            mapping.songUri,
            mapping.bssid,
            AUDIO_SOURCE_TYPES.WIFI,
            {
              forceReplay: forcePlay,
            },
          );
        } else {
          if (!hasBluetoothPriority()) {
            await stopSound();
          }
        }
      } catch (error) {
        console.error("Error playing song for current WiFi:", error);
        if (!hasBluetoothPriority()) {
          await stopSound();
        }
      }
    },
    [getCurrentWifi, loadMappings],
  );

  useEffect(() => {
    let initialCheckTimeout: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    const setupWifiMonitoring = async () => {
      if (Platform.OS === "android") {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
      }

      initialCheckTimeout = setTimeout(async () => {
        await playSongForCurrentWifi(true);
      }, 1000);

      intervalId = setInterval(async () => {
        try {
          await playSongForCurrentWifi();
        } catch (error) {
          console.error("Error in WiFi check interval:", error);
        }
      }, 7000);
    };

    setupWifiMonitoring();

    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(intervalId);
    };
  }, [playSongForCurrentWifi]);

  const contextValue: SongMappingContextType = {
    mappings,
    currentWifi,
    loadMappings,
    getCurrentWifi,
    saveMapping,
    deleteMapping,
    playSongForCurrentWifi,
    testMapping,
    refreshMappings,
  };

  return (
    <WiFiSongMappingContext.Provider value={contextValue}>
      {children}
    </WiFiSongMappingContext.Provider>
  );
};

export const useWifiSongMapping = (): SongMappingContextType => {
  const context = useContext(WiFiSongMappingContext);
  if (context === undefined) {
    throw new Error(
      "useWifiSongMapping must be used within a WiFiSongMappingProvider",
    );
  }
  return context;
};
