import { SecureStoreAdapter } from "@/lib/hooks/useSecureStore";
import {
  registerBackgroundTask,
  unregisterBackgroundTask,
} from "@/lib/utils/background";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";

const BACKGROUND_ENABLED_KEY = "background_enabled";

export default function SettingsScreen() {
  const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const enabled = await SecureStoreAdapter.getItem(BACKGROUND_ENABLED_KEY);
      setIsBackgroundEnabled(enabled === "true");
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const toggleBackgroundService = async (value: boolean) => {
    try {
      if (value) {
        const registered = await registerBackgroundTask();
        if (registered) {
          setIsBackgroundEnabled(true);
          await SecureStoreAdapter.setItem(BACKGROUND_ENABLED_KEY, "true");
          Alert.alert(
            "Background Service Enabled",
            "WiFi songs will play even when the app is closed. This may affect battery life."
          );
        } else {
          Alert.alert("Error", "Failed to enable background service");
        }
      } else {
        await unregisterBackgroundTask();
        setIsBackgroundEnabled(false);
        await SecureStoreAdapter.setItem(BACKGROUND_ENABLED_KEY, "false");
      }
    } catch (error) {
      console.error("Error toggling background service:", error);
      Alert.alert("Error", "Failed to change background service setting");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Run in Background</Text>
        <Switch
          trackColor={{ false: "#313244", true: "#89b4fa" }}
          thumbColor={isBackgroundEnabled ? "#f5e0dc" : "#cdd6f4"}
          onValueChange={toggleBackgroundService}
          value={isBackgroundEnabled}
        />
      </View>

      <Text style={styles.description}>
        When enabled, songs will play when you connect to mapped WiFi networks,
        even when the app is closed. This may increase battery usage.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181825",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#cdd6f4",
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#313244",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: "#f5e0dc",
  },
  description: {
    fontSize: 14,
    color: "#a6adc8",
    marginBottom: 24,
  },
});
