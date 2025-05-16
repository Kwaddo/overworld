import CurrentWifiCard from "@/components/world/current-wifi-card";
import WifiList from "@/components/world/wifi-list";
import { useWifiSongMapping } from "@/lib/hooks/useWifiSongMapping";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

const HomeScreen = () => {
  const { mappings, currentWifi, loadMappings, getCurrentWifi } =
    useWifiSongMapping();

  useEffect(() => {
    loadMappings();
    getCurrentWifi();
  }, [getCurrentWifi, loadMappings]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "WiFi Song Mapper" }} />

      <CurrentWifiCard ssid={currentWifi.ssid} bssid={currentWifi.bssid} />

      <WifiList mappings={mappings} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181825",
    padding: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#cdd6f4",
    marginTop: 24,
    marginBottom: 16,
  },
  currentWifiCard: {
    backgroundColor: "#313244",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: "#a6adc8",
  },
  wifiName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f5e0dc",
    marginVertical: 8,
  },
  button: {
    backgroundColor: "#89b4fa",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#1e1e2e",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default HomeScreen;
