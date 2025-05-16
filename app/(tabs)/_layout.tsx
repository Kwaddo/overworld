import TabBarIcon from "@/components/ui/tabbar-icon";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/lib/hooks/useColorScheme";
import { Tabs } from "expo-router";

export default function TabLayout() {
  const colorScheme = useColorScheme();

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
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="question" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
