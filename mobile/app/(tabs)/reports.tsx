import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert, RefreshControl, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ISSUE_CATEGORIES, SEVERITY_LEVELS, SEVERITY_COLORS } from '@campusapp/shared';
import type { Issue, IssueCategory, IssueSeverity, IssueFilters, IssueStatus } from '@campusapp/shared';
import { issuesApi, NetworkError } from '../../src/services/api';

const DEMO_ISSUES: Issue[] = [
  { id:1, category:'Road',     severity:'Severe', description:'Icy walkway near Milne Library',    latitude:42.454,  longitude:-75.0635, reportCount:3, status:'active', reporterId:2, createdAt:'2024-03-10T14:30:00', updatedAt:'' },
  { id:2, category:'Water',    severity:'Mild',   description:'Drinking fountain not working IRC', latitude:42.4528, longitude:-75.0645, reportCount:1, status:'active', reporterId:2, createdAt:'2024-03-09T10:00:00', updatedAt:'' },
  { id:3, category:'Building', severity:'Large',  description:'Heating issue in Fitzelle Hall',    latitude:42.4537, longitude:-75.0655, reportCount:2, status:'active', reporterId:2, createdAt:'2024-03-08T08:00:00', updatedAt:'' },
];

type DateFilter = 'All' | 'Today' | '7 days' | '30 days';
const DATE_FILTER_MS: Record<Exclude<DateFilter, 'All'>, number> = {
  'Today': 86400000, '7 days': 604800000, '30 days': 2592000000,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
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
    <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded(e => !e)} style={[styles.card, isFixed && styles.cardFixed]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardCategory, isFixed && styles.textFaded]}>{issue.category}</Text>
          <Text style={[styles.cardDesc, isFixed && styles.textFaded]} numberOfLines={expanded ? undefined : 2}>
            {issue.description}
          </Text>
        </View>
        <View style={[styles.sevBadge, { backgroundColor: isFixed ? '#eee' : color + '22', borderColor: isFixed ? '#ccc' : color }]}>
          <Text style={[styles.sevBadgeText, { color: isFixed ? '#aaa' : color }]}>{issue.severity}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={[styles.metaText, isFixed && styles.textFaded]}>{issue.reportCount} report{issue.reportCount !== 1 ? 's' : ''}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={[styles.metaText, isFixed && styles.textFaded]}>{timeAgo(issue.createdAt)}</Text>
        <View style={[styles.statusPill, isFixed ? styles.statusFixed : styles.statusActive]}>
          <Text style={[styles.statusText, { color: isFixed ? '#888' : '#1E8449' }]}>{issue.status}</Text>
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
  const router = useRouter();
  const [issues,       setIssues]       = useState<Issue[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [catFilter,    setCatFilter]    = useState<IssueCategory | 'All'>('All');
  const [sevFilter,    setSevFilter]    = useState<IssueSeverity | 'All'>('All');
  const [dateFilter,   setDateFilter]   = useState<DateFilter>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | IssueStatus>('All');
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [showFilters,  setShowFilters]  = useState(false);

  const hasFilters = catFilter !== 'All' || sevFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All';

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const filters: IssueFilters = {
        category:  catFilter    !== 'All' ? catFilter    : undefined,
        severity:  sevFilter    !== 'All' ? sevFilter    : undefined,
        status:    statusFilter !== 'All' ? statusFilter : undefined,
        startDate: dateFilterToStartDate(dateFilter),
      };
      const data = await issuesApi.getAll(filters);
      setIssues(data);
      setFetchError(null);
    } catch (err) {
      if (err instanceof NetworkError) { setIssues(DEMO_ISSUES); setFetchError(null); }
      else setFetchError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [catFilter, sevFilter, statusFilter, dateFilter]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const handleResolve = (id: number) => {
    Alert.alert('Mark as fixed?', 'This will mark the issue as resolved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark fixed', onPress: async () => {
        try { await issuesApi.markFixed(id); fetchIssues(); }
        catch { Alert.alert('Error', 'Could not mark issue as fixed.'); }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerCount}>{issues.length} report{issues.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={[styles.filterBtn, hasFilters && styles.filterBtnActive]} onPress={() => setShowFilters(true)}>
          <Text style={[styles.filterBtnText, hasFilters && styles.filterBtnTextActive]}>Filters{hasFilters ? ' ●' : ''}</Text>
        </TouchableOpacity>
      </View>

      {fetchError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{fetchError}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1A5276" />
      ) : (
        <FlatList
          data={issues}
          keyExtractor={i => String(i.id)}
          renderItem={({ item }) => <IssueCard issue={item} onResolve={handleResolve} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.empty}>No reports match your filters.</Text>}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchIssues} />}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/report/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.filterGroupLabel}>Category</Text>
            <View style={styles.chipWrap}>
              {(['All', ...ISSUE_CATEGORIES] as (IssueCategory | 'All')[]).map(cat => (
                <TouchableOpacity key={cat} style={[styles.chip, catFilter === cat && styles.chipActive]} onPress={() => setCatFilter(cat)}>
                  <Text style={[styles.chipText, catFilter === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterGroupLabel}>Severity</Text>
            <View style={styles.chipWrap}>
              {(['All', ...SEVERITY_LEVELS] as (IssueSeverity | 'All')[]).map(sev => (
                <TouchableOpacity
                  key={sev}
                  style={[styles.chip,
                    sevFilter === sev && sev !== 'All'
                      ? { backgroundColor: SEVERITY_COLORS[sev as IssueSeverity], borderColor: SEVERITY_COLORS[sev as IssueSeverity] }
                      : sevFilter === sev ? styles.chipActive : {}
                  ]}
                  onPress={() => setSevFilter(sev)}
                >
                  <Text style={[styles.chipText, sevFilter === sev && styles.chipTextActive]}>{sev}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterGroupLabel}>Status</Text>
            <View style={styles.chipWrap}>
              {(['All', 'active', 'fixed'] as const).map(s => (
                <TouchableOpacity key={s} style={[styles.chip, statusFilter === s && styles.chipActive]} onPress={() => setStatusFilter(s)}>
                  <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterGroupLabel}>Date Range</Text>
            <View style={styles.chipWrap}>
              {(['All', 'Today', '7 days', '30 days'] as DateFilter[]).map(d => (
                <TouchableOpacity key={d} style={[styles.chip, dateFilter === d && styles.chipActive]} onPress={() => setDateFilter(d)}>
                  <Text style={[styles.chipText, dateFilter === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {hasFilters && (
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setCatFilter('All'); setSevFilter('All'); setStatusFilter('All'); setDateFilter('All'); }}>
                <Text style={styles.clearBtnText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f4f6f8' },
  header:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerCount:         { fontSize: 15, fontWeight: '600', color: '#333' },
  filterBtn:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  filterBtnActive:     { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  filterBtnText:       { fontSize: 13, color: '#555', fontWeight: '500' },
  filterBtnTextActive: { color: '#fff' },
  empty:               { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 15 },
  card:                { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardFixed:           { opacity: 0.6 },
  cardTop:             { flexDirection: 'row', gap: 12, marginBottom: 10 },
  cardCategory:        { fontSize: 14, fontWeight: '700', color: '#1A3D5C', marginBottom: 4 },
  cardDesc:            { fontSize: 13, color: '#555', lineHeight: 19 },
  textFaded:           { color: '#bbb' },
  sevBadge:            { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  sevBadgeText:        { fontSize: 12, fontWeight: '700' },
  cardMeta:            { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText:            { fontSize: 12, color: '#999' },
  metaDot:             { fontSize: 12, color: '#ccc' },
  statusPill:          { marginLeft: 'auto', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusActive:        { backgroundColor: '#D5F5E3' },
  statusFixed:         { backgroundColor: '#EAECEE' },
  statusText:          { fontSize: 11, fontWeight: '600' },
  resolveBtn:          { marginTop: 12, borderWidth: 1, borderColor: '#1A5276', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  resolveBtnText:      { fontSize: 13, color: '#1A5276', fontWeight: '600' },
  fab:                 { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1A5276', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
  fabText:             { color: '#fff', fontSize: 30, lineHeight: 32 },
  errorBanner:         { marginHorizontal: 16, marginTop: 8, backgroundColor: '#FDEDEC', borderColor: '#E74C3C', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  errorBannerText:     { fontSize: 12, color: '#922B21' },
  modalContainer:      { flex: 1, backgroundColor: '#fff' },
  modalHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle:          { fontSize: 17, fontWeight: '700', color: '#1A3D5C' },
  modalDone:           { fontSize: 16, color: '#1A5276', fontWeight: '600' },
  modalContent:        { padding: 20, paddingBottom: 40 },
  filterGroupLabel:    { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
  chipWrap:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:                { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  chipActive:          { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  chipText:            { fontSize: 13, color: '#555' },
  chipTextActive:      { color: '#fff' },
  clearBtn:            { marginTop: 30, backgroundColor: '#FDEDEC', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  clearBtnText:        { color: '#E74C3C', fontSize: 15, fontWeight: '600' },
});
