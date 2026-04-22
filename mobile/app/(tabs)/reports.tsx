import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ISSUE_CATEGORIES,
  SEVERITY_LEVELS,
  SEVERITY_COLORS,
} from '@campusapp/shared';
import type { Issue, IssueCategory, IssueSeverity, IssueFilters, IssueStatus } from '@campusapp/shared';
import { issuesApi, NetworkError } from '../../src/services/api';

// ── Demo data ─────────────────────────────────────────────────
const DEMO_ISSUES: Issue[] = [
  { id:1, category:'Road',     severity:'Severe', description:'Icy walkway near Milne Library',    latitude:42.454,  longitude:-75.0635, reportCount:3, status:'active', reporterId:2, createdAt:'2024-03-10T14:30:00', updatedAt:'' },
  { id:2, category:'Water',    severity:'Mild',   description:'Drinking fountain not working IRC', latitude:42.4528, longitude:-75.0645, reportCount:1, status:'active', reporterId:2, createdAt:'2024-03-09T10:00:00', updatedAt:'' },
  { id:3, category:'Building', severity:'Large',  description:'Heating issue in Fitzelle Hall',    latitude:42.4537, longitude:-75.0655, reportCount:2, status:'active', reporterId:2, createdAt:'2024-03-08T08:00:00', updatedAt:'' },
];

type DateFilter = 'All' | 'Today' | '7 days' | '30 days';

const DATE_FILTER_MS: Record<Exclude<DateFilter, 'All'>, number> = {
  'Today': 86400000,
  '7 days': 604800000,
  '30 days': 2592000000,
};

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1)  return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function dateFilterToStartDate(filter: DateFilter): string | undefined {
  if (filter === 'All') return undefined;
  return new Date(Date.now() - DATE_FILTER_MS[filter]).toISOString();
}

