import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { LostFoundItem, LostFoundType } from '@campusapp/shared';
import { lostFoundApi } from '../../src/services/api';

// ── Demo data ─────────────────────────────────────────────────
const DEMO_ITEMS: LostFoundItem[] = [
  { id:1, type:'lost',  title:'Black AirPods Case',    description:'Lost near Milne Library entrance', category:'Electronics', latitude:42.4541, longitude:-75.0633, imageUrls:[], status:'active', reporterId:2, createdAt:'2024-03-10T14:30:00' },
  { id:2, type:'lost',  title:'Blue laptop bag',        description:'Left near Science Hall room 204',  category:'Bags',        latitude:null,    longitude:null,    imageUrls:[], status:'active', reporterId:3, createdAt:'2024-03-09T09:15:00' },
  { id:3, type:'found', title:'Biology textbook 2nd ed',description:'Found in Alumni Hall lobby',       category:'Books',       latitude:null,    longitude:null,    imageUrls:[], status:'active', reporterId:4, createdAt:'2024-03-10T11:00:00' },
];

const ITEM_CATEGORIES = ['Electronics', 'Bags', 'Keys', 'Books', 'Clothing', 'ID / Cards', 'Other'];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1)  return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Item card ─────────────────────────────────────────────────
function ItemCard({ item, onResolve }: { item: LostFoundItem; onResolve: (id: number) => void }) {
  const isLost = item.type === 'lost';
  return (
    <View style={[styles.card, isLost ? styles.cardLost : styles.cardFound]}>
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
        {item.latitude ? <Text style={styles.metaText}>📍 Pinned</Text> : null}
      </View>
      {isLost && (
        <TouchableOpacity style={styles.resolveBtn} onPress={() => onResolve(item.id)}>
          <Text style={styles.resolveBtnText}>Mark as resolved</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function LostFoundScreen() {
  const [items,       setItems]       = useState<LostFoundItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState<LostFoundType | 'all'>('all');
  const [showForm,    setShowForm]    = useState(false);
  const [formType,    setFormType]    = useState<LostFoundType>('lost');
  const [formTitle,   setFormTitle]   = useState('');
  const [formDesc,    setFormDesc]    = useState('');
  const [formCat,     setFormCat]     = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await lostFoundApi.getAll();
      setItems(data);
    } catch {
      setItems(DEMO_ITEMS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleResolve = async (id: number) => {
    Alert.alert('Mark resolved?', 'This will remove the item from the active list.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resolve', onPress: async () => {
        try {
          await lostFoundApi.resolve(id);
          fetchItems();
        } catch {
          Alert.alert('Error', 'Could not resolve item.');
        }
      }}
    ]);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!formTitle.trim()) return setFormError('Please enter an item name.');
    if (!formDesc.trim())  return setFormError('Please add a description.');
    setSubmitting(true);
    try {
      await lostFoundApi.create({
        type: formType,
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCat || 'Other',
      });
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
    return true;
  });

  return (
    <View style={styles.container}>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Search items..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.filterTabs}>
          {(['all','lost','found'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.tab, filter === f && styles.tabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Report buttons */}
      <View style={styles.reportRow}>
        <TouchableOpacity style={styles.reportLostBtn} onPress={() => { setFormType('lost'); setShowForm(true); }}>
          <Text style={styles.reportBtnText}>+ Report lost item</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reportFoundBtn} onPress={() => { setFormType('found'); setShowForm(true); }}>
          <Text style={styles.reportBtnText}>+ Report found item</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1A5276" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          renderItem={({ item }) => <ItemCard item={item} onResolve={handleResolve} />}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          ListEmptyComponent={<Text style={styles.empty}>No items found.</Text>}
        />
      )}

      {/* Submit form modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.modalContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {formType === 'lost' ? 'Report a lost item' : 'Report a found item'}
              </Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Item name <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="e.g. Blue backpack" placeholderTextColor="#aaa"
                value={formTitle} onChangeText={setFormTitle} />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection:'row', gap:6, paddingVertical:4 }}>
                  {ITEM_CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat}
                      style={[styles.chip, formCat === cat && styles.chipActive]}
                      onPress={() => setFormCat(cat)}>
                      <Text style={[styles.chipText, formCat === cat && styles.chipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, { minHeight:80, textAlignVertical:'top' }]}
                placeholder="Describe the item in detail..." placeholderTextColor="#aaa"
                value={formDesc} onChangeText={setFormDesc} multiline />
            </View>

            {formError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { backgroundColor:'#aaa' }]}
              onPress={handleSubmit} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>Submit</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#fff' },
  toolbar:          { padding: 12, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', gap: 8 },
  search:           { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, fontSize: 13, color: '#333', backgroundColor: '#fff' },
  filterTabs:       { flexDirection: 'row', gap: 6 },
  tab:              { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  tabActive:        { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  tabText:          { fontSize: 12, color: '#555' },
  tabTextActive:    { color: '#fff' },
  reportRow:        { flexDirection: 'row', gap: 8, padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  reportLostBtn:    { flex: 1, backgroundColor: '#E74C3C', borderRadius: 8, padding: 9, alignItems: 'center' },
  reportFoundBtn:   { flex: 1, backgroundColor: '#27AE60', borderRadius: 8, padding: 9, alignItems: 'center' },
  reportBtnText:    { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty:            { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
  card:             { backgroundColor: '#fff', borderRadius: 10, padding: 13, borderWidth: 1, borderColor: '#e0e0e0', borderLeftWidth: 4 },
  cardLost:         { borderLeftColor: '#E74C3C' },
  cardFound:        { borderLeftColor: '#27AE60' },
  cardTop:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle:        { fontSize: 14, fontWeight: '600', color: '#1A3D5C' },
  cardCat:          { fontSize: 11, color: '#888', marginTop: 2 },
  badge:            { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeLost:        { backgroundColor: '#FDEDEC' },
  badgeFound:       { backgroundColor: '#D5F5E3' },
  badgeText:        { fontSize: 10, fontWeight: '600' },
  badgeTextLost:    { color: '#922B21' },
  badgeTextFound:   { color: '#1E8449' },
  cardDesc:         { fontSize: 12, color: '#555', marginBottom: 6, lineHeight: 17 },
  cardMeta:         { flexDirection: 'row', gap: 12 },
  metaText:         { fontSize: 11, color: '#999' },
  resolveBtn:       { marginTop: 8, borderWidth: 1, borderColor: '#1A5276', borderRadius: 6, padding: 6, alignItems: 'center' },
  resolveBtnText:   { fontSize: 12, color: '#1A5276' },
  modalContainer:   { flex: 1, backgroundColor: '#fff' },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle:       { fontSize: 16, fontWeight: '600', color: '#1A3D5C' },
  modalClose:       { fontSize: 18, color: '#999', padding: 4 },
  formSection:      { paddingHorizontal: 16, paddingTop: 14 },
  formLabel:        { fontSize: 11, fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  required:         { color: '#E74C3C' },
  input:            { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 13, color: '#333' },
  chip:             { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  chipActive:       { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  chipText:         { fontSize: 11, color: '#555' },
  chipTextActive:   { color: '#fff' },
  errorBox:         { marginHorizontal: 16, marginTop: 10, backgroundColor: '#FDEDEC', borderWidth: 1, borderColor: '#E74C3C', borderRadius: 8, padding: 10 },
  errorText:        { fontSize: 12, color: '#922B21' },
  submitBtn:        { margin: 16, backgroundColor: '#1A5276', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  submitText:       { color: '#fff', fontSize: 15, fontWeight: '600' },
});