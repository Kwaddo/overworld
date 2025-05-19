import { PolkaDotBackground } from "@/components/ui/polka-dot-background";
import CurrentWifiCard from "@/components/world/current-wifi-card";
import WifiList from "@/components/world/wifi-list";
import { useWifiSongMapping } from "@/contexts/wifisongmaps.provider";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect } from "react";
import { StyleSheet, View } from "react-native";

const OverworldScreen = () => {
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
    <PolkaDotBackground>
      <View style={styles.container}>
        <CurrentWifiCard ssid={currentWifi.ssid} bssid={currentWifi.bssid} />
        <WifiList mappings={mappings} />
      </View>
    </PolkaDotBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "transparent",
  },
});

export default OverworldScreen;
