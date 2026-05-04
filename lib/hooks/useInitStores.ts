import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useBtStore } from '../stores/bt-store';
import { useWifiStore } from '../stores/wifi-store';
import { registerBackgroundWifiTask } from '../tasks/background-wifi';
import {
  AUDIO_SOURCE_TYPES,
  getCurrentlyPlaying,
  hasBluetoothPriority,
  stopSound,
} from '../utils/controls';
import { logger } from '../utils/logger';
import { requestNotificationPermission } from '../utils/notifications';

export const useInitStores = () => {
  const loadWifiMappings = useWifiStore((s) => s.loadMappings);
  const playSongForCurrentWifi = useWifiStore((s) => s.playSongForCurrentWifi);
  const loadBtMappings = useBtStore((s) => s.loadMappings);
  const startScanning = useBtStore((s) => s.startContinuousScanning);
  const stopScanning = useBtStore((s) => s.stopContinuousScanning);
  const checkForMappedDevices = useBtStore((s) => s.checkForMappedDevices);
  const checkForDisconnectedDevices = useBtStore((s) => s.checkForDisconnectedDevices);
  const nearbyDevices = useBtStore((s) => s.nearbyDevices);

  // Load initial data + request notification permission + register background task
  useEffect(() => {
    loadWifiMappings();
    loadBtMappings();
    requestNotificationPermission();
    registerBackgroundWifiTask();
  }, [loadWifiMappings, loadBtMappings]);

  // WiFi: netinfo event-driven + 7s polling fallback
  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    const setup = async () => {
      // Play on first load
      const timeout = setTimeout(() => playSongForCurrentWifi(true), 1000);

      // Event-driven: react immediately to network changes.
      // We split the two cases so disconnection uses a direct stopSound() call rather than
      // going through getCurrentWifiSSID(), which can return stale data right at the moment
      // of disconnect and miss the stop entirely.
      const unsubscribe = NetInfo.addEventListener((state) => {
        if (state.type === 'wifi' && state.isConnected) {
          playSongForCurrentWifi().catch((e) =>
            logger.error('InitStores', 'NetInfo connect handler error', e),
          );
        } else {
          // Covers: non-wifi, wifi-but-disconnected, and no-connection states
          const { isPlaying, type } = getCurrentlyPlaying();
          if (isPlaying && type === AUDIO_SOURCE_TYPES.WIFI && !hasBluetoothPriority()) {
            stopSound().catch((e) =>
              logger.error('InitStores', 'NetInfo disconnect handler error', e),
            );
          }
        }
      });

      // When the app returns to the foreground, re-verify WiFi state in case the OS
      // suspended the JS thread while we were disconnected.
      const appStateSub = AppState.addEventListener('change', (appState) => {
        if (appState === 'active') {
          playSongForCurrentWifi().catch((e) =>
            logger.error('InitStores', 'AppState active handler error', e),
          );
        }
      });

      // Polling fallback for SSID changes within the same network
      const interval = setInterval(() => {
        playSongForCurrentWifi().catch((e) => logger.error('InitStores', 'WiFi poll error', e));
      }, 7000);

      return () => {
        clearTimeout(timeout);
        unsubscribe();
        appStateSub.remove();
        clearInterval(interval);
      };
    };

    setup().then((fn) => {
      if (mounted) {
        cleanup = fn;
      } else {
        fn();
      }
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [playSongForCurrentWifi]);

  // BT: start/stop scanning
  useEffect(() => {
    startScanning();
    return () => stopScanning();
  }, [startScanning, stopScanning]);

  // BT: react to device list changes
  useEffect(() => {
    const handle = async () => {
      await checkForDisconnectedDevices(nearbyDevices);
      await checkForMappedDevices(nearbyDevices);
    };
    handle();
  }, [nearbyDevices, checkForMappedDevices, checkForDisconnectedDevices]);
};
