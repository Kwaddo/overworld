import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SecureStoreAdapter } from '../hooks/useSecureStore';
import { logger } from './logger';

const WIFI_KEY = 'wifi_song_mappings';
const BT_KEY = 'bluetooth_song_mappings';

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  wifi: Record<string, unknown>;
  bluetooth: Record<string, unknown>;
}

export const exportMappings = async (): Promise<boolean> => {
  try {
    const [wifiRaw, btRaw] = await Promise.all([
      SecureStoreAdapter.getItem(WIFI_KEY),
      SecureStoreAdapter.getItem(BT_KEY),
    ]);

    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      wifi: wifiRaw ? JSON.parse(wifiRaw) : {},
      bluetooth: btRaw ? JSON.parse(btRaw) : {},
    };

    const path = `${FileSystem.cacheDirectory}overworld-backup.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      logger.warn('Backup', 'Sharing not available on this platform');
      return false;
    }

    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Export Overworld Mappings',
    });
    return true;
  } catch (error) {
    logger.error('Backup', 'Export failed', error);
    return false;
  }
};

export const importMappings = async (): Promise<{ wifi: number; bluetooth: number } | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) return null;

    const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const payload = JSON.parse(raw) as BackupPayload;

    if (
      payload.version !== 1 ||
      typeof payload.wifi !== 'object' ||
      payload.wifi === null ||
      typeof payload.bluetooth !== 'object' ||
      payload.bluetooth === null
    ) {
      throw new Error('Invalid backup file format');
    }

    const isValidWifiEntry = (v: unknown): boolean => {
      if (typeof v !== 'object' || v === null) return false;
      const e = v as Record<string, unknown>;
      return (
        typeof e.songUri === 'string' &&
        typeof e.songName === 'string' &&
        typeof e.wifiName === 'string'
      );
    };
    const isValidBtEntry = (v: unknown): boolean => {
      if (typeof v !== 'object' || v === null) return false;
      const e = v as Record<string, unknown>;
      return (
        typeof e.songUri === 'string' &&
        typeof e.songName === 'string' &&
        typeof e.name === 'string'
      );
    };

    const wifiInvalid = Object.values(payload.wifi).some((v) => !isValidWifiEntry(v));
    const btInvalid = Object.values(payload.bluetooth).some((v) => !isValidBtEntry(v));
    if (wifiInvalid || btInvalid) {
      throw new Error('Backup contains malformed entries');
    }

    await Promise.all([
      SecureStoreAdapter.setItem(WIFI_KEY, JSON.stringify(payload.wifi)),
      SecureStoreAdapter.setItem(BT_KEY, JSON.stringify(payload.bluetooth)),
    ]);

    return {
      wifi: Object.keys(payload.wifi).length,
      bluetooth: Object.keys(payload.bluetooth).length,
    };
  } catch (error) {
    logger.error('Backup', 'Import failed', error);
    return null;
  }
};
