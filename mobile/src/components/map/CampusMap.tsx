import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Circle, Marker, Region } from 'react-native-maps';
import {
  CAMPUS_CENTER,
  CAMPUS_DEFAULT_ZOOM,
  CAMPUS_BOUNDS,
  ISSUE_CATEGORIES,
  SEVERITY_COLORS,
  SEVERITY_LEVELS,
} from '@campusapp/shared';
import type { Issue, IssueCategory, LostFoundItem } from '@campusapp/shared';
import { issuesApi, lostFoundApi, NetworkError } from '../../services/api';

// ── Demo data (used until backend is connected) ───────────────
const DEMO_ISSUES: Issue[] = [
  { id:1, category:'Road',     severity:'Severe', description:'Icy walkway near Milne Library',    latitude:42.468010,  longitude:-75.062851, reportCount:3, status:'active', reporterId:2, createdAt:'', updatedAt:'' },
  { id:2, category:'Water',    severity:'Mild',   description:'Drinking fountain not working IRC', latitude:42.469277, longitude:-75.063021, reportCount:1, status:'active', reporterId:2, createdAt:'', updatedAt:'' },
  { id:3, category:'Building', severity:'Large',  description:'Heating issue in Fitzelle Hall',    latitude:42.469995, longitude:-75.062918, reportCount:2, status:'active', reporterId:2, createdAt:'', updatedAt:'' },
];

const DEMO_LOST: LostFoundItem[] = [
  { id:1, type:'lost', title:'Black AirPods Case', description:'Lost near Milne Library entrance', category:'Electronics', latitude:42.4685, longitude:-75.0630, imageUrls:[], status:'active', reporterId:2, createdAt:'' },
];

// Bubble radius scales with report count
const bubbleRadius = (count: number) => 20 + count * 8;

type FilterState = {
  category: IssueCategory | 'All';
};

