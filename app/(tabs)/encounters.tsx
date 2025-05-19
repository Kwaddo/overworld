import DSText from "@/components/ui/ds-text";
import { PolkaDotBackground } from "@/components/ui/polka-dot-background";
import { LightColors } from "@/constants/Colors";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
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
  }, [getPairedDevices]);

  useFocusEffect(
    useCallback(() => {
      getPairedDevices();
      return () => {};
    }, [getPairedDevices])
  );

  return (
    <PolkaDotBackground>
      <View style={styles.container}>
        <DSText style={styles.title}>Paired Devices</DSText>

        <TouchableOpacity
          style={[styles.scanButton, isLoading ? styles.scanningButton : null]}
          onPress={getPairedDevices}
          disabled={isLoading}
        >
          <DSText style={styles.scanButtonText}>
            {isLoading ? "Loading..." : "Refresh Paired Devices"}
          </DSText>
        </TouchableOpacity>

        <FlatList
          data={devices}
          keyExtractor={(item) => item.address}
          renderItem={({ item }) => (
            <View style={styles.deviceItem}>
              <DSText style={styles.deviceName}>
                {item.name || item.address}
              </DSText>
              <DSText style={styles.deviceDetails}>MAC: {item.address}</DSText>
            </View>
          )}
          ListEmptyComponent={
            <DSText style={styles.emptyText}>
              {isLoading
                ? "Loading paired devices..."
                : "No paired devices found."}
            </DSText>
          }
        />
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
  deviceItem: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 20,
    color: LightColors.textPrimary,
  },
  deviceDetails: {
    fontSize: 14,
    color: LightColors.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    color: LightColors.textSecondary,
    textAlign: "center",
    marginTop: 32,
    fontSize: 16,
  },
});

export default EncountersScreen;
