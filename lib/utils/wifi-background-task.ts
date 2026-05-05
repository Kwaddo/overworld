import NetInfo from '@react-native-community/netinfo';
import { BackgroundTaskResult } from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import WifiManager from 'react-native-wifi-reborn';
import { AUDIO_SOURCE_TYPES, hasBluetoothPriority, playSound } from './controls';
import { logger } from './logger';
import { getMappingByBSSID, loadMappingsWifiUtil } from './wifimapping';

export const WIFI_BACKGROUND_TASK = 'wifi-song-check';

TaskManager.defineTask(WIFI_BACKGROUND_TASK, async () => {
  try {
    if (hasBluetoothPriority()) {
      return BackgroundTaskResult.Success;
    }

    const netState = await NetInfo.fetch();
    if (netState.type !== 'wifi' || !netState.isConnected) {
      return BackgroundTaskResult.Success;
    }

    const rawSsid = await WifiManager.getCurrentWifiSSID();
    const ssid = rawSsid ? rawSsid.replace(/^"(.*)"$/, '$1') : rawSsid;
    if (!ssid || ssid === '' || ssid.toLowerCase() === '<unknown ssid>') {
      return BackgroundTaskResult.Success;
    }

    let bssid: string | null = null;
    try {
      const networks = await WifiManager.loadWifiList();
      bssid = networks.find((n) => n.SSID === ssid)?.BSSID ?? null;
    } catch {
      // loadWifiList can fail in background; fall back to name match
    }

    let mapping = bssid ? await getMappingByBSSID(bssid) : null;
    if (!mapping) {
      const all = await loadMappingsWifiUtil();
      mapping = all.find((m) => m.wifiName === ssid) ?? null;
    }

    if (mapping) {
      await playSound(mapping.songUri, bssid ?? ssid, AUDIO_SOURCE_TYPES.WIFI, {
        volume: mapping.volume,
        notificationTitle: mapping.songName,
        networkName: ssid,
      });
    }

    return BackgroundTaskResult.Success;
  } catch (error) {
    logger.error('WiFiBackgroundTask', 'Error in background WiFi check', error);
    return BackgroundTaskResult.Failed;
  }
});
