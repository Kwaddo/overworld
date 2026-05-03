import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useColorScheme } from '@/lib/hooks/useColorScheme';
import { useInitStores } from '@/lib/hooks/useInitStores';
import { stopSound } from '@/lib/utils/controls';
import { STOP_ACTION_ID } from '@/lib/utils/notifications';
// Must be imported at module level so TaskManager.defineTask runs before any background
// task fires (including when the OS launches the app headlessly to run the task).
import '@/lib/tasks/background-wifi';
import 'react-native-reanimated';

// Registered at module level so the Stop button works even when no component is mounted.
Notifications.addNotificationResponseReceivedListener((response) => {
  if (response.actionIdentifier === STOP_ACTION_ID) {
    stopSound();
  }
});

const StoreInitializer = () => {
  useInitStores();
  return null;
};

const RootLayout = () => {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    NintendoDSBIOS: require('../assets/fonts/Nintendo-DS-BIOS.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StoreInitializer />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
