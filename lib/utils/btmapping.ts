import { SecureStoreAdapter } from '../hooks/useSecureStore';
import type { BluetoothSongMap, BluetoothSongMapping } from '../types/ble';
import { logger } from './logger';

const BLUETOOTH_STORAGE_KEY = 'bluetooth_song_mappings';

/**
 * Loads all bluetooth-song mappings from secure storage
 */
export const loadMappingsBTUtil = async (): Promise<BluetoothSongMapping[]> => {
  try {
    const data = await SecureStoreAdapter.getItem(BLUETOOTH_STORAGE_KEY);
    const mappingsObj: BluetoothSongMap = data ? JSON.parse(data) : {};

    const mappingsArray = Object.entries(mappingsObj).map(
      ([id, { songName, songUri, name, volume }]) => ({
        id,
        name,
        songName,
        songUri,
        volume: volume ?? 1,
      }),
    );

    return mappingsArray;
  } catch (error) {
    logger.error('BTMapping', 'Error loading BT song mappings', error);
    return [];
  }
};

/**
 * Saves a bluetooth-song mapping to secure storage
 */
export const saveMappingBTUtil = async (
  id: string,
  name: string,
  songUri: string,
  songName: string,
  volume = 1,
): Promise<boolean> => {
  try {
    const data = await SecureStoreAdapter.getItem(BLUETOOTH_STORAGE_KEY);
    const mappings: BluetoothSongMap = data ? JSON.parse(data) : {};

    mappings[id] = { songUri, songName, name, volume };

    await SecureStoreAdapter.setItem(BLUETOOTH_STORAGE_KEY, JSON.stringify(mappings));
    return true;
  } catch (error) {
    logger.error('BTMapping', 'Error saving mapping', error);
    return false;
  }
};

/**
 * Deletes a bluetooth-song mapping from secure storage
 */
export const deleteMappingBTUtil = async (id: string): Promise<boolean> => {
  try {
    const data = await SecureStoreAdapter.getItem(BLUETOOTH_STORAGE_KEY);
    const mappings: BluetoothSongMap = data ? JSON.parse(data) : {};

    if (mappings[id]) {
      delete mappings[id];
      await SecureStoreAdapter.setItem(BLUETOOTH_STORAGE_KEY, JSON.stringify(mappings));
    }
    return true;
  } catch (error) {
    logger.error('BTMapping', 'Error deleting mapping', error);
    return false;
  }
};

export const updateVolumeBTUtil = async (id: string, volume: number): Promise<boolean> => {
  try {
    const data = await SecureStoreAdapter.getItem(BLUETOOTH_STORAGE_KEY);
    const mappings: BluetoothSongMap = data ? JSON.parse(data) : {};
    if (mappings[id]) {
      mappings[id] = { ...mappings[id], volume };
      await SecureStoreAdapter.setItem(BLUETOOTH_STORAGE_KEY, JSON.stringify(mappings));
    }
    return true;
  } catch (error) {
    logger.error('BTMapping', 'Error updating volume', error);
    return false;
  }
};

export const getMappingByID = async (
  id: string,
): Promise<{ songUri: string; songName: string; name: string; volume: number } | null> => {
  try {
    const data = await SecureStoreAdapter.getItem(BLUETOOTH_STORAGE_KEY);
    const mappings: BluetoothSongMap = data ? JSON.parse(data) : {};
    const m = mappings[id];
    return m ? { ...m, volume: m.volume ?? 1 } : null;
  } catch (error) {
    logger.error('BTMapping', 'Error getting mapping', error);
    return null;
  }
};
