import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { useBtStore } from '../stores/bt-store';
import { useWifiStore } from '../stores/wifi-store';
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

  // Load initial data + request notification permission
  useEffect(() => {
    loadWifiMappings();
    loadBtMappings();
    requestNotificationPermission();
  }, [loadWifiMappings, loadBtMappings]);

  // WiFi: netinfo event-driven + 7s polling fallback
  useEffect(() => {
    const setup = async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      }

      // Play on first load
      const timeout = setTimeout(() => playSongForCurrentWifi(true), 1000);

      // Event-driven: trigger immediately on network change
      const unsubscribe = NetInfo.addEventListener((state) => {
        if (state.type === 'wifi') {
          playSongForCurrentWifi().catch((e) =>
            logger.error('InitStores', 'NetInfo wifi handler error', e),
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
        clearInterval(interval);
      };
    };

    let cleanup: (() => void) | undefined;
    setup().then((fn) => {
      cleanup = fn;
    });

    return () => cleanup?.();
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
