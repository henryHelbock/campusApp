/**
 * SUNY Oneonta campus geographic boundaries and center point.
 * Used for map initialization and coordinate validation.
 */
export const CAMPUS_CENTER = {
  latitude: 42.4690,
  longitude: -75.0629,
};

export const CAMPUS_BOUNDS = {
  north: 42.4750,
  south: 42.4630,
  east: -75.0550,
  west: -75.0730,
};

export const CAMPUS_DEFAULT_ZOOM = {
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

export function isWithinCampus(latitude: number, longitude: number): boolean {
  return (
    latitude >= CAMPUS_BOUNDS.south &&
    latitude <= CAMPUS_BOUNDS.north &&
    longitude >= CAMPUS_BOUNDS.west &&
    longitude <= CAMPUS_BOUNDS.east
  );
}
