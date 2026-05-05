import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { NowPlayingBar } from '@/components/ui/now-playing-bar';
import { PolkaDotBackground } from '@/components/ui/polka-dot-background';
import CurrentWifiCard from '@/components/world/current-wifi-card';
import WifiList from '@/components/world/wifi-list';
import { useWifiStore } from '@/lib/stores/wifi-store';

const OverworldScreen = () => {
  const mappings = useWifiStore((s) => s.mappings);
  const currentWifi = useWifiStore((s) => s.currentWifi);
  const getCurrentWifi = useWifiStore((s) => s.getCurrentWifi);
  const loadMappings = useWifiStore((s) => s.loadMappings);

  useFocusEffect(
    useCallback(() => {
      getCurrentWifi();
      loadMappings();
    }, [getCurrentWifi, loadMappings]),
  );

  return (
    <>
      <NowPlayingBar />
      <PolkaDotBackground>
        <View style={styles.container}>
          <CurrentWifiCard ssid={currentWifi.ssid} bssid={currentWifi.bssid} />
          <WifiList mappings={mappings} />
        </View>
      </PolkaDotBackground>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
});

export default OverworldScreen;
