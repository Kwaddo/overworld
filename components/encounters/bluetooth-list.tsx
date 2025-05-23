import { LightColors } from "@/constants/Colors";
import { useBluetoothSongMapping } from "@/contexts/btsongmaps.provider";
import { DocumentPickerAdapter } from "@/lib/hooks/useDocumentPicker";
import { BluetoothSongMapping } from "@/lib/types/ble";
import { FC } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Device } from "react-native-ble-plx";
import DSText from "../ui/ds-text";

interface BluetoothListProps {
  devices: Device[];
  mappings: BluetoothSongMapping[];
}

const BluetoothList: FC<BluetoothListProps> = ({ devices, mappings }) => {
  const { testMapping, deleteMapping, saveMapping, refreshMappings } =
    useBluetoothSongMapping();

  const getMappingForDevice = (deviceId: string) => {
    return mappings.find((mapping) => mapping.id === deviceId);
  };

  const handleAddMapping = async (device: Device) => {
    try {
      const file = await DocumentPickerAdapter.getDocument();

      if (!file) {
        Alert.alert("Error", "No file selected");
        return;
      }

      const success = await saveMapping(
        device.id,
        device.name || device.id,
        file.uri,
        file.name
      );

      if (success) {
        Alert.alert(
          "Success",
          `Successfully mapped "${device.name || device.id}" to "${file.name}"`
        );
        refreshMappings();
      } else {
        Alert.alert("Error", "Failed to save mapping");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add mapping");
      console.error(error);
    }
  };

  const handleTestMapping = async (device: Device) => {
    const mapping = getMappingForDevice(device.id);
    if (!mapping) return;

    Alert.alert("Test Song", `Play the song "${mapping.songName}"?`, [
      { text: "Cancel" },
      {
        text: "Play",
        onPress: async () => {
          await testMapping(device.id);
        },
      },
    ]);
  };

  const confirmDelete = async (device: Device) => {
    const mapping = getMappingForDevice(device.id);
    if (!mapping) return;

    Alert.alert(
      "Delete Mapping",
      `Are you sure you want to remove the song for "${
        device.name || device.id
      }"?`,
      [
        { text: "Cancel" },
        {
          text: "Delete",
          onPress: async () => {
            const success = await deleteMapping(device.id);
            if (success) {
              refreshMappings();
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const renderDevice = ({ item: device }: { item: Device }) => {
    const mapping = getMappingForDevice(device.id);
    const deviceName = device.name || device.id;

    return (
      <View style={styles.deviceItem}>
        <View style={styles.deviceInfo}>
          <DSText
            style={styles.deviceName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {deviceName}
          </DSText>
          <DSText
            style={styles.deviceDetails}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            ID: {device.id}
          </DSText>
          <DSText
            style={styles.deviceDetails}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            Signal: {device.rssi} dBm
          </DSText>
          {mapping && (
            <DSText
              style={styles.mappedSong}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              ♪ {mapping.songName}
            </DSText>
          )}
        </View>

        <View style={styles.actionButtons}>
          {mapping ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.testButton]}
                onPress={() => handleTestMapping(device)}
              >
                <DSText style={styles.actionButtonText}>Test</DSText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => confirmDelete(device)}
              >
                <DSText style={styles.actionButtonText}>Delete</DSText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.addButton]}
              onPress={() => handleAddMapping(device)}
            >
              <DSText style={styles.actionButtonText}>Add Song</DSText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={devices}
      keyExtractor={(item) => item.id}
      renderItem={renderDevice}
      extraData={mappings}
      ListEmptyComponent={
        <DSText style={styles.emptyText}>No nearby devices found.</DSText>
      }
    />
  );
};

const styles = StyleSheet.create({
  deviceItem: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  deviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  deviceName: {
    fontSize: 18,
    color: LightColors.textPrimary,
    marginBottom: 4,
  },
  deviceDetails: {
    fontSize: 12,
    color: LightColors.textSecondary,
    marginBottom: 4,
  },
  mappedSong: {
    fontSize: 14,
    color: LightColors.textSecondary,
    fontWeight: "600",
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  actionButton: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginLeft: 4,
    minWidth: 55,
    alignItems: "center",
  },
  addButton: {
    backgroundColor: LightColors.primary,
  },
  testButton: {
    backgroundColor: LightColors.tertiary,
  },
  deleteButton: {
    backgroundColor: LightColors.secondary,
  },
  actionButtonText: {
    color: LightColors.textLight,
    fontWeight: "600",
    fontSize: 12,
  },
  emptyText: {
    color: LightColors.textSecondary,
    textAlign: "center",
    marginTop: 32,
    fontSize: 16,
  },
});

export default BluetoothList;