export default function CampusMap() {
  const [issues,    setIssues]    = useState<Issue[]>([]);
  const [lostItems, setLostItems] = useState<LostFoundItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filters,   setFilters]   = useState<FilterState>({ category: 'All' });
  const [showHeatmap,   setShowHeatmap]   = useState(true);
  const [showLostFound, setShowLostFound] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [fetchError,    setFetchError]    = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mapRegion: Region = {
    latitude:  CAMPUS_CENTER.latitude,
    longitude: CAMPUS_CENTER.longitude,
    ...CAMPUS_DEFAULT_ZOOM,
  };

  const fetchData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [issueData, lfData] = await Promise.all([
        issuesApi.getAll(),
        lostFoundApi.getAll(),
      ]);
      setIssues(issueData);
      setLostItems(lfData);
      setFetchError(null);
    } catch (err) {
      if (err instanceof NetworkError) {
        // Device can't reach the backend (e.g. Expo Go on a different Wi-Fi) — fall back to demo data.
        setIssues(DEMO_ISSUES);
        setLostItems(DEMO_LOST);
        setFetchError(null);
      } else {
        // Server returned an error; keep whatever data we have and surface a message.
        setFetchError(err instanceof Error ? err.message : 'Failed to load map data');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Fetch on tab focus + poll every 60s while focused (Manual §4.1). Silent polls
  // avoid flashing the loading overlay every minute.
  useFocusEffect(
    useCallback(() => {
      fetchData();
      intervalRef.current = setInterval(() => fetchData({ silent: true }), 60000);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [fetchData])
  );

  // Silent refetch when the app returns from background; prevents stale data after >60s away.
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') fetchData({ silent: true });
    });
    return () => sub.remove();
  }, [fetchData]);

  // Manual ↻ resets the 60s clock so users don't see a second overlay flash right after tapping.
  const onManualRefresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    fetchData();
    intervalRef.current = setInterval(() => fetchData({ silent: true }), 60000);
  }, [fetchData]);

  const filteredIssues = useMemo(
    () => issues.filter(issue => {
      if (issue.status !== 'active') return false;
      if (filters.category !== 'All' && issue.category !== filters.category) return false;
      return true;
    }),
    [issues, filters.category]
  );

  const activeLostItems = useMemo(
    () => lostItems.filter(i => i.status === 'active' && i.latitude != null && i.longitude != null),
    [lostItems]
  );

  // Close popup when the selected issue is no longer in the filtered set
  // (filter change, auto-refresh dropped the row, or status transitioned).
  useEffect(() => {
    if (selectedIssue && !filteredIssues.some(i => i.id === selectedIssue.id)) {
      setSelectedIssue(null);
    }
  }, [filteredIssues, selectedIssue]);

  return (
    <View style={styles.container}>

      {/* ── Filter bar ─────────────────────────────────────── */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Text style={styles.filterLabel}>Category:</Text>
          {(['All', ...ISSUE_CATEGORIES] as (IssueCategory | 'All')[]).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, filters.category === cat && styles.chipActive]}
              onPress={() => setFilters(f => ({ ...f, category: cat }))}
            >
              <Text style={[styles.chipText, filters.category === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Map ────────────────────────────────────────────── */}
      <MapView
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation
        showsCompass
        showsScale
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          const tapped = filteredIssues.find(issue => {
            const latDiff = Math.abs(issue.latitude - latitude);
            const lngDiff = Math.abs(issue.longitude - longitude);
            return latDiff < 0.0005 && lngDiff < 0.0005;
          });
          if (tapped) setSelectedIssue(tapped);
          else setSelectedIssue(null);
        }}
      >
        {/* Heatmap bubbles — no Marker, just Circle */}
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

        {/* Lost item pins */}
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

      {/* ── Toggle controls ────────────────────────────────── */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, showHeatmap && styles.toggleBtnActive]}
          onPress={() => setShowHeatmap(v => !v)}
        >
          <Text style={[styles.toggleText, showHeatmap && styles.toggleTextActive]}>
            Heatmap {showHeatmap ? 'on' : 'off'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, showLostFound && styles.toggleBtnActive]}
          onPress={() => setShowLostFound(v => !v)}
        >
          <Text style={[styles.toggleText, showLostFound && styles.toggleTextActive]}>
            Lost & Found {showLostFound ? 'on' : 'off'}
          </Text>
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

      {/* ── Legend ─────────────────────────────────────────── */}
      <View style={styles.legend}>
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

      {/* ── Issue detail popup ─────────────────────────────── */}
      {selectedIssue && (
        <View style={styles.popup}>
          <View style={styles.popupHeader}>
            <Text style={styles.popupTitle}>{selectedIssue.category}</Text>
            <TouchableOpacity onPress={() => setSelectedIssue(null)}>
              <Text style={styles.popupClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.popupSeverity}>
            Severity: <Text style={{ color: SEVERITY_COLORS[selectedIssue.severity] }}>
              {selectedIssue.severity}
            </Text>
          </Text>
          <Text style={styles.popupDesc}>{selectedIssue.description}</Text>
          <Text style={styles.popupMeta}>
            {selectedIssue.reportCount} report{selectedIssue.reportCount !== 1 ? 's' : ''}
          </Text>
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
  container:       { flex: 1 },
  map:             { flex: 1 },
  filterBar:       { backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  filterScroll:    { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  filterLabel:     { fontSize: 11, fontWeight: '600', color: '#666', marginRight: 4 },
  chip:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  chipActive:      { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  chipText:        { fontSize: 11, color: '#555' },
  chipTextActive:  { color: '#fff' },
  toggleRow:       { position: 'absolute', top: 58, left: 10, flexDirection: 'row', gap: 6 },
  toggleBtn:       { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#ccc' },
  toggleBtnActive: { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  toggleText:      { fontSize: 11, color: '#555' },
  toggleTextActive:{ color: '#fff' },
  refreshBtn:      { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#ccc' },
  refreshText:     { fontSize: 14, color: '#1A5276' },
  legend:          { position: 'absolute', bottom: 80, left: 10, backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#ddd' },
  legendRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  legendDot:       { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText:      { fontSize: 11, color: '#333' },
  popup:           { position: 'absolute', bottom: 80, right: 10, left: 80, backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#ddd', elevation: 4 },
  popupHeader:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  popupTitle:      { fontSize: 14, fontWeight: '600', color: '#1A3D5C' },
  popupClose:      { fontSize: 14, color: '#999' },
  popupSeverity:   { fontSize: 12, marginBottom: 4 },
  popupDesc:       { fontSize: 12, color: '#555', marginBottom: 4 },
  popupMeta:       { fontSize: 11, color: '#999' },
  loadingOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  errorBanner:     { position: 'absolute', top: 96, left: 10, right: 10, backgroundColor: '#FDEDEC', borderColor: '#E74C3C', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  errorBannerText: { fontSize: 11, color: '#922B21' },
});