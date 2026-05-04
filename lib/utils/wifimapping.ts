import { SecureStoreAdapter } from '../hooks/useSecureStore';
import type { WifiSongMap, WifiSongMapping } from '../types/wifi';
import { logger } from './logger';

const WIFI_STORAGE_KEY = 'wifi_song_mappings';

/**
 * Loads all WiFi-song mappings from secure storage
 */
export const loadMappingsWifiUtil = async (): Promise<WifiSongMapping[]> => {
  try {
    const data = await SecureStoreAdapter.getItem(WIFI_STORAGE_KEY);
    const mappingsObj: WifiSongMap = data ? JSON.parse(data) : {};

    const mappingsArray = Object.entries(mappingsObj).map(
      ([bssid, { songName, songUri, wifiName, volume }]) => ({
        bssid,
        wifiName,
        songName,
        songUri,
        volume: volume ?? 1,
      }),
    );

    return mappingsArray;
  } catch (error) {
    logger.error('WiFiMapping', 'Error loading WiFi song mappings', error);
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
  songName: string,
  volume = 1,
): Promise<boolean> => {
  try {
    const data = await SecureStoreAdapter.getItem(WIFI_STORAGE_KEY);
    const mappings: WifiSongMap = data ? JSON.parse(data) : {};

    mappings[id] = { songUri, songName, wifiName, volume };

    await SecureStoreAdapter.setItem(WIFI_STORAGE_KEY, JSON.stringify(mappings));
    return true;
  } catch (error) {
    logger.error('WiFiMapping', 'Error saving mapping', error);
    return false;
  }
};

/**
 * Deletes a WiFi-song mapping from secure storage
 */
export const deleteMappingWifiUtil = async (bssid: string): Promise<boolean> => {
  try {
    const data = await SecureStoreAdapter.getItem(WIFI_STORAGE_KEY);
    const mappings: WifiSongMap = data ? JSON.parse(data) : {};

    if (mappings[bssid]) {
      delete mappings[bssid];
      await SecureStoreAdapter.setItem(WIFI_STORAGE_KEY, JSON.stringify(mappings));
    }
    return true;
  } catch (error) {
    logger.error('WiFiMapping', 'Error deleting mapping', error);
    return false;
  }
};

/**
 * Get a specific mapping by BSSID
 */
export const updateVolumeWifiUtil = async (bssid: string, volume: number): Promise<boolean> => {
  try {
    const data = await SecureStoreAdapter.getItem(WIFI_STORAGE_KEY);
    const mappings: WifiSongMap = data ? JSON.parse(data) : {};
    if (mappings[bssid]) {
      mappings[bssid] = { ...mappings[bssid], volume };
      await SecureStoreAdapter.setItem(WIFI_STORAGE_KEY, JSON.stringify(mappings));
    }
    return true;
  } catch (error) {
    logger.error('WiFiMapping', 'Error updating volume', error);
    return false;
  }
};

export const getMappingByBSSID = async (
  bssid: string,
): Promise<{ songUri: string; songName: string; wifiName: string; volume: number } | null> => {
  try {
    const data = await SecureStoreAdapter.getItem(WIFI_STORAGE_KEY);
    const mappings: WifiSongMap = data ? JSON.parse(data) : {};
    const m = mappings[bssid];
    return m ? { ...m, volume: m.volume ?? 1 } : null;
  } catch (error) {
    logger.error('WiFiMapping', 'Error getting mapping', error);
    return null;
  }
};
