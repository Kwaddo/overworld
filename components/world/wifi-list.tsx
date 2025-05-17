import { useWifiSongMapping } from "@/contexts/wifisongmaps.provider";
import { WifiSongMapping } from "@/lib/types/wifi";
import { FC } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import AppText from "../ui/ds-text";

interface WifiListProps {
  mappings: WifiSongMapping[];
}

const WifiList: FC<WifiListProps> = ({ mappings }) => {
  const { testMapping, deleteMapping, refreshMappings } = useWifiSongMapping();

  const handleTestMapping = async (item: WifiSongMapping) => {
    Alert.alert("Test Song", `Play the song "${item.songName}"?`, [
      { text: "Cancel" },
      {
        text: "Play",
        onPress: async () => {
          await testMapping(item.bssid);
        },
      },
    ]);
  };

  const confirmDelete = async (item: WifiSongMapping) => {
    Alert.alert(
      "Delete Mapping",
      `Are you sure you want to remove the song for "${item.wifiName}"?`,
      [
        { text: "Cancel" },
        {
          text: "Delete",
          onPress: async () => {
            const success = await deleteMapping(item.bssid);
            if (success) {
              refreshMappings();
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <>
      <AppText style={styles.title}>Your Mappings</AppText>
      <FlatList
        data={mappings}
        keyExtractor={(item) => item.bssid}
        extraData={mappings}
        renderItem={({ item }) => (
          <View style={styles.mappingItem}>
            <AppText style={styles.networkName}>{item.wifiName}</AppText>
            <AppText style={styles.songName}>{item.songName}</AppText>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.playButton]}
                onPress={() => handleTestMapping(item)}
              >
                <AppText style={styles.actionButtonText}>Test</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => confirmDelete(item)}
              >
                <AppText style={styles.actionButtonText}>Delete</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <AppText style={styles.emptyText}>No mappings created yet</AppText>
        }
      />
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    alignSelf: "center",
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
    fontSize: 28,
    color: "#f5e0dc",
  },
  songName: {
    fontSize: 18,
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
