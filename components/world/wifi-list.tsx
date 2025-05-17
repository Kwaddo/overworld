import { LightColors } from "@/constants/Colors";
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
import { SafeAreaView } from "react-native-safe-area-context";
import DSText from "../ui/ds-text";

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
    <SafeAreaView style={{ flex: 1 }}>
      <DSText style={styles.title}>Current Mappings</DSText>
      <FlatList
        data={mappings}
        keyExtractor={(item) => item.bssid}
        extraData={mappings}
        renderItem={({ item }) => (
          <View style={styles.mappingItem}>
            <DSText style={styles.networkName}>{item.wifiName}</DSText>
            <DSText style={styles.songName}>{item.songName}</DSText>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.playButton]}
                onPress={() => handleTestMapping(item)}
              >
                <DSText style={styles.actionButtonText}>Test</DSText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => confirmDelete(item)}
              >
                <DSText style={styles.actionButtonText}>Delete</DSText>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <DSText style={styles.emptyText}>No mappings created yet</DSText>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    alignSelf: "center",
    color: LightColors.textPrimary,
    marginTop: 24,
    marginBottom: 16,
  },
  mappingItem: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  networkName: {
    fontSize: 28,
    color: LightColors.textPrimary,
  },
  songName: {
    fontSize: 18,
    color: LightColors.textSecondary,
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
    backgroundColor: LightColors.primary,
  },
  deleteButton: {
    backgroundColor: LightColors.secondary,
  },
  actionButtonText: {
    color: LightColors.textLight,
    fontWeight: "600",
  },
  emptyText: {
    color: LightColors.textSecondary,
    textAlign: "center",
    marginTop: 32,
    fontSize: 16,
  },
});

export default WifiList;
