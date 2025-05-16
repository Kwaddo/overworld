import {
  WiFiSongMappingProvider,
  useWifiSongMapping,
} from "@/contexts/wifisongmaps.provider";
import { useColorScheme } from "@/lib/hooks/useColorScheme";
import { registerBackgroundTask } from "@/lib/utils/background";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import "react-native-reanimated";

const WifiSongChecker = () => {
  const { playSongForCurrentWifi } = useWifiSongMapping();
  const intervalRef = useRef<number | null>(null);
  const initialCheckDoneRef = useRef(false);

  useEffect(() => {
    const initialCheckTimer = setTimeout(() => {
      playSongForCurrentWifi();
      initialCheckDoneRef.current = true;
    }, 1000);

    intervalRef.current = setInterval(() => {
      if (initialCheckDoneRef.current) {
        playSongForCurrentWifi();
      }
    }, 5000);

    return () => {
      clearTimeout(initialCheckTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playSongForCurrentWifi]);

  return null;
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    const setupBackgroundTask = async () => {
      await registerBackgroundTask();
    };

    setupBackgroundTask();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <WiFiSongMappingProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <WifiSongChecker />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </WiFiSongMappingProvider>
  );
}
