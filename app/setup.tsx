import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  type Permission,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { DoneStep } from '@/components/setup/done-step';
import { ProgressDots } from '@/components/setup/progress-dots';
import { StepCard } from '@/components/setup/step-card';
import type { PermissionStatus } from '@/components/setup/types';
import { WelcomeStep } from '@/components/setup/welcome-step';
import { PolkaDotBackground } from '@/components/ui/polka-dot-background';
import { useFirstLaunch } from '@/lib/hooks/useFirstLaunch';

type PermissionKey = 'location' | 'bluetooth' | 'notifications';
type Statuses = Record<PermissionKey, PermissionStatus>;

const requestAndroid = async (perms: Permission[]): Promise<boolean> => {
  const results = await PermissionsAndroid.requestMultiple(perms);
  return perms.every(
    (p) => results[p as keyof typeof results] === PermissionsAndroid.RESULTS.GRANTED,
  );
};

const SetupScreen = () => {
  const router = useRouter();
  const { markComplete } = useFirstLaunch();
  const [step, setStep] = useState(0);
  const [statuses, setStatuses] = useState<Statuses>({
    location: 'pending',
    bluetooth: 'pending',
    notifications: 'pending',
  });

  const advance = () => setStep((s) => s + 1);
  const setStatus = (key: PermissionKey, status: PermissionStatus) =>
    setStatuses((prev) => ({ ...prev, [key]: status }));

  const requestLocation = async () => {
    if (Platform.OS !== 'android') {
      setStatus('location', 'granted');
      advance();
      return;
    }
    const perms = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ...(Platform.Version >= 33 ? [PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES] : []),
    ];
    setStatus('location', (await requestAndroid(perms)) ? 'granted' : 'denied');
    advance();
  };

  const requestBluetooth = async () => {
    if (Platform.OS !== 'android') {
      setStatus('bluetooth', 'granted');
      advance();
      return;
    }
    const perms = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ];
    setStatus('bluetooth', (await requestAndroid(perms)) ? 'granted' : 'denied');
    advance();
  };

  const requestNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setStatus('notifications', status === 'granted' ? 'granted' : 'denied');
    advance();
  };

  const handleEnter = async () => {
    await markComplete();
    router.replace('/(tabs)');
  };

  return (
    <PolkaDotBackground>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        <ProgressDots current={step} />

        {step === 0 && <WelcomeStep onNext={advance} />}

        {step === 1 && (
          <StepCard
            icon="📍"
            title="Location Access"
            description="Android requires location permission to read your current WiFi network name and to scan for nearby Bluetooth devices. Without it, auto-play won't work."
            status={statuses.location}
            ctaLabel={statuses.location === 'pending' ? 'Grant Location' : 'Continue Anyway'}
            onCta={statuses.location === 'pending' ? requestLocation : advance}
          />
        )}

        {step === 2 && (
          <StepCard
            icon="📡"
            title="Bluetooth Access"
            description="Overworld scans for nearby BLE devices and triggers mapped songs when one is detected. Bluetooth Scan and Connect permissions are required."
            status={statuses.bluetooth}
            ctaLabel={statuses.bluetooth === 'pending' ? 'Grant Bluetooth' : 'Continue Anyway'}
            onCta={statuses.bluetooth === 'pending' ? requestBluetooth : advance}
          />
        )}

        {step === 3 && (
          <StepCard
            icon="🔔"
            title="Notifications"
            description="Overworld shows a playback notification with a Stop button while a song is playing. This requires notification permission."
            status={statuses.notifications}
            ctaLabel={
              statuses.notifications === 'pending' ? 'Grant Notifications' : 'Continue Anyway'
            }
            onCta={statuses.notifications === 'pending' ? requestNotifications : advance}
          />
        )}

        {step === 4 && (
          <DoneStep
            locationStatus={statuses.location}
            bluetoothStatus={statuses.bluetooth}
            notificationStatus={statuses.notifications}
            onEnter={handleEnter}
          />
        )}
      </ScrollView>
    </PolkaDotBackground>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
});

export default SetupScreen;
