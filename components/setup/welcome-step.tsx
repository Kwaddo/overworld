import { StyleSheet, TouchableOpacity, View } from 'react-native';
import DSText from '@/components/ui/ds-text';
import { LightColors } from '@/constants/Colors';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => (
  <View style={styles.center}>
    <View style={styles.header}>
      <DSText style={styles.title}>OVERWORLD</DSText>
      <DSText style={styles.tagline}>Location-triggered music player</DSText>
    </View>
    <View style={styles.card}>
      <View style={styles.featureRow}>
        <DSText style={styles.featureIcon}>🌍</DSText>
        <View style={styles.featureBody}>
          <DSText style={styles.featureName}>WiFi Mapping</DSText>
          <DSText style={styles.featureDesc}>
            A song plays automatically every time you join a mapped WiFi network.
          </DSText>
        </View>
      </View>
      <View style={[styles.featureRow, styles.featureRowLast]}>
        <DSText style={styles.featureIcon}>📡</DSText>
        <View style={styles.featureBody}>
          <DSText style={styles.featureName}>BT Encounters</DSText>
          <DSText style={styles.featureDesc}>
            A mapped song plays when a Bluetooth device is detected nearby. BT always overrides
            WiFi.
          </DSText>
        </View>
      </View>
    </View>
    <TouchableOpacity style={styles.btn} onPress={onNext} activeOpacity={0.8}>
      <DSText style={styles.btnText}>{"Let's Go →"}</DSText>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 34,
    color: LightColors.textPrimary,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 14,
    color: LightColors.textSecondary,
    marginTop: 6,
  },
  card: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: `${LightColors.primary}44`,
    marginBottom: 14,
  },
  featureRowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  featureIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  featureBody: {
    flex: 1,
  },
  featureName: {
    fontSize: 18,
    color: LightColors.textPrimary,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: LightColors.textSecondary,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: LightColors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 20,
    color: LightColors.textPrimary,
  },
});
