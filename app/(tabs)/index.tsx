import { PolkaDotBackground } from "@/components/ui/polka-dot-background";
import CurrentWifiCard from "@/components/world/current-wifi-card";
import WifiList from "@/components/world/wifi-list";
import { LightColors } from "@/constants/Colors";
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
    <PolkaDotBackground dotColor={LightColors.primary} dotSize={4} spacing={50}>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Overworld",
            headerTitleAlign: "center",
            headerTitleStyle: {
              fontFamily: "NintendoDSBIOS",
              fontSize: 28,
            },
          }}
        />
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

export default HomeScreen;
