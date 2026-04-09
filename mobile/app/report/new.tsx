import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { useRouter } from 'expo-router';
import {
  CAMPUS_CENTER,
  CAMPUS_DEFAULT_ZOOM,
  ISSUE_CATEGORIES,
  SEVERITY_LEVELS,
  SEVERITY_COLORS,
  isWithinCampus,
} from '@campusapp/shared';
import type { IssueCategory, IssueSeverity } from '@campusapp/shared';
import { issuesApi } from '../../src/services/api';

export default function NewReportScreen() {
  const router = useRouter();
  const [category,    setCategory]    = useState<IssueCategory | null>(null);
  const [severity,    setSeverity]    = useState<IssueSeverity | null>(null);
  const [description, setDescription] = useState('');
  const [location,    setLocation]    = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    if (!isWithinCampus(latitude, longitude)) {
      Alert.alert('Out of bounds', 'Please select a location within the SUNY Oneonta campus.');
      return;
    }
    setLocation({ latitude, longitude });
  };

  const handleSubmit = async () => {
    setError('');
    if (!category)            return setError('Please select a category.');
    if (!severity)            return setError('Please select a severity level.');
    if (!description.trim())  return setError('Please add a description.');
    if (!location)            return setError('Please tap the map to set a location.');

    setLoading(true);
    try {
      await issuesApi.create({
        category,
        severity,
        description: description.trim(),
        latitude:  location.latitude,
        longitude: location.longitude,
      });
      Alert.alert('Submitted', 'Your report has been added to the map.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      setError(err.message ?? 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Category */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Category <Text style={styles.required}>*</Text></Text>
        <View style={styles.chipGrid}>
          {ISSUE_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Severity */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Severity <Text style={styles.required}>*</Text></Text>
        <View style={styles.severityGrid}>
          {SEVERITY_LEVELS.map(sev => (
            <TouchableOpacity
              key={sev}
              style={[
                styles.sevBtn,
                severity === sev && { backgroundColor: SEVERITY_COLORS[sev], borderColor: SEVERITY_COLORS[sev] }
              ]}
              onPress={() => setSeverity(sev)}
            >
              <Text style={[styles.sevText, severity === sev && styles.sevTextActive]}>{sev}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Description <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.textarea}
          placeholder="Describe the issue..."
          placeholderTextColor="#aaa"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Location <Text style={styles.required}>*</Text></Text>
        <Text style={styles.hint}>Tap the map to pin the issue location</Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.miniMap}
            initialRegion={{ ...CAMPUS_CENTER, ...CAMPUS_DEFAULT_ZOOM }}
            onPress={handleMapPress}
          >
            {location && (
              <Marker coordinate={location} pinColor="#1A5276" />
            )}
          </MapView>
        </View>
        {location && (
          <Text style={styles.coordText}>
            📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Submit report</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#fff' },
  section:         { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  sectionLabel:    { fontSize: 11, fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  required:        { color: '#E74C3C' },
  chipGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  chipActive:      { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  chipText:        { fontSize: 12, color: '#555' },
  chipTextActive:  { color: '#fff' },
  severityGrid:    { flexDirection: 'row', gap: 8 },
  sevBtn:          { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  sevText:         { fontSize: 12, color: '#555' },
  sevTextActive:   { color: '#fff', fontWeight: '600' },
  textarea:        { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 13, color: '#333', minHeight: 80, textAlignVertical: 'top' },
  charCount:       { fontSize: 10, color: '#bbb', textAlign: 'right', marginTop: 3 },
  hint:            { fontSize: 12, color: '#888', marginBottom: 8 },
  mapContainer:    { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  miniMap:         { height: 180 },
  coordText:       { fontSize: 11, color: '#1A5276', marginTop: 6 },
  errorBox:        { marginHorizontal: 16, marginTop: 8, backgroundColor: '#FDEDEC', borderWidth: 1, borderColor: '#E74C3C', borderRadius: 8, padding: 10 },
  errorText:       { fontSize: 12, color: '#922B21' },
  submitBtn:       { margin: 16, backgroundColor: '#1A5276', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#aaa' },
  submitText:      { color: '#fff', fontSize: 15, fontWeight: '600' },
});