import TabBarIcon from "@/components/ui/tabbar-icon";
import { LightColors } from "@/constants/Colors";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: LightColors.primary,
        tabBarInactiveTintColor: LightColors.background,
        tabBarStyle: {
          backgroundColor: "#1e1e2e",
        },
        tabBarLabelStyle: {
          fontFamily: "NintendoDSBIOS",
          fontSize: 12,
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
          title: "Overworld",
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontFamily: "NintendoDSBIOS",
            fontSize: 28,
            color: LightColors.background,
          },
          tabBarIcon: ({ color }) => <TabBarIcon name="globe" color={color} />,
        }}
      />
      <Tabs.Screen
        name="encounters"
        options={{
          title: "Encounters",
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontFamily: "NintendoDSBIOS",
            fontSize: 28,
            color: LightColors.background,
          },
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="exclamation" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: "Info",
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontFamily: "NintendoDSBIOS",
            fontSize: 28,
            color: LightColors.background,
          },
          tabBarIcon: ({ color }) => <TabBarIcon name="info" color={color} />,
        }}
      />
    </Tabs>
  );
}
