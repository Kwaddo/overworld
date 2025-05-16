import { StyleSheet, Text, View } from "react-native";

const History = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Coming soon!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181825",
    padding: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#cdd6f4",
    marginBottom: 16,
    textAlign: "center",
  },
});

export default History;
