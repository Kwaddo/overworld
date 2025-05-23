import { SecureStoreAdapter } from "../hooks/useSecureStore";
import { BluetoothSongMap, BluetoothSongMapping } from "../types/ble";

const BLUETOOTH_STORAGE_KEY = "bluetooth_song_mappings";

/**
 * Loads all bluetooth-song mappings from secure storage
 */
export const loadMappingsBTUtil = async (): Promise<BluetoothSongMapping[]> => {
  try {
    const data = await SecureStoreAdapter.getItem(BLUETOOTH_STORAGE_KEY);
    const mappingsObj: BluetoothSongMap = data ? JSON.parse(data) : {};

    const mappingsArray = Object.entries(mappingsObj).map(
      ([id, { songName, songUri, name }]) => ({
        id: id,
        name,
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
 * Saves a bluetooth-song mapping to secure storage
 */
export const saveMappingBTUtil = async (
  id: string,
  name: string,
  songUri: string,
  songName: string
): Promise<boolean> => {
  try {
    const data = await SecureStoreAdapter.getItem(BLUETOOTH_STORAGE_KEY);
    const mappings: BluetoothSongMap = data ? JSON.parse(data) : {};

    mappings[id] = {
      songUri,
      songName,
      name: name,
    };

    await SecureStoreAdapter.setItem(
      BLUETOOTH_STORAGE_KEY,
      JSON.stringify(mappings)
    );
    return true;
  } catch (error) {
    console.error("Error saving mapping:", error);
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
      await SecureStoreAdapter.setItem(
        BLUETOOTH_STORAGE_KEY,
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
 * Get a specific mapping by ID
 */
export const getMappingByID = async (
  id: string
): Promise<{ songUri: string; songName: string; name: string } | null> => {
  try {
    const data = await SecureStoreAdapter.getItem(BLUETOOTH_STORAGE_KEY);
    const mappings: BluetoothSongMap = data ? JSON.parse(data) : {};
    return mappings[id] || null;
  } catch (error) {
    console.error("Error getting mapping:", error);
    return null;
  }
};
