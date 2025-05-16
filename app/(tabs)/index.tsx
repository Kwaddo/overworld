import CurrentWifiCard from "@/components/world/current-wifi-card";
import WifiList from "@/components/world/wifi-list";
import { useWifiSongMapping } from "@/contexts/wifisongmaps.provider";
import { useFocusEffect } from "@react-navigation/native";
import { Stack } from "expo-router";
import { useCallback, useEffect } from "react";
import { StyleSheet, View } from "react-native";

const HomeScreen = () => {
  const {
    mappings,
    currentWifi,
    loadMappings,
    getCurrentWifi,
    refreshMappings,
  } = useWifiSongMapping();

  useEffect(() => {
    loadMappings();
    getCurrentWifi();
  }, [getCurrentWifi, loadMappings]);

  useFocusEffect(
    useCallback(() => {
      getCurrentWifi();
      refreshMappings();
      return () => {};
    }, [getCurrentWifi, refreshMappings])
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Overworld" }} />
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
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#cdd6f4",
    marginTop: 24,
    marginBottom: 16,
  },
});

export default HomeScreen;