function IssueCard({ issue, onResolve }: { issue: Issue; onResolve: (id: number) => void }) {
  const color = SEVERITY_COLORS[issue.severity];
  const isFixed = issue.status === 'fixed';
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded(e => !e)}
      style={[styles.card, { borderLeftColor: isFixed ? '#ccc' : color }, isFixed && styles.cardFixed]}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardCategory, isFixed && styles.textFaded]}>{issue.category}</Text>
          <Text
            style={[styles.cardDesc, isFixed && styles.textFaded]}
            numberOfLines={expanded ? undefined : 2}
          >
            {issue.description}
          </Text>
        </View>
        <View style={[styles.sevBadge, { backgroundColor: isFixed ? '#eee' : color + '22', borderColor: isFixed ? '#ccc' : color }]}>
          <Text style={[styles.sevBadgeText, { color: isFixed ? '#aaa' : color }]}>{issue.severity}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={[styles.metaText, isFixed && styles.textFaded]}>📊 {issue.reportCount} report{issue.reportCount !== 1 ? 's' : ''}</Text>
        <Text style={[styles.metaText, isFixed && styles.textFaded]}>🕒 {timeAgo(issue.createdAt)}</Text>
        <View style={[styles.statusBadge, isFixed ? styles.statusFixed : styles.statusActive]}>
          <Text style={styles.statusText}>{issue.status}</Text>
        </View>
      </View>
      {!isFixed && (
        <TouchableOpacity style={styles.resolveBtn} onPress={() => onResolve(issue.id)}>
          <Text style={styles.resolveBtnText}>Mark as fixed</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function ReportsScreen() {
  const router  = useRouter();
  const [issues,       setIssues]       = useState<Issue[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [catFilter,    setCatFilter]    = useState<IssueCategory | 'All'>('All');
  const [sevFilter,    setSevFilter]    = useState<IssueSeverity | 'All'>('All');
  const [dateFilter,   setDateFilter]   = useState<DateFilter>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | IssueStatus>('All');
  const [fetchError,   setFetchError]   = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const filters: IssueFilters = {
        category: catFilter !== 'All' ? catFilter : undefined,
        severity: sevFilter !== 'All' ? sevFilter : undefined,
        status:   statusFilter !== 'All' ? statusFilter : undefined,
        startDate: dateFilterToStartDate(dateFilter),
      };
      const data = await issuesApi.getAll(filters);
      setIssues(data);
      setFetchError(null);
    } catch (err) {
      if (err instanceof NetworkError) {
        setIssues(DEMO_ISSUES);
        setFetchError(null);
      } else {
        setFetchError(err instanceof Error ? err.message : 'Failed to load reports');
      }
    } finally {
      setLoading(false);
    }
  }, [catFilter, sevFilter, statusFilter, dateFilter]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const handleResolve = (id: number) => {
    Alert.alert('Mark as fixed?', 'This will mark the issue as resolved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark fixed', onPress: async () => {
        try {
          await issuesApi.markFixed(id);
          fetchIssues();
        } catch {
          Alert.alert('Error', 'Could not mark issue as fixed.');
        }
      }}
    ]);
  };

  // The server applies category, severity, status, and startDate filters.
  // Archived rows are also excluded server-side when no explicit status is passed.
  const filtered = issues;

  return (
    <View style={styles.container}>

      {/* Category filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['All', ...ISSUE_CATEGORIES] as (IssueCategory | 'All')[]).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, catFilter === cat && styles.chipActive]}
              onPress={() => setCatFilter(cat)}
            >
              <Text style={[styles.chipText, catFilter === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Severity filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Severity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['All', ...SEVERITY_LEVELS] as (IssueSeverity | 'All')[]).map(sev => (
            <TouchableOpacity
              key={sev}
              style={[
                styles.chip,
                sevFilter === sev && sev !== 'All'
                  ? { backgroundColor: SEVERITY_COLORS[sev as IssueSeverity], borderColor: SEVERITY_COLORS[sev as IssueSeverity] }
                  : sevFilter === sev
                  ? styles.chipActive
                  : {}
              ]}
              onPress={() => setSevFilter(sev)}
            >
              <Text style={[styles.chipText, sevFilter === sev && styles.chipTextActive]}>{sev}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Status filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['All', 'active', 'fixed'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, statusFilter === s && styles.chipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Date filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['All', 'Today', '7 days', '30 days'] as DateFilter[]).map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, dateFilter === d && styles.chipActive]}
              onPress={() => setDateFilter(d)}
            >
              <Text style={[styles.chipText, dateFilter === d && styles.chipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Count + refresh */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>{filtered.length} report{filtered.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity onPress={fetchIssues}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {fetchError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{fetchError}</Text>
        </View>
      )}

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1A5276" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          renderItem={({ item }) => <IssueCard issue={item} onResolve={handleResolve} />}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          ListEmptyComponent={<Text style={styles.empty}>No reports match your filters.</Text>}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/report/new')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#fff' },
  filterSection:   { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  filterLabel:     { fontSize: 10, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginBottom: 5 },
  filterRow:       { gap: 6, paddingBottom: 6 },
  chip:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  chipActive:      { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  chipText:        { fontSize: 11, color: '#555' },
  chipTextActive:  { color: '#fff' },
  countRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  countText:       { fontSize: 12, color: '#888' },
  refreshText:     { fontSize: 12, color: '#1A5276', fontWeight: '600' },
  empty:           { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
  card:            { backgroundColor: '#fff', borderRadius: 10, padding: 13, borderWidth: 1, borderColor: '#e0e0e0', borderLeftWidth: 4 },
  cardFixed:       { backgroundColor: '#fafafa', opacity: 0.75 },
  cardTop:         { flexDirection: 'row', gap: 10, marginBottom: 8 },
  cardCategory:    { fontSize: 13, fontWeight: '600', color: '#1A3D5C', marginBottom: 3 },
  cardDesc:        { fontSize: 12, color: '#555', lineHeight: 17 },
  textFaded:       { color: '#bbb' },
  sevBadge:        { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  sevBadgeText:    { fontSize: 11, fontWeight: '600' },
  cardMeta:        { flexDirection: 'row', gap: 10, alignItems: 'center' },
  metaText:        { fontSize: 11, color: '#999' },
  statusBadge:     { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  statusActive:    { backgroundColor: '#D5F5E3' },
  statusFixed:     { backgroundColor: '#EAECEE' },
  statusText:      { fontSize: 10, fontWeight: '600', color: '#555' },
  resolveBtn:      { marginTop: 8, borderWidth: 1, borderColor: '#1A5276', borderRadius: 6, padding: 6, alignItems: 'center' },
  resolveBtnText:  { fontSize: 12, color: '#1A5276' },
  fab:             { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#1A5276', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText:         { color: '#fff', fontSize: 28, lineHeight: 30 },
  errorBanner:     { marginHorizontal: 14, marginTop: 6, backgroundColor: '#FDEDEC', borderColor: '#E74C3C', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  errorBannerText: { fontSize: 11, color: '#922B21' },
});