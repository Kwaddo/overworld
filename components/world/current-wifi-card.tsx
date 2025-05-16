import { useWifiSongMapping } from "@/contexts/wifisongmaps.provider";
import { getDocumentAsync } from "expo-document-picker";
import { FC } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

      const result = await getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const wifibssid = bssid || `ssid:${ssid}`;

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
      <Text style={styles.label}>Current WiFi:</Text>
      <Text style={styles.wifiName}>{ssid || "Not connected"}</Text>
      <TouchableOpacity style={styles.button} onPress={addMapping}>
        <Text style={styles.buttonText}>Map Song to This Network</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181825",
    padding: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#cdd6f4",
    marginTop: 24,
    marginBottom: 16,
  },
  currentWifiCard: {
    backgroundColor: "#313244",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: "#a6adc8",
  },
  wifiName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f5e0dc",
    marginVertical: 8,
  },
  button: {
    backgroundColor: "#89b4fa",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#1e1e2e",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default CurrentWifiCard;
