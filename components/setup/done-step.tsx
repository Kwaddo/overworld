import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import DSText from '@/components/ui/ds-text';
import { LightColors } from '@/constants/Colors';
import type { PermissionStatus } from './types';

interface DoneStepProps {
  locationStatus: PermissionStatus;
  bluetoothStatus: PermissionStatus;
  notificationStatus: PermissionStatus;
  onEnter: () => void;
}

const STATUS_ROWS: { label: string; key: keyof Omit<DoneStepProps, 'onEnter'> }[] = [
  { label: '📍 Location', key: 'locationStatus' },
  { label: '📡 Bluetooth', key: 'bluetoothStatus' },
  { label: '🔔 Notifications', key: 'notificationStatus' },
];

export const DoneStep = ({
  locationStatus,
  bluetoothStatus,
  notificationStatus,
  onEnter,
}: DoneStepProps) => {
  const statuses = { locationStatus, bluetoothStatus, notificationStatus };
  const anyDenied = Object.values(statuses).some((s) => s === 'denied');

  return (
    <View style={styles.center}>
      <View style={styles.card}>
        <DSText style={styles.icon}>🎮</DSText>
        <DSText style={styles.cardTitle}>All Set!</DSText>
        <DSText style={styles.cardDesc}>
          {
            "Here's a summary of your permissions. You can update these any time in device settings."
          }
        </DSText>
        <View style={styles.statusList}>
          {STATUS_ROWS.map(({ label, key }) => {
            const status = statuses[key];
            return (
              <View key={label} style={styles.statusRow}>
                <DSText style={styles.statusLabel}>{label}</DSText>
                <DSText
                  style={[
                    styles.statusValue,
                    status === 'granted' ? styles.statusGranted : styles.statusDenied,
                  ]}
                >
                  {status === 'granted' ? '✓' : '✗'}
                </DSText>
              </View>
            );
          })}
        </View>
        {anyDenied && (
          <TouchableOpacity style={styles.settingsLink} onPress={() => Linking.openSettings()}>
            <DSText style={styles.settingsLinkText}>Open App Settings →</DSText>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.btn} onPress={onEnter} activeOpacity={0.8}>
        <DSText style={styles.btnText}>Enter Overworld</DSText>
      </TouchableOpacity>
    </View>
  );
};

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
  statusList: {
    marginTop: 16,
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: `${LightColors.primary}33`,
  },
  statusLabel: {
    fontSize: 16,
    color: LightColors.textPrimary,
  },
  statusValue: {
    fontSize: 18,
  },
  statusGranted: {
    color: '#4caf50',
  },
  statusDenied: {
    color: LightColors.secondary,
  },
  settingsLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  settingsLinkText: {
    fontSize: 15,
    color: LightColors.secondary,
    textDecorationLine: 'underline',
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
