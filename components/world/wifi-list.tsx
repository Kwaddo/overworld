import { type FC, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LightColors } from '@/constants/Colors';
import { useWifiStore } from '@/lib/stores/wifi-store';
import type { WifiSongMapping } from '@/lib/types/wifi';
import { parseSongTitle } from '@/lib/utils/songTitle';
import DSText from '../ui/ds-text';

interface WifiListProps {
  mappings: WifiSongMapping[];
}

const VOLUME_STEP = 0.1;

const WifiList: FC<WifiListProps> = ({ mappings }) => {
  const testMapping = useWifiStore((s) => s.testMapping);
  const deleteMapping = useWifiStore((s) => s.deleteMapping);
  const updateVolume = useWifiStore((s) => s.updateVolume);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return mappings;
    const q = query.toLowerCase();
    return mappings.filter(
      (m) => m.wifiName.toLowerCase().includes(q) || m.songName.toLowerCase().includes(q),
    );
  }, [mappings, query]);

  const handleDelete = (item: WifiSongMapping) => {
    Alert.alert('Delete Mapping', `Remove the song for "${item.wifiName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMapping(item.bssid),
      },
    ]);
  };

  const handleVolumeChange = (item: WifiSongMapping, delta: number) => {
    const next = Math.min(1, Math.max(0, Math.round((item.volume + delta) * 10) / 10));
    if (next !== item.volume) updateVolume(item.bssid, next);
  };

  const renderRightActions = (item: WifiSongMapping) => (
    <TouchableOpacity style={styles.swipeDelete} onPress={() => handleDelete(item)}>
      <DSText style={styles.swipeDeleteText}>Delete</DSText>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DSText style={styles.title}>Current Mappings</DSText>
      <TextInput
        style={styles.search}
        placeholder="Search networks or songs..."
        placeholderTextColor={LightColors.textSecondary}
        value={query}
        onChangeText={setQuery}
        clearButtonMode="while-editing"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.bssid}
        extraData={filtered}
        renderItem={({ item }) => (
          <ReanimatedSwipeable renderRightActions={() => renderRightActions(item)}>
            <View style={styles.mappingItem}>
              <DSText style={styles.networkName}>{item.wifiName}</DSText>
              <DSText style={styles.songName}>{parseSongTitle(item.songName)}</DSText>
              <View style={styles.volumeRow}>
                <DSText style={styles.volumeLabel}>Vol</DSText>
                <TouchableOpacity
                  style={styles.volumeBtn}
                  onPress={() => handleVolumeChange(item, -VOLUME_STEP)}
                  disabled={item.volume <= 0}
                >
                  <DSText style={styles.volumeBtnText}>−</DSText>
                </TouchableOpacity>
                <DSText style={styles.volumeValue}>{Math.round(item.volume * 100)}%</DSText>
                <TouchableOpacity
                  style={styles.volumeBtn}
                  onPress={() => handleVolumeChange(item, VOLUME_STEP)}
                  disabled={item.volume >= 1}
                >
                  <DSText style={styles.volumeBtnText}>+</DSText>
                </TouchableOpacity>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.playButton]}
                  onPress={() =>
                    Alert.alert('Test Song', `Play "${parseSongTitle(item.songName)}"?`, [
                      { text: 'Cancel' },
                      {
                        text: 'Play',
                        onPress: () => testMapping(item.bssid),
                      },
                    ])
                  }
                >
                  <DSText style={styles.actionButtonText}>Test</DSText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(item)}
                >
                  <DSText style={styles.actionButtonText}>Delete</DSText>
                </TouchableOpacity>
              </View>
            </View>
          </ReanimatedSwipeable>
        )}
        ListEmptyComponent={
          <DSText style={styles.emptyText}>
            {query ? 'No matches found' : 'No mappings created yet'}
          </DSText>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    alignSelf: 'center',
    color: LightColors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
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
  mappingItem: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
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
  networkName: {
    fontSize: 28,
    color: LightColors.textPrimary,
  },
  songName: {
    fontSize: 18,
    color: LightColors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  volumeLabel: {
    fontSize: 14,
    color: LightColors.textSecondary,
    width: 24,
  },
  volumeBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
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
    fontSize: 18,
    lineHeight: 22,
  },
  volumeValue: {
    fontSize: 14,
    color: LightColors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  playButton: {
    backgroundColor: LightColors.primary,
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

export default WifiList;
