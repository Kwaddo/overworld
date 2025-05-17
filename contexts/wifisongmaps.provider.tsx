import {
  createContext,
  FC,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { PermissionsAndroid, Platform } from "react-native";
import WifiManager from "react-native-wifi-reborn";
import { WifiSongMapping, WiFiSongMappingContextType } from "../lib/types/wifi";
import { playSound, stopSound } from "../lib/utils/controls";
import {
  deleteMappingUtil,
  getMappingByBSSID,
  loadMappingsUtil,
  saveMappingUtil,
} from "../lib/utils/mappings";

const WiFiSongMappingContext = createContext<
  WiFiSongMappingContextType | undefined
>(undefined);

export const WiFiSongMappingProvider: FC<{
  children: React.ReactNode;
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
      const mappingsArray = await loadMappingsUtil();
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

  const getCurrentWifi = useCallback(async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
    }

    try {
      const ssid = await WifiManager.getCurrentWifiSSID();
      let bssid = null;

      if (!ssid || ssid === "") {
        await stopSound();
        previousWifiRef.current = { ssid: null, bssid: null };
        setCurrentWifi({ ssid: "", bssid: null });
        return { ssid: "", bssid: null };
      }

      try {
        const networks = await WifiManager.loadWifiList();
        const currentNetwork = networks.find(
          (network) => network.SSID === ssid
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
  }, []);

  const saveMapping = useCallback(
    async (bssid: string, ssid: string, songUri: string, songName: string) => {
      const result = await saveMappingUtil(bssid, ssid, songUri, songName);
      if (result) {
        refreshMappings();
      }
      return result;
    },
    [refreshMappings]
  );

  const deleteMapping = useCallback(
    async (bssid: string) => {
      if (currentWifi.bssid === bssid) {
        await stopSound();
      }

      const result = await deleteMappingUtil(bssid);

      if (result) {
        refreshMappings();
      }

      return result;
    },
    [currentWifi, refreshMappings]
  );

  const playSongForCurrentWifiImmediate = async (wifiInfo: {
    ssid: string;
    bssid: string | null;
  }) => {
    const { bssid, ssid } = wifiInfo;

    if (!bssid || !ssid) {
      await stopSound();
      return;
    }

    try {
      const mapping = await getMappingByBSSID(bssid);

      if (mapping) {
        await playSound(mapping.songUri, bssid);
      } else {
        await stopSound();
      }
    } catch (error) {
      console.error("Error in immediate playback:", error);
      await stopSound();
    }
  };

  const testMapping = useCallback(async (bssid: string) => {
    try {
      const mapping = await getMappingByBSSID(bssid);
      if (mapping) {
        await playSound(mapping.songUri, bssid, { forceReplay: true });
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
        const { bssid, ssid } = await getCurrentWifi();

        if (!bssid || !ssid) {
          await stopSound();
          return;
        }

        const allMappings = await loadMappings();
        const mapping = allMappings.find((m) => m.bssid === bssid);

        if (mapping) {
          await playSound(mapping.songUri, mapping.bssid, {
            forceReplay: forcePlay,
          });
        } else {
          await stopSound();
        }
      } catch (error) {
        console.error("Error playing song for current WiFi:", error);
        await stopSound();
      }
    },
    [getCurrentWifi, loadMappings]
  );

  useEffect(() => {
    let initialCheckTimeout: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    const setupWifiMonitoring = async () => {
      if (Platform.OS === "android") {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
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

  const contextValue: WiFiSongMappingContextType = {
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

export const useWifiSongMapping = (): WiFiSongMappingContextType => {
  const context = useContext(WiFiSongMappingContext);
  if (context === undefined) {
    throw new Error(
      "useWifiSongMapping must be used within a WiFiSongMappingProvider"
    );
  }
  return context;
};
