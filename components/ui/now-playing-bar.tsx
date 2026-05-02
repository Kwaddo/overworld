import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LightColors } from '@/constants/Colors';
import { getCurrentlyPlaying, stopSound } from '@/lib/utils/controls';
import { parseSongTitle } from '@/lib/utils/songTitle';
import DSText from './ds-text';

const useNowPlayingPoll = () => {
  const [state, setState] = useState(getCurrentlyPlaying);
  useEffect(() => {
    const id = setInterval(() => setState(getCurrentlyPlaying()), 1000);
    return () => clearInterval(id);
  }, []);
  return state;
};

export const NowPlayingBar = () => {
  const { id, isPlaying, songName, networkName } = useNowPlayingPoll();
  const insets = useSafeAreaInsets();

  if (!isPlaying || !id) return null;

  const displayName = songName ?? parseSongTitle(id.split('/').pop() ?? id);
  const title = networkName ? `${networkName} - ${displayName}` : displayName;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 4 }]}>
      <DSText style={styles.note}>♪</DSText>
      <DSText style={styles.title} numberOfLines={1}>
        {title}
      </DSText>
      <TouchableOpacity onPress={stopSound} style={styles.stopBtn}>
        <DSText style={styles.stopText}>■</DSText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    backgroundColor: LightColors.cardBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: LightColors.primary,
    gap: 8,
  },
  note: {
    fontSize: 14,
    color: LightColors.primary,
  },
  title: {
    flex: 1,
    fontSize: 13,
    color: LightColors.textPrimary,
  },
  stopBtn: {
    padding: 2,
  },
  stopText: {
    fontSize: 13,
    color: LightColors.secondary,
  },
});
