import BluetoothList from "@/components/encounters/bluetooth-list";
import DSText from "@/components/ui/ds-text";
import { PolkaDotBackground } from "@/components/ui/polka-dot-background";
import { LightColors } from "@/constants/Colors";
import { useBluetoothSongMapping } from "@/contexts/btsongmaps.provider";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import RNBluetoothClassic, {
  BluetoothDevice,
} from "react-native-bluetooth-classic";

const EncountersScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const { mappings, loadMappings, refreshMappings } = useBluetoothSongMapping();

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      const granted = await Promise.all([
        PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        ),
        PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ),
      ]).then((results) =>
        results.every((result) => result === PermissionsAndroid.RESULTS.GRANTED)
      );

      if (!granted) {
        Alert.alert(
          "Permissions Required",
          "Bluetooth and location permissions are needed to access paired devices"
        );
      }

      return granted;
    }
    return true;
  };

  const getPairedDevices = useCallback(async () => {
    try {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) return;

      setIsLoading(true);

      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        Alert.alert(
          "Bluetooth Disabled",
          "Please enable Bluetooth to view paired devices"
        );
        setIsLoading(false);
        return;
      }

      const pairedDevices = await RNBluetoothClassic.getBondedDevices();
      setDevices(pairedDevices);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to get paired devices:", error);
      setIsLoading(false);
      Alert.alert("Error", "Failed to retrieve paired devices");
    }
  }, []);

  useEffect(() => {
    getPairedDevices();
    loadMappings();
  }, [getPairedDevices, loadMappings]);

  useFocusEffect(
    useCallback(() => {
      getPairedDevices();
      refreshMappings();
      return () => {};
    }, [getPairedDevices, refreshMappings])
  );

  return (
    <PolkaDotBackground>
      <View style={styles.container}>
        <DSText style={styles.title}>Bluetooth Encounters</DSText>

        <TouchableOpacity
          style={[styles.scanButton, isLoading ? styles.scanningButton : null]}
          onPress={getPairedDevices}
          disabled={isLoading}
        >
          <DSText style={styles.scanButtonText}>
            {isLoading ? "Loading..." : "Refresh Paired Devices"}
          </DSText>
        </TouchableOpacity>

        <BluetoothList devices={devices} mappings={mappings} />
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
    marginBottom: 16,
    textAlign: "center",
  },
  scanButton: {
    backgroundColor: LightColors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginVertical: 16,
  },
  scanningButton: {
    backgroundColor: LightColors.secondary,
    opacity: 0.7,
  },
  scanButtonText: {
    color: LightColors.textLight,
    fontSize: 18,
  },
});

export default EncountersScreen;
