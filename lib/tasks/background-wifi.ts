import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import WifiManager from 'react-native-wifi-reborn';
import {
  AUDIO_SOURCE_TYPES,
  getCurrentlyPlaying,
  hasBluetoothPriority,
  playSound,
  stopSound,
} from '../utils/controls';
import { logger } from '../utils/logger';
import { loadMappingsWifiUtil } from '../utils/wifimapping';

export const BACKGROUND_WIFI_TASK = 'overworld-background-wifi';

// Must be defined at module level — this runs whether the app is foregrounded or headless.
TaskManager.defineTask(BACKGROUND_WIFI_TASK, async () => {
  try {
    let ssid: string | null = null;
    try {
      ssid = await WifiManager.getCurrentWifiSSID();
    } catch {
      // "Not connected or connecting." — treat as no WiFi
      ssid = null;
    }

    if (!ssid || ssid === '' || ssid.toLowerCase() === '<unknown ssid>') {
      // WiFi is gone — stop any WiFi-triggered song that's still playing
      const { isPlaying, type } = getCurrentlyPlaying();
      if (isPlaying && type === AUDIO_SOURCE_TYPES.WIFI && !hasBluetoothPriority()) {
        await stopSound();
      }
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    // Don't interrupt something already playing
    if (getCurrentlyPlaying().isPlaying) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const mappings = await loadMappingsWifiUtil();
    const mapping = mappings.find((m) => m.wifiName === ssid);

    if (!mapping) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    await playSound(mapping.songUri, mapping.bssid, AUDIO_SOURCE_TYPES.WIFI, {
      notificationTitle: mapping.songName,
      networkName: ssid,
    });

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    logger.error('BackgroundWifi', 'Background task failed', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export const registerBackgroundWifiTask = async (): Promise<void> => {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
      logger.warn('BackgroundWifi', 'Background tasks restricted on this device');
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_WIFI_TASK);
    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_WIFI_TASK, {
        minimumInterval: 15, // minutes — Android/iOS enforce 15 min minimum
      });
      logger.info('BackgroundWifi', 'Background WiFi task registered');
    }
  } catch (error) {
    logger.warn('BackgroundWifi', 'Could not register background task', error);
  }
};
