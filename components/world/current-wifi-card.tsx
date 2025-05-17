import { LightColors } from "@/constants/Colors";
import { useWifiSongMapping } from "@/contexts/wifisongmaps.provider";
import { DocumentPickerAdapter } from "@/lib/hooks/useDocumentPicker";
import { FC } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import DSText from "../ui/ds-text";

interface CurrentWifiCardProps {
  ssid: string;
  bssid: string | null;
}

const CurrentWifiCard: FC<CurrentWifiCardProps> = ({ ssid, bssid }) => {
  const { saveMapping } = useWifiSongMapping();
  const addMapping = async () => {
    try {
      if (!ssid) {
        Alert.alert(
          "Not Connected",
          "You must be connected to a WiFi network to create a mapping"
        );
        return;
      }

      const file = await DocumentPickerAdapter.getDocument();

      const wifibssid = bssid || `ssid:${ssid}`;

      if (!file) {
        Alert.alert("Error", "No file selected");
        return;
      }

      const success = await saveMapping(wifibssid, ssid, file.uri, file.name);

      if (success) {
        Alert.alert(
          "Success",
          `Successfully mapped "${ssid}" to "${file.name}"`
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add mapping");
      console.error(error);
    }
  };

  return (
    <View style={styles.currentWifiCard}>
      <DSText style={styles.label}>Current WiFi:</DSText>
      <DSText style={styles.wifiName}>{ssid || "Not connected"}</DSText>
      <TouchableOpacity style={styles.button} onPress={addMapping}>
        <DSText style={styles.buttonText}>Map Song to This Network</DSText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  currentWifiCard: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 10,
    padding: 16,
  },
  label: {
    fontSize: 22,
    color: LightColors.textSecondary,
  },
  wifiName: {
    fontSize: 34,
    color: LightColors.textPrimary,
    marginVertical: 8,
  },
  button: {
    backgroundColor: LightColors.primary,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: "center",
  },
  buttonText: {
    color: LightColors.textLight,
    fontSize: 22,
  },
});

export default CurrentWifiCard;
