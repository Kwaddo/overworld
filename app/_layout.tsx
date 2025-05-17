import { WiFiSongMappingProvider } from "@/contexts/wifisongmaps.provider";
import { useColorScheme } from "@/lib/hooks/useColorScheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

const RootLayout = () => {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    NintendoDSBIOS: require("../assets/fonts/Nintendo-DS-BIOS.ttf"),
  });

  if (!loaded) {
    return null;
  }

  return (
    <WiFiSongMappingProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </WiFiSongMappingProvider>
  );
};

export default RootLayout;
