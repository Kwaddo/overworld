import { type FC, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import type { Device } from 'react-native-ble-plx';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { LightColors } from '@/constants/Colors';
import { DocumentPickerAdapter } from '@/lib/hooks/useDocumentPicker';
import { useBtStore } from '@/lib/stores/bt-store';
import type { BluetoothSongMapping } from '@/lib/types/ble';
import { logger } from '@/lib/utils/logger';
import { parseSongTitle } from '@/lib/utils/songTitle';
import DSText from '../ui/ds-text';

interface BluetoothListProps {
  devices: Device[];
  mappings: BluetoothSongMapping[];
}

const VOLUME_STEP = 0.1;

const BluetoothList: FC<BluetoothListProps> = ({ devices, mappings }) => {
  const testMapping = useBtStore((s) => s.testMapping);
  const deleteMapping = useBtStore((s) => s.deleteMapping);
  const saveMapping = useBtStore((s) => s.saveMapping);
  const updateVolume = useBtStore((s) => s.updateVolume);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return devices;
    const q = query.toLowerCase();
    return devices.filter(
      (d) => (d.name ?? '').toLowerCase().includes(q) || d.id.toLowerCase().includes(q),
    );
  }, [devices, query]);

  const getMappingForDevice = (deviceId: string) => mappings.find((m) => m.id === deviceId);

  const handleAddMapping = async (device: Device) => {
    try {
      const file = await DocumentPickerAdapter.getDocument();
      if (!file) return;
      const success = await saveMapping(device.id, device.name ?? device.id, file.uri, file.name);
      if (success) {
        Alert.alert(
          'Success',
          `Mapped "${device.name ?? device.id}" to "${parseSongTitle(file.name)}"`,
        );
      } else {
        Alert.alert('Error', 'Failed to save mapping');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add mapping');
      logger.error('BTList', 'Failed to add mapping', error);
    }
  };

  const handleDelete = (device: Device) => {
    const mapping = getMappingForDevice(device.id);
    if (!mapping) return;
    Alert.alert('Delete Mapping', `Remove the song for "${device.name ?? device.id}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMapping(device.id) },
    ]);
  };

  const handleVolumeChange = (mapping: BluetoothSongMapping, delta: number) => {
    const next = Math.min(1, Math.max(0, Math.round((mapping.volume + delta) * 10) / 10));
    if (next !== mapping.volume) updateVolume(mapping.id, next);
  };

  const renderRightActions = (device: Device) => {
    if (!getMappingForDevice(device.id)) return null;
    return (
      <TouchableOpacity style={styles.swipeDelete} onPress={() => handleDelete(device)}>
        <DSText style={styles.swipeDeleteText}>Delete</DSText>
      </TouchableOpacity>
    );
  };

  const renderDevice = ({ item: device }: { item: Device }) => {
    const mapping = getMappingForDevice(device.id);
    const deviceName = device.name ?? device.id;

    return (
      <ReanimatedSwipeable renderRightActions={() => renderRightActions(device)}>
        <View style={styles.deviceItem}>
          <View style={styles.deviceInfo}>
            <DSText style={styles.deviceName} numberOfLines={1} ellipsizeMode="tail">
              {deviceName}
            </DSText>
            <DSText style={styles.deviceDetails} numberOfLines={1} ellipsizeMode="middle">
              ID: {device.id}
            </DSText>
            <DSText style={styles.deviceDetails}>Signal: {device.rssi} dBm</DSText>
            {mapping && (
              <>
                <DSText style={styles.mappedSong} numberOfLines={1} ellipsizeMode="tail">
                  ♪ {parseSongTitle(mapping.songName)}
                </DSText>
                <View style={styles.volumeRow}>
                  <DSText style={styles.volumeLabel}>Vol</DSText>
                  <TouchableOpacity
                    style={styles.volumeBtn}
                    onPress={() => handleVolumeChange(mapping, -VOLUME_STEP)}
                    disabled={mapping.volume <= 0}
                  >
                    <DSText style={styles.volumeBtnText}>−</DSText>
                  </TouchableOpacity>
                  <DSText style={styles.volumeValue}>{Math.round(mapping.volume * 100)}%</DSText>
                  <TouchableOpacity
                    style={styles.volumeBtn}
                    onPress={() => handleVolumeChange(mapping, VOLUME_STEP)}
                    disabled={mapping.volume >= 1}
                  >
                    <DSText style={styles.volumeBtnText}>+</DSText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <View style={styles.actionButtons}>
            {mapping ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.testButton]}
                  onPress={() =>
                    Alert.alert('Test Song', `Play "${parseSongTitle(mapping.songName)}"?`, [
                      { text: 'Cancel' },
                      { text: 'Play', onPress: () => testMapping(device.id) },
                    ])
                  }
                >
                  <DSText style={styles.actionButtonText}>Test</DSText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(device)}
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
      </ReanimatedSwipeable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        style={styles.search}
        placeholder="Search devices..."
        placeholderTextColor={LightColors.textSecondary}
        value={query}
        onChangeText={setQuery}
        clearButtonMode="while-editing"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderDevice}
        extraData={mappings}
        ListEmptyComponent={
          <DSText style={styles.emptyText}>
            {query ? 'No matches found' : 'No nearby devices found.'}
          </DSText>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  search: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    fontSize: 16,
    color: LightColors.textPrimary,
    fontFamily: 'NintendoDSBIOS',
    borderWidth: 1.5,
    borderColor: LightColors.cardBorder,
    shadowColor: LightColors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceItem: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: LightColors.cardBorder,
    borderTopWidth: 2,
    borderTopColor: LightColors.cardHighlight,
    shadowColor: LightColors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
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
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 4,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  volumeLabel: {
    fontSize: 12,
    color: LightColors.textSecondary,
    width: 22,
  },
  volumeBtn: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: LightColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 245, 200, 0.5)',
    shadowColor: LightColors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  volumeBtnText: {
    color: LightColors.textLight,
    fontSize: 16,
    lineHeight: 20,
  },
  volumeValue: {
    fontSize: 12,
    color: LightColors.textPrimary,
    minWidth: 36,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  actionButton: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginLeft: 4,
    minWidth: 55,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: LightColors.primary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 245, 200, 0.5)',
    shadowColor: LightColors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
  },
  testButton: {
    backgroundColor: LightColors.tertiary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 245, 200, 0.5)',
    shadowColor: LightColors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: LightColors.secondary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 200, 180, 0.4)',
    shadowColor: '#5a1000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: {
    color: LightColors.textLight,
    fontWeight: '600',
    fontSize: 12,
  },
  swipeDelete: {
    backgroundColor: LightColors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 8,
    marginBottom: 12,
  },
  swipeDeleteText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    color: LightColors.textSecondary,
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
});

export default BluetoothList;
