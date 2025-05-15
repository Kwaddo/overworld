import { useWifiSongMapping } from "@/lib/hooks/useWifiSongMapping";
import * as DocumentPicker from "expo-document-picker";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const HomeScreen = () => {
  const {
    mappings,
    currentWifi,
    loadMappings,
    getCurrentWifi,
    saveMapping,
    deleteMapping,
    playSongForCurrentWifi,
  } = useWifiSongMapping();

  useEffect(() => {
    loadMappings();
    getCurrentWifi();
  }, [getCurrentWifi, loadMappings]);

  const addMapping = async () => {
    try {
      if (!currentWifi.ssid) {
        Alert.alert(
          "Not Connected",
          "You must be connected to a WiFi network to create a mapping"
        );
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const bssid = currentWifi.bssid || `ssid:${currentWifi.ssid}`;

      const success = await saveMapping(
        bssid,
        currentWifi.ssid,
        file.uri,
        file.name
      );

      if (success) {
        Alert.alert(
          "Success",
          `Successfully mapped "${currentWifi.ssid}" to "${file.name}"`
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add mapping");
      console.error(error);
    }
  };

  const testMapping = async (item: any) => {
    Alert.alert("Test Song", `Play the song "${item.songName}"?`, [
      { text: "Cancel" },
      { text: "Play", onPress: () => playSongForCurrentWifi() },
    ]);
  };

  const confirmDelete = async (item: any) => {
    Alert.alert(
      "Delete Mapping",
      `Are you sure you want to remove the song for "${item.wifiName}"?`,
      [
        { text: "Cancel" },
        {
          text: "Delete",
          onPress: async () => {
            await deleteMapping(item.bssid);
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "WiFi Song Mapper" }} />

      <View style={styles.currentWifiCard}>
        <Text style={styles.label}>Current WiFi:</Text>
        <Text style={styles.wifiName}>
          {currentWifi.ssid || "Not connected"}
        </Text>
        <TouchableOpacity style={styles.button} onPress={addMapping}>
          <Text style={styles.buttonText}>Map Song to This Network</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Your Mappings</Text>

      <FlatList
        data={mappings}
        keyExtractor={(item) => item.bssid}
        renderItem={({ item }) => (
          <View style={styles.mappingItem}>
            <Text style={styles.networkName}>{item.wifiName}</Text>
            <Text style={styles.songName}>{item.songName}</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.playButton]}
                onPress={() => testMapping(item)}
              >
                <Text style={styles.actionButtonText}>Test</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => confirmDelete(item)}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No mappings created yet</Text>
        }
      />
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
  mappingItem: {
    backgroundColor: "#313244",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  networkName: {
    fontSize: 18,
    color: "#f5e0dc",
    fontWeight: "bold",
  },
  songName: {
    fontSize: 14,
    color: "#a6adc8",
    marginTop: 4,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionButton: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  playButton: {
    backgroundColor: "#89b4fa",
  },
  deleteButton: {
    backgroundColor: "#f38ba8",
  },
  actionButtonText: {
    color: "#1e1e2e",
    fontWeight: "600",
  },
  emptyText: {
    color: "#a6adc8",
    textAlign: "center",
    marginTop: 32,
    fontSize: 16,
  },
});

export default HomeScreen;
