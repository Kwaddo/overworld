import NetInfo from '@react-native-community/netinfo';
import * as BackgroundTask from 'expo-background-task';
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppState, type Permission, PermissionsAndroid, Platform } from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import type {
  WiFiSongMappingContextType as SongMappingContextType,
  WifiSongMapping,
} from '../lib/types/wifi';
import {
  AUDIO_SOURCE_TYPES,
  hasBluetoothPriority,
  playSound,
  stopSound,
} from '../lib/utils/controls';
import { logger } from '../lib/utils/logger';
import { WIFI_BACKGROUND_TASK } from '../lib/utils/wifi-background-task';
import {
  deleteMappingWifiUtil,
  getMappingByBSSID,
  loadMappingsWifiUtil,
  saveMappingWifiUtil,
} from '../lib/utils/wifimapping';

type WifiInfo = { ssid: string; bssid: string | null };

const WiFiSongMappingContext = createContext<SongMappingContextType | undefined>(undefined);

export const WiFiSongMappingProvider: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [mappings, setMappings] = useState<WifiSongMapping[]>([]);
  const [currentWifi, setCurrentWifi] = useState<WifiInfo>({ ssid: '', bssid: null });

  const loadMappings = useCallback(async () => {
    try {
      const mappingsArray = await loadMappingsWifiUtil();
      setMappings(mappingsArray);
      return mappingsArray;
    } catch (error) {
      logger.error('WiFiProvider', 'Error in loadMappings', error);
      return [];
    }
  }, []);

  const refreshMappings = loadMappings;

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  const ensureWifiPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') return true;

    const permissions: (Permission | undefined)[] = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      Platform.Version >= 33 ? PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES : undefined,
    ];

    const toRequest = permissions.filter(Boolean) as Permission[];
    if (!toRequest.length) return true;

    const result = await PermissionsAndroid.requestMultiple(toRequest);
    return toRequest.every((perm) => result[perm] === PermissionsAndroid.RESULTS.GRANTED);
  }, []);

  // Pure getter — fetches current WiFi state and updates UI state only.
  // No playback logic here; playSongForCurrentWifi is the single playback path.
  const getCurrentWifi = useCallback(async (): Promise<WifiInfo> => {
    if (Platform.OS === 'android') {
      const hasPerms = await ensureWifiPermissions();
      if (!hasPerms) {
        setCurrentWifi({ ssid: '', bssid: null });
        return { ssid: '', bssid: null };
      }
    }

    try {
      const netState = await NetInfo.fetch();
      // isConnected can be null during association — only bail on explicit false.
      if (netState.type !== 'wifi' || netState.isConnected === false) {
        setCurrentWifi({ ssid: '', bssid: null });
        return { ssid: '', bssid: null };
      }

      const rawSsid = await WifiManager.getCurrentWifiSSID();
      // Android occasionally wraps the SSID in double-quotes; strip them so name
      // matching works regardless of which form the OS returned at save time.
      const ssid = rawSsid ? rawSsid.replace(/^"(.*)"$/, '$1') : rawSsid;
      if (!ssid || ssid === '' || ssid.toLowerCase() === '<unknown ssid>') {
        setCurrentWifi({ ssid: '', bssid: null });
        return { ssid: '', bssid: null };
      }

      let bssid: string | null = null;
      try {
        const networks = await WifiManager.loadWifiList();
        bssid = networks.find((n) => n.SSID === ssid)?.BSSID ?? null;
      } catch (error) {
        logger.warn('WiFiProvider', 'Error loading WiFi list', error);
      }

      setCurrentWifi({ ssid, bssid });
      return { ssid, bssid };
    } catch (error) {
      logger.error('WiFiProvider', 'Error getting current WiFi', error);
      setCurrentWifi({ ssid: '', bssid: null });
      return { ssid: '', bssid: null };
    }
  }, [ensureWifiPermissions]);

  const saveMapping = useCallback(
    async (bssid: string, ssid: string, songUri: string, songName: string) => {
      const result = await saveMappingWifiUtil(bssid, ssid, songUri, songName);
      if (result) {
        refreshMappings();
      }
      return result;
    },
    [refreshMappings],
  );

  const deleteMapping = useCallback(
    async (bssid: string) => {
      if (currentWifi.bssid === bssid) {
        await stopSound();
      }

      const result = await deleteMappingWifiUtil(bssid);

      if (result) {
        refreshMappings();
      }

      return result;
    },
    [currentWifi, refreshMappings],
  );

  const testMapping = useCallback(async (bssid: string) => {
    try {
      const mapping = await getMappingByBSSID(bssid);
      if (mapping) {
        await playSound(mapping.songUri, bssid, AUDIO_SOURCE_TYPES.WIFI, {
          forceReplay: true,
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('WiFiProvider', 'Error testing mapping', error);
      return false;
    }
  }, []);

  const playSongForCurrentWifi = useCallback(
    async (forcePlay = false) => {
      try {
        if (!forcePlay && hasBluetoothPriority()) return;

        const { bssid, ssid } = await getCurrentWifi();

        if (!ssid) {
          if (!hasBluetoothPriority()) await stopSound();
          return;
        }

        // BSSID-keyed lookup first; fall back to network name.
        // Name fallback handles MAC randomization (Android 10+) and cases where
        // loadWifiList fails to return a BSSID for the connected network.
        let mapping: Awaited<ReturnType<typeof getMappingByBSSID>> = null;
        if (bssid) {
          mapping = await getMappingByBSSID(bssid);
        }
        if (!mapping) {
          const all = await loadMappingsWifiUtil();
          mapping = all.find((m) => m.wifiName === ssid) ?? null;
        }

        if (mapping) {
          // playSound is idempotent: if this id is already playing it returns early,
          // so calling this on every poll tick is safe and keeps the song alive after it ends.
          await playSound(mapping.songUri, bssid ?? ssid, AUDIO_SOURCE_TYPES.WIFI, {
            forceReplay: forcePlay,
            volume: mapping.volume,
            notificationTitle: mapping.songName,
            networkName: ssid,
          });
        } else {
          if (!hasBluetoothPriority()) await stopSound();
        }
      } catch (error) {
        logger.error('WiFiProvider', 'Error playing song for current WiFi', error);
        if (!hasBluetoothPriority()) await stopSound();
      }
    },
    [getCurrentWifi],
  );

  // Re-check immediately when the app returns to the foreground. This covers the
  // gap between background suspension and the next 7s interval tick, and ensures
  // a song that ended while backgrounded gets restarted without waiting.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        playSongForCurrentWifi().catch((error) => {
          logger.error('WiFiProvider', 'Error in AppState foreground check', error);
        });
      }
    });
    return () => sub.remove();
  }, [playSongForCurrentWifi]);

  useEffect(() => {
    BackgroundTask.getStatusAsync()
      .then((status) => {
        if (status === BackgroundTask.BackgroundTaskStatus.Available) {
          return BackgroundTask.registerTaskAsync(WIFI_BACKGROUND_TASK, { minimumInterval: 15 });
        }
      })
      .catch((error) => logger.warn('WiFiProvider', 'Could not register background task', error));
  }, []);

  useEffect(() => {
    let initialCheckTimeout: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;
    let netInfoDebounce: ReturnType<typeof setTimeout> | null = null;
    let netInfoUnsubscribe: (() => void) | null = null;

    const setupWifiMonitoring = async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      }

      initialCheckTimeout = setTimeout(async () => {
        await playSongForCurrentWifi(true);
      }, 1000);

      intervalId = setInterval(async () => {
        try {
          await playSongForCurrentWifi();
        } catch (error) {
          logger.error('WiFiProvider', 'Error in WiFi check interval', error);
        }
      }, 7000);

      // Debounce WiFi connect events — the OS fires isConnected=true while still associating,
      // so WifiManager won't have an SSID yet. Wait 1.5s for association to complete.
      netInfoUnsubscribe = NetInfo.addEventListener((state) => {
        if (state.type === 'wifi' && state.isConnected) {
          if (netInfoDebounce) clearTimeout(netInfoDebounce);
          netInfoDebounce = setTimeout(() => {
            playSongForCurrentWifi().catch((error) => {
              logger.error('WiFiProvider', 'Error in NetInfo listener', error);
            });
          }, 1500);
        }
      });
    };

    setupWifiMonitoring();

    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(intervalId);
      if (netInfoDebounce) clearTimeout(netInfoDebounce);
      netInfoUnsubscribe?.();
    };
  }, [playSongForCurrentWifi]);

  const contextValue: SongMappingContextType = {
    mappings,
    currentWifi,
    loadMappings,
    getCurrentWifi,
    saveMapping,
    deleteMapping,
    playSongForCurrentWifi,
    testMapping,
    refreshMappings,
  };

  return (
    <WiFiSongMappingContext.Provider value={contextValue}>
      {children}
    </WiFiSongMappingContext.Provider>
  );
};

export const useWifiSongMapping = (): SongMappingContextType => {
  const context = useContext(WiFiSongMappingContext);
  if (context === undefined) {
    throw new Error('useWifiSongMapping must be used within a WiFiSongMappingProvider');
  }
  return context;
};
