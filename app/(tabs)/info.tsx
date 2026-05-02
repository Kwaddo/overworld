import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import DSText from '@/components/ui/ds-text';
import { PolkaDotBackground } from '@/components/ui/polka-dot-background';
import { LightColors } from '@/constants/Colors';
import { useBtStore } from '@/lib/stores/bt-store';
import { useWifiStore } from '@/lib/stores/wifi-store';
import { exportMappings, importMappings } from '@/lib/utils/backup';

const TIPS = [
  'Pair your Bluetooth device first for reliable detection',
  'Keep the app running in the background for automatic playback',
  'Use shorter audio files to avoid interruption when switching networks',
  'BT mappings always override WiFi when a device is nearby',
];

const InfoScreen = () => {
  const loadWifi = useWifiStore((s) => s.loadMappings);
  const loadBt = useBtStore((s) => s.loadMappings);

  const handleExport = async () => {
    const ok = await exportMappings();
    if (!ok) Alert.alert('Export failed', 'Could not share the backup file.');
  };

  const handleImport = async () => {
    const result = await importMappings();
    if (!result) {
      Alert.alert('Import failed', 'Could not read the backup file.');
      return;
    }
    await Promise.all([loadWifi(), loadBt()]);
    Alert.alert(
      'Import successful',
      `Restored ${result.wifi} WiFi mapping(s) and ${result.bluetooth} Bluetooth mapping(s).`,
    );
  };

  return (
    <PolkaDotBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <DSText style={styles.appName}>OVERWORLD</DSText>
          <DSText style={styles.tagline}>Location-triggered music player</DSText>
        </View>

        <View style={styles.card}>
          <DSText style={styles.cardTitle}>Backup & Restore</DSText>
          <DSText style={styles.cardDesc}>
            Save your WiFi and Bluetooth mappings to a file, or restore from a previous backup.
          </DSText>
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnExport]} onPress={handleExport}>
              <DSText style={styles.btnText}>↑ Export</DSText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnImport]} onPress={handleImport}>
              <DSText style={styles.btnText}>↓ Import</DSText>
            </TouchableOpacity>
          </View>
        </View>

        <DSText style={styles.groupLabel}>HOW IT WORKS</DSText>

        <View style={styles.featureCard}>
          <DSText style={styles.featureIcon}>🌍</DSText>
          <View style={styles.featureBody}>
            <DSText style={styles.featureName}>WiFi Mappings</DSText>
            <DSText style={styles.featureDesc}>
              Connect to a network, tap &quot;Map Song to This Network&quot;, and pick an audio
              file. That song plays automatically every time you join that network.
            </DSText>
          </View>
        </View>

        <View style={styles.featureCard}>
          <DSText style={styles.featureIcon}>📱</DSText>
          <View style={styles.featureBody}>
            <DSText style={styles.featureName}>BT Encounters</DSText>
            <DSText style={styles.featureDesc}>
              The app scans for nearby BLE devices and plays their mapped song when detected.
              Bluetooth always takes priority over WiFi.
            </DSText>
          </View>
        </View>

        <View style={[styles.featureCard, styles.noticeCard]}>
          <DSText style={styles.featureIcon}>📍</DSText>
          <View style={styles.featureBody}>
            <DSText style={styles.featureName}>Location Required</DSText>
            <DSText style={styles.featureDesc}>
              Android needs location access to read your WiFi network name and scan for Bluetooth
              devices. If auto-play stops, check that location is on and permission is granted.
            </DSText>
          </View>
        </View>

        <DSText style={styles.groupLabel}>TIPS</DSText>

        <View style={styles.card}>
          {TIPS.map((tip, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static list, no reorder
            <View key={i} style={[styles.tipRow, i < TIPS.length - 1 && styles.tipDivider]}>
              <DSText style={styles.tipBullet}>▸</DSText>
              <DSText style={styles.tipText}>{tip}</DSText>
            </View>
          ))}
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </PolkaDotBackground>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  appName: {
    fontSize: 34,
    color: LightColors.textPrimary,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 14,
    color: LightColors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 22,
    color: LightColors.textPrimary,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 15,
    color: LightColors.textSecondary,
    lineHeight: 22,
    marginBottom: 14,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnExport: {
    backgroundColor: LightColors.primary,
  },
  btnImport: {
    backgroundColor: LightColors.tertiary,
  },
  btnText: {
    color: '#000',
    fontSize: 18,
  },
  groupLabel: {
    fontSize: 12,
    color: LightColors.textSecondary,
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 4,
    paddingLeft: 4,
  },
  featureCard: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  noticeCard: {
    borderLeftWidth: 4,
    borderLeftColor: LightColors.secondary,
  },
  featureIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  featureBody: {
    flex: 1,
  },
  featureName: {
    fontSize: 20,
    color: LightColors.textPrimary,
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 15,
    color: LightColors.textSecondary,
    lineHeight: 22,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 10,
  },
  tipDivider: {
    borderBottomWidth: 1,
    borderBottomColor: `${LightColors.primary}44`,
  },
  tipBullet: {
    fontSize: 16,
    color: LightColors.primary,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: LightColors.textPrimary,
    lineHeight: 22,
  },
  footer: {
    height: 16,
  },
});

export default InfoScreen;
