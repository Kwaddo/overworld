import DSText from "@/components/ui/ds-text";
import { PolkaDotBackground } from "@/components/ui/polka-dot-background";
import { LightColors } from "@/constants/Colors";
import { ScrollView, StyleSheet, View } from "react-native";

const InfoScreen = () => {
  return (
    <PolkaDotBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <DSText style={styles.title}>How to Use Overworld</DSText>

        <View style={styles.section}>
          <DSText style={styles.sectionTitle}>🌍 Overworld Tab</DSText>
          <DSText style={styles.description}>
            Associate songs with WiFi networks for automatic playback when you
            connect.
          </DSText>

          <View style={styles.stepContainer}>
            <DSText style={styles.stepNumber}>1.</DSText>
            <DSText style={styles.stepText}>Connect to any WiFi network</DSText>
          </View>

          <View style={styles.stepContainer}>
            <DSText style={styles.stepNumber}>2.</DSText>
            <DSText style={styles.stepText}>
              Tap &quot;Map Song to This Network&quot;
            </DSText>
          </View>

          <View style={styles.stepContainer}>
            <DSText style={styles.stepNumber}>3.</DSText>
            <DSText style={styles.stepText}>
              Choose an audio file from your device
            </DSText>
          </View>

          <View style={styles.stepContainer}>
            <DSText style={styles.stepNumber}>4.</DSText>
            <DSText style={styles.stepText}>
              Your song will now play automatically when you connect to this
              network
            </DSText>
          </View>
        </View>

        <View style={styles.section}>
          <DSText style={styles.sectionTitle}>📱 Encounters Tab</DSText>
          <DSText style={styles.description}>
            Map songs to nearby phones and devices via Bluetooth for automatic
            playback when they&apos;re detected.
          </DSText>

          <View style={styles.stepContainer}>
            <DSText style={styles.stepNumber}>1.</DSText>
            <DSText style={styles.stepText}>
              Make sure Bluetooth is enabled on your device
            </DSText>
          </View>

          <View style={styles.stepContainer}>
            <DSText style={styles.stepNumber}>2.</DSText>
            <DSText style={styles.stepText}>
              The app automatically scans for nearby devices within 5m
            </DSText>
          </View>

          <View style={styles.stepContainer}>
            <DSText style={styles.stepNumber}>3.</DSText>
            <DSText style={styles.stepText}>
              Tap &quot;Add Song&quot; next to any detected device
            </DSText>
          </View>

          <View style={styles.stepContainer}>
            <DSText style={styles.stepNumber}>4.</DSText>
            <DSText style={styles.stepText}>
              Choose an audio file to associate with that device
            </DSText>
          </View>

          <View style={styles.stepContainer}>
            <DSText style={styles.stepNumber}>5.</DSText>
            <DSText style={styles.stepText}>
              The song will play automatically when the device is nearby
            </DSText>
          </View>
        </View>

        <View style={styles.section}>
          <DSText style={styles.sectionTitle}>💡 Tips</DSText>

          <View style={styles.tipContainer}>
            <DSText style={styles.tipText}>
              The best way to discover a device is to pair with it first
            </DSText>
          </View>

          <View style={styles.tipContainer}>
            <DSText style={styles.tipText}>
              Grant location and Bluetooth permissions for best experience
            </DSText>
          </View>

          <View style={styles.tipContainer}>
            <DSText style={styles.tipText}>
              Keep the app running in background for automatic playback
            </DSText>
          </View>

          <View style={styles.tipContainer}>
            <DSText style={styles.tipText}>
              Use shorter audio files to avoid interruption when switching
              locations
            </DSText>
          </View>
        </View>
      </ScrollView>
    </PolkaDotBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
  },
  title: {
    fontSize: 32,
    color: LightColors.textPrimary,
    textAlign: "center",
    marginBottom: 24,
  },
  section: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    color: LightColors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: LightColors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 18,
    color: LightColors.primary,
    fontWeight: "600",
    width: 24,
  },
  stepText: {
    fontSize: 16,
    color: LightColors.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  featureContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  featureBullet: {
    fontSize: 18,
    color: LightColors.primary,
    width: 20,
  },
  featureText: {
    fontSize: 16,
    color: LightColors.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  bold: {
    fontWeight: "600",
    color: LightColors.primary,
  },
  tipContainer: {
    backgroundColor: LightColors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: LightColors.primary,
  },
  tipText: {
    fontSize: 14,
    color: LightColors.textSecondary,
    lineHeight: 20,
  },
});

export default InfoScreen;
