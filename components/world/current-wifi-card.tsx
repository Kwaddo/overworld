import type { FC } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LightColors } from '@/constants/Colors';
import { DocumentPickerAdapter } from '@/lib/hooks/useDocumentPicker';
import { useWifiStore } from '@/lib/stores/wifi-store';
import { logger } from '@/lib/utils/logger';
import DSText from '../ui/ds-text';

interface CurrentWifiCardProps {
  ssid: string;
  bssid: string | null;
}

const CurrentWifiCard: FC<CurrentWifiCardProps> = ({ ssid, bssid }) => {
  const saveMapping = useWifiStore((s) => s.saveMapping);
  const addMapping = async () => {
    try {
      if (!ssid) {
        Alert.alert('Not Connected', 'You must be connected to a WiFi network to create a mapping');
        return;
      }

      const file = await DocumentPickerAdapter.getDocument();

      const wifibssid = bssid || `ssid:${ssid}`;

      if (!file) {
        Alert.alert('Error', 'No file selected');
        return;
      }

      const success = await saveMapping(wifibssid, ssid, file.uri, file.name);

      if (success) {
        Alert.alert('Success', `Successfully mapped "${ssid}" to "${file.name}"`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add mapping');
      logger.error('WiFiCard', 'Failed to add mapping', error);
    }
  };

  return (
    <View style={styles.currentWifiCard}>
      <DSText style={styles.label}>Current WiFi:</DSText>
      <DSText style={styles.wifiName}>{ssid || 'Not connected'}</DSText>
      <TouchableOpacity style={styles.button} onPress={addMapping}>
        <DSText style={styles.buttonText}>Map Song to This Network</DSText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  currentWifiCard: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 10,
    padding: 16,
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
  label: {
    fontSize: 22,
    color: LightColors.textSecondary,
  },
  wifiName: {
    fontSize: 34,
    color: LightColors.textPrimary,
    marginVertical: 8,
  },
  button: {
    backgroundColor: LightColors.primary,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 245, 200, 0.5)',
    shadowColor: LightColors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: LightColors.textLight,
    fontSize: 22,
  },
});

export default CurrentWifiCard;
