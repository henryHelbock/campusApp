import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import MapView, { Circle, Marker, Region } from 'react-native-maps';
import {
  CAMPUS_CENTER, CAMPUS_DEFAULT_ZOOM, CAMPUS_BOUNDS,
  ISSUE_CATEGORIES, SEVERITY_COLORS, SEVERITY_LEVELS,
} from '@campusapp/shared';
import type { Issue, IssueCategory } from '@campusapp/shared';
import { useCampusMapData } from '../../hooks/useCampusMapData';

const bubbleRadius = (count: number) => 20 + count * 8;

type FilterState = { category: IssueCategory | 'All' };

export default function CampusMap() {
  const { issues, lostItems, loading, fetchError, onManualRefresh } = useCampusMapData();
  const [filters,       setFilters]       = useState<FilterState>({ category: 'All' });
  const [showHeatmap,   setShowHeatmap]   = useState(true);
  const [showLostFound, setShowLostFound] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const mapRegion: Region = {
    latitude:  CAMPUS_CENTER.latitude,
    longitude: CAMPUS_CENTER.longitude,
    ...CAMPUS_DEFAULT_ZOOM,
  };

  const filteredIssues = useMemo(
    () => issues.filter(issue =>
      issue.status === 'active' &&
      (filters.category === 'All' || issue.category === filters.category)
    ),
    [issues, filters.category]
  );

  const activeLostItems = useMemo(
    () => lostItems.filter(i => i.status === 'active' && i.latitude != null && i.longitude != null),
    [lostItems]
  );

  useEffect(() => {
    if (selectedIssue && !filteredIssues.some(i => i.id === selectedIssue.id)) {
      setSelectedIssue(null);
    }
  }, [filteredIssues, selectedIssue]);

  return (
    <View style={styles.container}>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['All', ...ISSUE_CATEGORIES] as (IssueCategory | 'All')[]).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, filters.category === cat && styles.chipActive]}
              onPress={() => setFilters(f => ({ ...f, category: cat }))}
            >
              <Text style={[styles.chipText, filters.category === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation
        showsCompass
        showsScale
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          const tapped = filteredIssues.find(issue =>
            Math.abs(issue.latitude - latitude) < 0.0005 &&
            Math.abs(issue.longitude - longitude) < 0.0005
          );
          setSelectedIssue(tapped ?? null);
        }}
      >
        {showHeatmap && filteredIssues.map(issue => (
          <Circle
            key={`issue-${issue.id}`}
            center={{ latitude: issue.latitude, longitude: issue.longitude }}
            radius={bubbleRadius(issue.reportCount)}
            fillColor={SEVERITY_COLORS[issue.severity] + 'AA'}
            strokeColor={SEVERITY_COLORS[issue.severity]}
            strokeWidth={1.5}
          />
        ))}

        {showLostFound && activeLostItems.map(item => (
          <Marker
            key={`lost-${item.id}`}
            coordinate={{ latitude: item.latitude!, longitude: item.longitude! }}
            pinColor="#3498DB"
            title={item.title}
            description={item.description}
          />
        ))}
      </MapView>

      {/* Toggle controls */}
      <View style={styles.toggleRow}>
        <TouchableOpacity style={[styles.toggleBtn, showHeatmap && styles.toggleBtnActive]} onPress={() => setShowHeatmap(v => !v)}>
          <Text style={[styles.toggleText, showHeatmap && styles.toggleTextActive]}>Heatmap</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, showLostFound && styles.toggleBtnActive]} onPress={() => setShowLostFound(v => !v)}>
          <Text style={[styles.toggleText, showLostFound && styles.toggleTextActive]}>Lost & Found</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshBtn} onPress={onManualRefresh}>
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      {fetchError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{fetchError}</Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend</Text>
        {SEVERITY_LEVELS.map(sev => (
          <View key={sev} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: SEVERITY_COLORS[sev] }]} />
            <Text style={styles.legendText}>{sev}</Text>
          </View>
        ))}
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#3498DB' }]} />
          <Text style={styles.legendText}>Lost item</Text>
        </View>
      </View>

      {/* Issue detail popup */}
      {selectedIssue && (
        <View style={[styles.popup, { borderLeftColor: SEVERITY_COLORS[selectedIssue.severity] }]}>
          <View style={styles.popupHeader}>
            <Text style={styles.popupTitle}>{selectedIssue.category}</Text>
            <TouchableOpacity onPress={() => setSelectedIssue(null)}>
              <Text style={styles.popupClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.popupSeverityRow}>
            <View style={[styles.popupSeverityDot, { backgroundColor: SEVERITY_COLORS[selectedIssue.severity] }]} />
            <Text style={[styles.popupSeverityText, { color: SEVERITY_COLORS[selectedIssue.severity] }]}>{selectedIssue.severity}</Text>
          </View>
          <Text style={styles.popupDesc}>{selectedIssue.description}</Text>
          <Text style={styles.popupMeta}>{selectedIssue.reportCount} report{selectedIssue.reportCount !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1A5276" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  map:                { flex: 1 },
  filterBar:          { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterScroll:       { paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexDirection: 'row', alignItems: 'center' },
  chip:               { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f8f9fa' },
  chipActive:         { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  chipText:           { fontSize: 12, color: '#555' },
  chipTextActive:     { color: '#fff', fontWeight: '600' },
  toggleRow:          { position: 'absolute', top: 60, left: 10, flexDirection: 'row', gap: 6 },
  toggleBtn:          { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#ddd', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  toggleBtnActive:    { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  toggleText:         { fontSize: 12, color: '#555', fontWeight: '500' },
  toggleTextActive:   { color: '#fff', fontWeight: '600' },
  refreshBtn:         { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#ddd', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  refreshText:        { fontSize: 16, color: '#1A5276' },
  legend:             { position: 'absolute', bottom: 80, left: 10, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  legendTitle:        { fontSize: 10, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  legendRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendDot:          { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText:         { fontSize: 12, color: '#333' },
  popup:              { position: 'absolute', bottom: 80, right: 10, left: 80, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderWidth: 1, borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  popupHeader:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  popupTitle:         { fontSize: 15, fontWeight: '700', color: '#1A3D5C' },
  popupClose:         { fontSize: 16, color: '#aaa' },
  popupSeverityRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  popupSeverityDot:   { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  popupSeverityText:  { fontSize: 12, fontWeight: '600' },
  popupDesc:          { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 6 },
  popupMeta:          { fontSize: 12, color: '#999' },
  loadingOverlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  errorBanner:        { position: 'absolute', top: 100, left: 10, right: 10, backgroundColor: '#FDEDEC', borderColor: '#E74C3C', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  errorBannerText:    { fontSize: 11, color: '#922B21' },
});
