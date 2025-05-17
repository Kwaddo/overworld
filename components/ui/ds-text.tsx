import { StyleSheet, Text, TextProps } from "react-native";

const AppText = (props: TextProps) => {
  return <Text {...props} style={[styles.text, props.style]} />;
};

const styles = StyleSheet.create({
  text: {
    fontFamily: "NintendoDSBIOS",
  },
});

export default AppText;
