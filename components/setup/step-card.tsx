import { StyleSheet, TouchableOpacity, View } from 'react-native';
import DSText from '@/components/ui/ds-text';
import { LightColors } from '@/constants/Colors';
import type { PermissionStatus } from './types';

const StatusBadge = ({ status }: { status: PermissionStatus }) => {
  if (status === 'pending') return null;
  return (
    <View style={[styles.badge, status === 'granted' ? styles.badgeGranted : styles.badgeDenied]}>
      <DSText style={styles.badgeText}>{status === 'granted' ? '✓ Granted' : '✗ Denied'}</DSText>
    </View>
  );
};

interface StepCardProps {
  icon: string;
  title: string;
  description: string;
  status: PermissionStatus;
  ctaLabel: string;
  onCta: () => void;
}

export const StepCard = ({ icon, title, description, status, ctaLabel, onCta }: StepCardProps) => (
  <View style={styles.center}>
    <View style={styles.card}>
      <DSText style={styles.icon}>{icon}</DSText>
      <DSText style={styles.cardTitle}>{title}</DSText>
      <DSText style={styles.cardDesc}>{description}</DSText>
      <StatusBadge status={status} />
    </View>
    <TouchableOpacity style={styles.btn} onPress={onCta} activeOpacity={0.8}>
      <DSText style={styles.btnText}>{ctaLabel}</DSText>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 26,
    color: LightColors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  cardDesc: {
    fontSize: 15,
    color: LightColors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  badge: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeGranted: {
    backgroundColor: '#4caf50',
  },
  badgeDenied: {
    backgroundColor: LightColors.secondary,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
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
