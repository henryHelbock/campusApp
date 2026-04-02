import { StyleSheet, View } from 'react-native';
import CampusMap from '@/src/components/map/CampusMap';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <CampusMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
