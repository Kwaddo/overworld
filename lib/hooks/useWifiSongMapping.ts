import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import WifiManager from "react-native-wifi-reborn";
import { WifiSongMap, WifiSongMapping } from "../types/wifi";
import { SecureStoreAdapter } from "./useSecureStore";

export function useWifiSongMapping() {
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
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const currentlyPlayingRef = useRef<{
    bssid: string | null;
    isPlaying: boolean;
    lastPlayedAt: number;
  }>({
    bssid: null,
    isPlaying: false,
    lastPlayedAt: 0,
  });

  const STORAGE_KEY = "wifi_song_mappings";

  const loadMappings = useCallback(async () => {
    try {
      const data = await SecureStoreAdapter.getItem(STORAGE_KEY);
      const mappingsObj: WifiSongMap = data ? JSON.parse(data) : {};

      const mappingsArray = Object.entries(mappingsObj).map(
        ([bssid, { songName, songUri, wifiName }]) => ({
          bssid,
          wifiName,
          songName,
          songUri,
        })
      );

      setMappings(mappingsArray);
      return mappingsArray;
    } catch (error) {
      console.error("Error loading WiFi song mappings:", error);
      return [];
    }
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
      try {
        const data = await SecureStoreAdapter.getItem(STORAGE_KEY);
        const mappings: WifiSongMap = data ? JSON.parse(data) : {};

        mappings[bssid] = {
          songUri,
          songName,
          wifiName: ssid,
        };

        await SecureStoreAdapter.setItem(STORAGE_KEY, JSON.stringify(mappings));
        await loadMappings();
        return true;
      } catch (error) {
        console.error("Error saving mapping:", error);
        return false;
      }
    },
    [loadMappings]
  );

  const deleteMapping = useCallback(
    async (bssid: string) => {
      try {
        const data = await SecureStoreAdapter.getItem(STORAGE_KEY);
        const mappings: WifiSongMap = data ? JSON.parse(data) : {};

        if (mappings[bssid]) {
          delete mappings[bssid];
          await SecureStoreAdapter.setItem(
            STORAGE_KEY,
            JSON.stringify(mappings)
          );
          await loadMappings();
        }
        return true;
      } catch (error) {
        console.error("Error deleting mapping:", error);
        return false;
      }
    },
    [loadMappings]
  );

  const stopSound = useCallback(async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      currentlyPlayingRef.current.isPlaying = false;
    }
  }, [sound]);

  const playSound = useCallback(
    async (uri: string, bssid: string) => {
      try {
        const now = Date.now();

        if (
          currentlyPlayingRef.current.bssid === bssid &&
          currentlyPlayingRef.current.isPlaying &&
          now - currentlyPlayingRef.current.lastPlayedAt < 5 * 60 * 1000
        ) {
          return;
        }

        await stopSound();

        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true, isLooping: false }
        );

        currentlyPlayingRef.current = {
          bssid,
          isPlaying: true,
          lastPlayedAt: now,
        };

        setSound(newSound);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            currentlyPlayingRef.current.isPlaying = false;
          }
        });
      } catch (error) {
        console.error("Error playing song:", error);
      }
    },
    [stopSound]
  );

  const playSongForCurrentWifiImmediate = async (wifiInfo: {
    ssid: string;
    bssid: string | null;
  }) => {
    const { bssid, ssid } = wifiInfo;

    if (!bssid && !ssid) {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        currentlyPlayingRef.current.isPlaying = false;
      }
      return;
    }

    if (!bssid) return;

    if (
      currentlyPlayingRef.current.bssid === bssid &&
      currentlyPlayingRef.current.isPlaying
    ) {
      return;
    }

    try {
      const data = await SecureStoreAdapter.getItem(STORAGE_KEY);
      const mappingsObj: WifiSongMap = data ? JSON.parse(data) : {};

      if (mappingsObj[bssid]) {
        const { songUri } = mappingsObj[bssid];

        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
          setSound(null);
        }

        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: songUri },
          { shouldPlay: true, isLooping: false }
        );

        currentlyPlayingRef.current = {
          bssid,
          isPlaying: true,
          lastPlayedAt: Date.now(),
        };

        setSound(newSound);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            currentlyPlayingRef.current.isPlaying = false;
          }
        });
      } else {
        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
          setSound(null);
          currentlyPlayingRef.current.isPlaying = false;
        }
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

    if (
      currentlyPlayingRef.current.bssid === bssid &&
      currentlyPlayingRef.current.isPlaying
    ) {
      return;
    }

    const allMappings = await loadMappings();
    const mapping = allMappings.find((m) => m.bssid === bssid);

    if (mapping) {
      await playSound(mapping.songUri, mapping.bssid);
    } else {
      await stopSound();
    }
  }, [getCurrentWifi, loadMappings, playSound, stopSound]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return {
    mappings,
    currentWifi,
    loadMappings,
    getCurrentWifi,
    saveMapping,
    deleteMapping,
    playSound: (uri: string) => playSound(uri, "manual-play"),
    stopSound,
    playSongForCurrentWifi,
  };
}
