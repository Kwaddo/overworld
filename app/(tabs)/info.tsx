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
          <DSText style={styles.title}>OVERWORLD</DSText>
          <DSText style={styles.subtitle}>Location-triggered music player</DSText>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <DSText style={styles.sectionTitle}>Backup & Restore</DSText>
          </View>
          <View style={styles.card}>
            <DSText style={styles.cardDesc}>
              Save your WiFi and Bluetooth mappings to a file, or restore from a previous backup.
            </DSText>
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, styles.btnExport]} onPress={handleExport}>
                <DSText style={styles.btnText}>Export</DSText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnImport]} onPress={handleImport}>
                <DSText style={styles.btnText}>Import</DSText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <DSText style={styles.sectionTitle}>How it works</DSText>
          </View>

          <View style={styles.card}>
            <DSText style={styles.cardTitle}>WiFi Mappings</DSText>
            <DSText style={styles.cardBody}>
              Connect to a network, tap "Map Song to This Network", and pick an audio file. That
              song plays automatically every time you join that network.
            </DSText>
          </View>

          <View style={styles.card}>
            <DSText style={styles.cardTitle}>BT Encounters</DSText>
            <DSText style={styles.cardBody}>
              The app scans for nearby BLE devices and plays their mapped song when detected.
              Bluetooth always takes priority over WiFi.
            </DSText>
          </View>

          <View style={[styles.card, styles.noticeCard]}>
            <View style={styles.noticeHeader}>
              <DSText style={styles.noticeTag}>Important</DSText>
              <DSText style={styles.cardTitle}>Location Required</DSText>
            </View>
            <DSText style={styles.cardBody}>
              Android needs location access to read your WiFi network name and scan for Bluetooth
              devices. If auto-play stops, check that location is on and permission is granted.
            </DSText>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <DSText style={styles.sectionTitle}>Tips</DSText>
          </View>

          <View style={styles.card}>
            {TIPS.map((tip, i) => (
              <View key={tip} style={[styles.tipRow, i < TIPS.length - 1 && styles.tipDivider]}>
                <DSText style={styles.tipBullet}>▸</DSText>
                <DSText style={styles.tipText}>{tip}</DSText>
              </View>
            ))}
          </View>
        </View>
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    color: LightColors.textPrimary,
    letterSpacing: 3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: LightColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingLeft: 2,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LightColors.primary,
  },
  sectionTitle: {
    fontSize: 22,
    color: LightColors.textPrimary,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LightColors.cardBorder,
    borderTopWidth: 2,
    borderTopColor: LightColors.cardHighlight,
    shadowColor: LightColors.cardShadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 7,
  },
  noticeCard: {
    borderTopColor: LightColors.secondary,
  },
  cardTitle: {
    fontSize: 20,
    color: LightColors.textPrimary,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 16,
    color: LightColors.textSecondary,
    lineHeight: 22,
    marginBottom: 14,
  },
  cardBody: {
    fontSize: 16,
    color: LightColors.textSecondary,
    lineHeight: 22,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  noticeTag: {
    backgroundColor: LightColors.secondary,
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 245, 200, 0.5)',
    shadowColor: LightColors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  btnExport: {
    backgroundColor: LightColors.primary,
  },
  btnImport: {
    backgroundColor: LightColors.tertiary,
  },
  btnText: {
    color: LightColors.textLight,
    fontSize: 18,
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
    fontSize: 16,
    color: LightColors.textPrimary,
    lineHeight: 22,
  },
});

export default InfoScreen;
