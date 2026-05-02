import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationWarningBanner } from '@/components/ui/location-warning-banner';
import { NowPlayingBar } from '@/components/ui/now-playing-bar';
import TabBarIcon from '@/components/ui/tabbar-icon';
import { LightColors } from '@/constants/Colors';
import { useWifiStore } from '@/lib/stores/wifi-store';
import { getCurrentlyPlaying } from '@/lib/utils/controls';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const locationBlocked = useWifiStore((s) => s.locationBlocked);
  const [isPlaying, setIsPlaying] = useState(() => getCurrentlyPlaying().isPlaying);

  useEffect(() => {
    const id = setInterval(() => setIsPlaying(getCurrentlyPlaying().isPlaying), 1000);
    return () => clearInterval(id);
  }, []);

  // When a banner is visible above the tab header it already consumes the safe area,
  // so suppress the header's built-in status-bar height to avoid a double forehead.
  const headerStatusBarHeight = isPlaying || locationBlocked ? 0 : insets.top;

  return (
    <View style={{ flex: 1 }}>
      <NowPlayingBar />
      <LocationWarningBanner />
      <Tabs
        screenOptions={{
          headerStatusBarHeight,
          tabBarActiveTintColor: LightColors.primary,
          tabBarInactiveTintColor: LightColors.background,
          tabBarStyle: {
            backgroundColor: '#1e1e2e',
          },
          tabBarLabelStyle: {
            fontFamily: 'NintendoDSBIOS',
            fontSize: 12,
          },
          headerStyle: {
            backgroundColor: '#1e1e2e',
          },
          headerTintColor: '#cdd6f4',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Overworld',
            headerTitleAlign: 'center',
            headerTitleStyle: {
              fontFamily: 'NintendoDSBIOS',
              fontSize: 28,
              color: LightColors.background,
            },
            tabBarIcon: ({ color }) => <TabBarIcon name="globe" color={color} />,
          }}
        />
        <Tabs.Screen
          name="encounters"
          options={{
            title: 'Encounters',
            headerTitleAlign: 'center',
            headerTitleStyle: {
              fontFamily: 'NintendoDSBIOS',
              fontSize: 28,
              color: LightColors.background,
            },
            tabBarIcon: ({ color }) => <TabBarIcon name="exclamation" color={color} />,
          }}
        />
        <Tabs.Screen
          name="info"
          options={{
            title: 'Info',
            headerTitleAlign: 'center',
            headerTitleStyle: {
              fontFamily: 'NintendoDSBIOS',
              fontSize: 28,
              color: LightColors.background,
            },
            tabBarIcon: ({ color }) => <TabBarIcon name="info" color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
