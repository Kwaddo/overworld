import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from './logger';

const CHANNEL_ID = 'overworld-playback';
let channelReady = false;

const ensureChannel = async () => {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Now Playing',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    vibrationPattern: [],
  });
  channelReady = true;
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

export const showNowPlayingNotification = async (title: string, source: string): Promise<void> => {
  try {
    await ensureChannel();
    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId);
      currentNotificationId = null;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '♪ Now Playing',
        body: `${title} · via ${source}`,
        sticky: false,
        ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
      },
      trigger: null,
    });
    currentNotificationId = id;
  } catch (error) {
    logger.warn('Notifications', 'Could not show playback notification', error);
  }
};

export const dismissNowPlayingNotification = async (): Promise<void> => {
  try {
    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId);
      currentNotificationId = null;
    }
  } catch (error) {
    logger.warn('Notifications', 'Could not dismiss notification', error);
  }
};
