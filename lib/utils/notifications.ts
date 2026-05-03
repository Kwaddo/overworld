import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from './logger';

// Present notifications even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// v3: LOW importance — shows in notification tray without a heads-up banner.
// Channel importance is cached by Android, so bumping the ID applies the new value.
const CHANNEL_ID = 'overworld-playback-v3';
export const STOP_ACTION_ID = 'stop';

let channelReady = false;
let categoryReady = false;

const ensureChannel = async () => {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Now Playing',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    vibrationPattern: [0],
    enableVibrate: false,
  });
  channelReady = true;
};

const ensureCategory = async () => {
  if (categoryReady) return;
  await Notifications.setNotificationCategoryAsync('playback', [
    {
      identifier: STOP_ACTION_ID,
      buttonTitle: '■  Stop',
      options: {
        opensAppToForeground: true,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
  ]);
  categoryReady = true;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  } catch (error) {
    logger.warn('Notifications', 'Could not request permission', error);
    return false;
  }
};

let currentNotificationId: string | null = null;
// Track what's currently shown to avoid dismiss-and-recreate for the same song.
let currentShown: { title: string; source: string } | null = null;

export const showNowPlayingNotification = async (title: string, source: string): Promise<void> => {
  // No-op if the exact same notification is already displayed.
  if (currentShown?.title === title && currentShown?.source === source) return;

  // Mark as shown before any await so concurrent callers see it immediately
  // and don't race past the check above, which would produce duplicate notifications.
  currentShown = { title, source };

  try {
    await ensureChannel();
    await ensureCategory();
    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId).catch(() => {});
      currentNotificationId = null;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '♪ Now Playing',
        body: `${title} · via ${source}`,
        categoryIdentifier: 'playback',
        ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
      },
      trigger: null,
    });
    currentNotificationId = id;
  } catch (error) {
    currentShown = null;
    logger.warn('Notifications', 'Could not show playback notification', error);
  }
};

export const dismissNowPlayingNotification = async (): Promise<void> => {
  try {
    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId);
      currentNotificationId = null;
    }
    currentShown = null;
  } catch (error) {
    logger.warn('Notifications', 'Could not dismiss notification', error);
  }
};
