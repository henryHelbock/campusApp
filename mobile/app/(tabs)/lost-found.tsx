import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Modal, ScrollView,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import type { LostFoundItem, LostFoundType } from '@campusapp/shared';
import { lostFoundApi } from '../../src/services/api';

const DEMO_ITEMS: LostFoundItem[] = [
  { id:1, type:'lost',  title:'Black AirPods Case',     description:'Lost near Milne Library entrance', category:'Electronics', latitude:42.4541, longitude:-75.0633, imageUrls:[], status:'active', reporterId:2, createdAt:'2024-03-10T14:30:00' },
  { id:2, type:'lost',  title:'Blue laptop bag',         description:'Left near Science Hall room 204',  category:'Bags',        latitude:null,    longitude:null,    imageUrls:[], status:'active', reporterId:3, createdAt:'2024-03-09T09:15:00' },
  { id:3, type:'found', title:'Biology textbook 2nd ed', description:'Found in Alumni Hall lobby',       category:'Books',       latitude:null,    longitude:null,    imageUrls:[], status:'active', reporterId:4, createdAt:'2024-03-10T11:00:00' },
];

const ITEM_CATEGORIES = ['Electronics', 'Bags', 'Keys', 'Books', 'Clothing', 'ID / Cards', 'Other'];

type DateFilter = 'All' | 'Today' | '7 days' | '30 days';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1)  return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isWithinDateFilter(dateStr: string, filter: DateFilter): boolean {
  if (filter === 'All') return true;
  const ms = { 'Today': 86400000, '7 days': 604800000, '30 days': 2592000000 }[filter];
  return Date.now() - new Date(dateStr).getTime() < ms;
}

