import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
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
  const { id, isPlaying } = useNowPlayingPoll();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isPlaying ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isPlaying, fadeAnim]);

  if (!isPlaying || !id) return null;

  const title = parseSongTitle(id.split('/').pop() ?? id);

  return (
    <Animated.View style={[styles.bar, { opacity: fadeAnim }]}>
      <DSText style={styles.note}>♪</DSText>
      <DSText style={styles.title} numberOfLines={1}>
        {title}
      </DSText>
      <TouchableOpacity onPress={stopSound} style={styles.stopBtn}>
        <DSText style={styles.stopText}>■</DSText>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: LightColors.cardBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: LightColors.primary,
    gap: 8,
  },
  note: {
    fontSize: 18,
    color: LightColors.primary,
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: LightColors.textPrimary,
  },
  stopBtn: {
    padding: 4,
  },
  stopText: {
    fontSize: 16,
    color: LightColors.secondary,
  },
});
