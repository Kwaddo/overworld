import { FontAwesome } from "@expo/vector-icons";
import { ComponentProps } from "react";

const TabBarIcon = (props: {
  name: ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) => {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
};

export default TabBarIcon;
