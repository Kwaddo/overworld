import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import BluetoothList from '@/components/encounters/bluetooth-list';
import DSText from '@/components/ui/ds-text';
import { PolkaDotBackground } from '@/components/ui/polka-dot-background';
import { LightColors } from '@/constants/Colors';
import { useBtStore } from '@/lib/stores/bt-store';

const EncountersScreen = () => {
  const mappings = useBtStore((s) => s.mappings);
  const nearbyDevices = useBtStore((s) => s.nearbyDevices);
  const loadMappings = useBtStore((s) => s.loadMappings);

  useFocusEffect(
    useCallback(() => {
      loadMappings();
    }, [loadMappings]),
  );

  return (
    <PolkaDotBackground>
      <View style={styles.container}>
        <DSText style={styles.title}>Nearby Phone Encounters</DSText>
        <DSText style={styles.subtitle}>Scanning for phones within 5m radius</DSText>
        <BluetoothList devices={nearbyDevices} mappings={mappings} />
      </View>
    </PolkaDotBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 32,
    color: LightColors.textPrimary,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: LightColors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default EncountersScreen;
