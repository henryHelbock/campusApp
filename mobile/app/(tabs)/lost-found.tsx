import { StyleSheet, View, Text } from 'react-native';

export default function LostFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lost & Found</Text>
      <Text style={styles.subtitle}>Report lost items or browse found items</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
