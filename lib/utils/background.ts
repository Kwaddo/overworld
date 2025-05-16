import { Audio } from "expo-av";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import WifiManager from "react-native-wifi-reborn";
import { SecureStoreAdapter } from "../hooks/useSecureStore";
import { playSound, stopSound } from "./controls";
import { getMappingByBSSID } from "./mappings";

const BACKGROUND_WIFI_CHECK = "background-wifi-check";
const BACKGROUND_ENABLED_KEY = "background_enabled";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

let silentAudio: Audio.Sound | null = null;

const keepAudioSessionAlive = async () => {
  try {
    if (silentAudio === null) {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/silence.mp3"),
        { isLooping: true, volume: 0.001 }
      );
      silentAudio = sound;
      await silentAudio.playAsync();
      console.log("Silent audio session started");
    }
  } catch (error) {
    console.error("Failed to keep audio session alive:", error);
  }
};

const createForegroundNotification = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("background-service", {
      name: "Background Service",
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0, 0, 0, 0],
      sound: null,
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Overworld",
        body: "Monitoring WiFi networks for songs",
        sticky: true,
      },
      trigger: null,
    });
  }
};

TaskManager.defineTask(BACKGROUND_WIFI_CHECK, async () => {
  try {
    console.log("Running background WiFi check");

    const enabled = await SecureStoreAdapter.getItem(BACKGROUND_ENABLED_KEY);
    if (enabled !== "true") {
      console.log("Background service disabled by user");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    if (Platform.OS === "ios") {
      await keepAudioSessionAlive();
    }

    const ssid = await WifiManager.getCurrentWifiSSID();
    if (!ssid) {
      await stopSound();
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    let bssid = null;
    try {
      const networks = await WifiManager.loadWifiList();
      const currentNetwork = networks.find((network) => network.SSID === ssid);
      bssid = currentNetwork?.BSSID || null;
    } catch (error) {
      console.log("Error loading networks:", error);
    }

    if (!bssid) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const mapping = await getMappingByBSSID(bssid);
    if (mapping) {
      console.log(`Background: Found mapping for ${ssid}, playing song`);
      await playSound(mapping.songUri, bssid, { forceReplay: true });
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Background task error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerBackgroundTask = async () => {
  try {
    if (Platform.OS === "android") {
      await createForegroundNotification();
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_WIFI_CHECK, {
      minimumInterval: 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    if (Platform.OS === "ios") {
      await keepAudioSessionAlive();
    }

    console.log("Background task registered");
    return true;
  } catch (error) {
    console.error("Background task registration failed:", error);
    return false;
  }
};

export const unregisterBackgroundTask = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_WIFI_CHECK);

    if (silentAudio) {
      await silentAudio.stopAsync();
      await silentAudio.unloadAsync();
      silentAudio = null;
    }

    if (Platform.OS === "android") {
      await Notifications.dismissAllNotificationsAsync();
    }

    console.log("Background task unregistered");
    return true;
  } catch (error) {
    console.error("Background task unregistration failed:", error);
    return false;
  }
};
