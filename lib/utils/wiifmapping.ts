import { SecureStoreAdapter } from "../hooks/useSecureStore";
import { WifiSongMap, WifiSongMapping } from "../types/wifi";

const WIFI_STORAGE_KEY = "wifi_song_mappings";

/**
 * Loads all WiFi-song mappings from secure storage
 */
export const loadMappingsWifiUtil = async (): Promise<WifiSongMapping[]> => {
  try {
    const data = await SecureStoreAdapter.getItem(WIFI_STORAGE_KEY);
    const mappingsObj: WifiSongMap = data ? JSON.parse(data) : {};

    const mappingsArray = Object.entries(mappingsObj).map(
      ([bssid, { songName, songUri, wifiName }]) => ({
        bssid,
        wifiName,
        songName,
        songUri,
      })
    );

    return mappingsArray;
  } catch (error) {
    console.error("Error loading WiFi song mappings:", error);
    return [];
  }
};

/**
 * Saves a WiFi-song mapping to secure storage
 */
export const saveMappingWifiUtil = async (
  id: string,
  wifiName: string,
  songUri: string,
  songName: string
): Promise<boolean> => {
  try {
    const data = await SecureStoreAdapter.getItem(WIFI_STORAGE_KEY);
    const mappings: WifiSongMap = data ? JSON.parse(data) : {};

    mappings[id] = {
      songUri,
      songName,
      wifiName: wifiName,
    };

    await SecureStoreAdapter.setItem(
      WIFI_STORAGE_KEY,
      JSON.stringify(mappings)
    );
    return true;
  } catch (error) {
    console.error("Error saving mapping:", error);
    return false;
  }
};

/**
 * Deletes a WiFi-song mapping from secure storage
 */
export const deleteMappingWifiUtil = async (
  bssid: string
): Promise<boolean> => {
  try {
    const data = await SecureStoreAdapter.getItem(WIFI_STORAGE_KEY);
    const mappings: WifiSongMap = data ? JSON.parse(data) : {};

    if (mappings[bssid]) {
      delete mappings[bssid];
      await SecureStoreAdapter.setItem(
        WIFI_STORAGE_KEY,
        JSON.stringify(mappings)
      );
    }
    return true;
  } catch (error) {
    console.error("Error deleting mapping:", error);
    return false;
  }
};

/**
 * Get a specific mapping by BSSID
 */
export const getMappingByBSSID = async (
  bssid: string
): Promise<{ songUri: string; songName: string; wifiName: string } | null> => {
  try {
    const data = await SecureStoreAdapter.getItem(WIFI_STORAGE_KEY);
    const mappings: WifiSongMap = data ? JSON.parse(data) : {};
    return mappings[bssid] || null;
  } catch (error) {
    console.error("Error getting mapping:", error);
    return null;
  }
};
