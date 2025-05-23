import BluetoothList from "@/components/encounters/bluetooth-list";
import DSText from "@/components/ui/ds-text";
import { PolkaDotBackground } from "@/components/ui/polka-dot-background";
import { LightColors } from "@/constants/Colors";
import { useBluetoothSongMapping } from "@/contexts/btsongmaps.provider";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect } from "react";
import { StyleSheet, View } from "react-native";

const EncountersScreen = () => {
  const { mappings, loadMappings, refreshMappings, nearbyDevices } =
    useBluetoothSongMapping();

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  useFocusEffect(
    useCallback(() => {
      refreshMappings();
      return () => {};
    }, [refreshMappings])
  );

  return (
    <PolkaDotBackground>
      <View style={styles.container}>
        <DSText style={styles.title}>Nearby Phone Encounters</DSText>
        <DSText style={styles.subtitle}>
          Scanning for phones within 5m radius
        </DSText>

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
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: LightColors.textSecondary,
    marginBottom: 16,
    textAlign: "center",
  },
  buttonContainer: {
    marginVertical: 16,
  },
});

export default EncountersScreen;
