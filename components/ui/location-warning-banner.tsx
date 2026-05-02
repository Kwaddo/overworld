import { StyleSheet, View } from 'react-native';
import { LightColors } from '@/constants/Colors';
import { useWifiStore } from '@/lib/stores/wifi-store';
import DSText from './ds-text';

export const LocationWarningBanner = () => {
  const locationBlocked = useWifiStore((s) => s.locationBlocked);

  if (!locationBlocked) return null;

  return (
    <View style={styles.banner}>
      <DSText style={styles.text}>📍 Location unavailable — WiFi detection paused</DSText>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: LightColors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 13,
  },
});
