import { useCallback, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import WifiManager from "react-native-wifi-reborn";
import { WifiSongMapping } from "../types/wifi";
import { isPlaying, playSound, stopSound } from "../utils/controls";
import {
  deleteMappingUtil,
  getMappingByBSSID,
  loadMappingsUtil,
  saveMappingUtil,
} from "../utils/mappings";

export const useWifiSongMapping = () => {
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

  const loadMappings = useCallback(async () => {
    const mappingsArray = await loadMappingsUtil();
    setMappings(mappingsArray);
    return mappingsArray;
  }, []);

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
        if (previousWifiRef.current.ssid) {
          await stopSound();
        }

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
        setCurrentWifi({ ssid, bssid });
        previousWifiRef.current = { ssid, bssid };

        playSongForCurrentWifiImmediate({ ssid, bssid });
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
        await loadMappings();
      }
      return result;
    },
    [loadMappings]
  );

  const deleteMapping = useCallback(
    async (bssid: string) => {
      const result = await deleteMappingUtil(bssid);
      if (result) {
        await loadMappings();
      }
      return result;
    },
    [loadMappings]
  );

  const playSongForCurrentWifiImmediate = async (wifiInfo: {
    ssid: string;
    bssid: string | null;
  }) => {
    const { bssid, ssid } = wifiInfo;

    if (!bssid && !ssid) {
      await stopSound();
      return;
    }

    if (!bssid) return;

    if (isPlaying(bssid)) {
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
    }
  };

  const playSongForCurrentWifi = useCallback(async () => {
    const { bssid, ssid } = await getCurrentWifi();

    if (!bssid && !ssid) {
      await stopSound();
      return;
    }

    if (!bssid) return;

    if (isPlaying(bssid)) {
      return;
    }

    const allMappings = await loadMappings();
    const mapping = allMappings.find((m) => m.bssid === bssid);

    if (mapping) {
      await playSound(mapping.songUri, mapping.bssid);
    } else {
      await stopSound();
    }
  }, [getCurrentWifi, loadMappings]);

  return {
    mappings,
    currentWifi,
    loadMappings,
    getCurrentWifi,
    saveMapping,
    deleteMapping,
    playSongForCurrentWifi,
  };
};