function ItemCard({ item, onResolve, onClaim }: { item: LostFoundItem; onResolve: (id: number) => void; onClaim: (id: number) => void }) {
  const isLost = item.type === 'lost';
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardCat}>{item.category}</Text>
        </View>
        <View style={[styles.badge, isLost ? styles.badgeLost : styles.badgeFound]}>
          <Text style={[styles.badgeText, isLost ? styles.badgeTextLost : styles.badgeTextFound]}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.cardDesc}>{item.description}</Text>
      <View style={styles.cardMeta}>
        {item.createdAt ? <Text style={styles.metaText}>🕒 {timeAgo(item.createdAt)}</Text> : null}
        {item.latitude  ? <Text style={styles.metaText}>📍 Pinned</Text> : null}
      </View>
      {isLost ? (
        <TouchableOpacity style={styles.actionBtn} onPress={() => onResolve(item.id)}>
          <Text style={styles.actionBtnText}>Mark as resolved</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnClaim]} onPress={() => onClaim(item.id)}>
          <Text style={[styles.actionBtnText, styles.actionBtnTextClaim]}>I found this — Claim</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function LostFoundScreen() {
  const [items,      setItems]      = useState<LostFoundItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState<LostFoundType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All');
  const [showForm,   setShowForm]   = useState(false);
  const [showFilters,setShowFilters]= useState(false);
  const [formType,   setFormType]   = useState<LostFoundType>('lost');
  const [formTitle,  setFormTitle]  = useState('');
  const [formDesc,   setFormDesc]   = useState('');
  const [formCat,    setFormCat]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await lostFoundApi.getAll());
    } catch {
      setItems(DEMO_ITEMS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleResolve = (id: number) => {
    Alert.alert('Mark resolved?', 'This will remove the item from the active list.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resolve', onPress: async () => {
        try { await lostFoundApi.resolve(id); fetchItems(); }
        catch { Alert.alert('Error', 'Could not resolve item.'); }
      }}
    ]);
  };

  const handleClaim = (id: number) => {
    Alert.alert('Claim this item?', 'This will mark the item as claimed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Claim', onPress: async () => {
        try { await lostFoundApi.claim(id); fetchItems(); }
        catch { Alert.alert('Error', 'Could not claim item.'); }
      }}
    ]);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!formTitle.trim()) return setFormError('Please enter an item name.');
    if (!formDesc.trim())  return setFormError('Please add a description.');
    setSubmitting(true);
    try {
      await lostFoundApi.create({ type: formType, title: formTitle.trim(), description: formDesc.trim(), category: formCat || 'Other' });
      setShowForm(false);
      setFormTitle(''); setFormDesc(''); setFormCat(''); setFormError('');
      fetchItems();
    } catch (err: any) {
      setFormError(err.message ?? 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = items.filter(item => {
    if (item.status !== 'active') return false;
    if (filter !== 'all' && item.type !== filter) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) &&
        !item.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (!isWithinDateFilter(item.createdAt, dateFilter)) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            placeholder="Search items..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity
            style={[styles.filterBtn, dateFilter !== 'All' && styles.filterBtnActive]}
            onPress={() => setShowFilters(true)}
          >
            <Text style={[styles.filterBtnText, dateFilter !== 'All' && styles.filterBtnTextActive]}>
              {dateFilter !== 'All' ? dateFilter : 'Date'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.typeTabs}>
          {(['all', 'lost', 'found'] as const).map(f => (
            <TouchableOpacity key={f} style={[styles.typeTab, filter === f && styles.typeTabActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.typeTabText, filter === f && styles.typeTabTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Count row */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1A5276" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          renderItem={({ item }) => <ItemCard item={item} onResolve={handleResolve} onClaim={handleClaim} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.empty}>No items found.</Text>}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchItems} />}
        />
      )}

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.reportLostBtn} onPress={() => { setFormType('lost'); setShowForm(true); }}>
          <Text style={styles.reportBtnText}>+ Lost Item</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reportFoundBtn} onPress={() => { setFormType('found'); setShowForm(true); }}>
          <Text style={styles.reportBtnText}>+ Found Item</Text>
        </TouchableOpacity>
      </View>

      {/* Date filter modal */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Date Range</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            {(['All', 'Today', '7 days', '30 days'] as DateFilter[]).map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.dateOption, dateFilter === d && styles.dateOptionActive]}
                onPress={() => { setDateFilter(d); setShowFilters(false); }}
              >
                <Text style={[styles.dateOptionText, dateFilter === d && styles.dateOptionTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Submit form modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.modalContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{formType === 'lost' ? 'Report a lost item' : 'Report a found item'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Item name <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="e.g. Blue backpack" placeholderTextColor="#aaa" value={formTitle} onChangeText={setFormTitle} />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
                  {ITEM_CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat} style={[styles.chip, formCat === cat && styles.chipActive]} onPress={() => setFormCat(cat)}>
                      <Text style={[styles.chipText, formCat === cat && styles.chipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Describe the item in detail..."
                placeholderTextColor="#aaa"
                value={formDesc}
                onChangeText={setFormDesc}
                multiline
              />
            </View>

            {formError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#f4f6f8' },
  toolbar:              { backgroundColor: '#fff', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchRow:            { flexDirection: 'row', gap: 8, alignItems: 'center' },
  search:               { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#333', backgroundColor: '#f8f9fa' },
  filterBtn:            { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f8f9fa' },
  filterBtnActive:      { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  filterBtnText:        { fontSize: 13, color: '#555' },
  filterBtnTextActive:  { color: '#fff' },
  typeTabs:             { flexDirection: 'row', gap: 6 },
  typeTab:              { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#f8f9fa' },
  typeTabActive:        { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  typeTabText:          { fontSize: 13, color: '#555', fontWeight: '500' },
  typeTabTextActive:    { color: '#fff', fontWeight: '600' },
  countRow:             { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  countText:            { fontSize: 12, color: '#888' },
  empty:                { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 15 },
  card:                 { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTop:              { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle:            { fontSize: 15, fontWeight: '700', color: '#1A3D5C', marginBottom: 2 },
  cardCat:              { fontSize: 12, color: '#999' },
  badge:                { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeLost:            { backgroundColor: '#FDEDEC' },
  badgeFound:           { backgroundColor: '#D5F5E3' },
  badgeText:            { fontSize: 11, fontWeight: '700' },
  badgeTextLost:        { color: '#922B21' },
  badgeTextFound:       { color: '#1E8449' },
  cardDesc:             { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 8 },
  cardMeta:             { flexDirection: 'row', gap: 12, marginBottom: 4 },
  metaText:             { fontSize: 12, color: '#aaa' },
  actionBtn:            { marginTop: 10, borderWidth: 1, borderColor: '#1A5276', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  actionBtnClaim:       { backgroundColor: '#1A5276' },
  actionBtnText:        { fontSize: 13, color: '#1A5276', fontWeight: '600' },
  actionBtnTextClaim:   { color: '#fff' },
  footer:               { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  reportLostBtn:        { flex: 1, backgroundColor: '#E74C3C', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  reportFoundBtn:       { flex: 1, backgroundColor: '#27AE60', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  reportBtnText:        { color: '#fff', fontSize: 13, fontWeight: '700' },
  modalContainer:       { flex: 1, backgroundColor: '#fff' },
  modalHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle:           { fontSize: 17, fontWeight: '700', color: '#1A3D5C' },
  modalDone:            { fontSize: 16, color: '#1A5276', fontWeight: '600' },
  modalClose:           { fontSize: 18, color: '#999', padding: 4 },
  modalContent:         { padding: 16 },
  dateOption:           { paddingVertical: 16, paddingHorizontal: 16, borderRadius: 10, marginBottom: 8, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee' },
  dateOptionActive:     { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  dateOptionText:       { fontSize: 15, color: '#333', fontWeight: '500' },
  dateOptionTextActive: { color: '#fff', fontWeight: '700' },
  formSection:          { paddingHorizontal: 16, paddingTop: 14 },
  formLabel:            { fontSize: 11, fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  required:             { color: '#E74C3C' },
  input:                { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 14, color: '#333', backgroundColor: '#f8f9fa' },
  chip:                 { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  chipActive:           { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  chipText:             { fontSize: 12, color: '#555' },
  chipTextActive:       { color: '#fff' },
  errorBox:             { marginHorizontal: 16, marginTop: 10, backgroundColor: '#FDEDEC', borderWidth: 1, borderColor: '#E74C3C', borderRadius: 8, padding: 10 },
  errorText:            { fontSize: 12, color: '#922B21' },
  submitBtn:            { margin: 16, backgroundColor: '#1A5276', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitText:           { color: '#fff', fontSize: 15, fontWeight: '700' },
});
