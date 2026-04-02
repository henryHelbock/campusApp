import React from 'react';
import { StyleSheet } from 'react-native';
import MapView from 'react-native-maps';
import { CAMPUS_CENTER, CAMPUS_DEFAULT_ZOOM } from '@campusapp/shared';

export default function CampusMap() {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: CAMPUS_CENTER.latitude,
        longitude: CAMPUS_CENTER.longitude,
        ...CAMPUS_DEFAULT_ZOOM,
      }}
      showsUserLocation
      showsCompass
      showsScale
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
