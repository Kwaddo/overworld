import TabBarIcon from "@/components/ui/tabbar-icon";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/lib/hooks/useColorScheme";
import { FontAwesome } from "@expo/vector-icons";
import { Tabs, useNavigation } from "expo-router";
import { Pressable } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarStyle: {
          backgroundColor: "#1e1e2e",
        },
        headerStyle: {
          backgroundColor: "#1e1e2e",
        },
        headerTintColor: "#cdd6f4",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "World",
          tabBarIcon: ({ color }) => <TabBarIcon name="globe" color={color} />,
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate("modal" as never)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.5 : 1,
                marginRight: 15,
              })}
            >
              <FontAwesome
                name="info-circle"
                size={22}
                color={Colors[colorScheme ?? "light"].text}
              />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="encounters"
        options={{
          title: "Encounters",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="exclamation" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
