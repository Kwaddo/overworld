import { useWifiSongMapping } from "@/lib/hooks/useWifiSongMapping";
import { WifiSongMapping } from "@/lib/types/wifi";
import { FC } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface WifiListProps {
  mappings: WifiSongMapping[];
}

const WifiList: FC<WifiListProps> = ({ mappings }) => {
  const { playSongForCurrentWifi, deleteMapping } = useWifiSongMapping();

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
    <>
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
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#cdd6f4",
    marginTop: 24,
    marginBottom: 16,
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

export default WifiList;
