import { StyleSheet, View } from 'react-native';
import { LightColors } from '@/constants/Colors';

const TOTAL_STEPS = 5;

export const ProgressDots = ({ current }: { current: number }) => (
  <View style={styles.dots}>
    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
      <View
        // biome-ignore lint/suspicious/noArrayIndexKey: static list
        key={i}
        style={[styles.dot, i <= current && styles.dotActive]}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
    marginTop: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: LightColors.cardBackground,
  },
  dotActive: {
    backgroundColor: LightColors.primary,
  },
});
