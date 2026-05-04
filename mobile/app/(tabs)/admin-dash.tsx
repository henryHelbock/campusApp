import React from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Modal, RefreshControl,
} from 'react-native';
import { useAdminDashboard } from '../../src/hooks/useAdminDashboard';

const SEV_COLORS: Record<string, string> = {
  Mild: '#F39C12', Moderate: '#E67E22', Severe: '#E74C3C', Large: '#8E44AD',
};

export default function AdminDashboardScreen() {
  const {
    stats, flaggedIssues, lostFoundItems, flaggedUsers,
    isLoading, isRefreshing, connectionError, BASE_URL,
    isModalVisible, setIsModalVisible, userHistory, historyLoading, selectedUserEmail,
    isAuditModalVisible, setIsAuditModalVisible, auditLogs, auditLoading,
    isAllRecordsModalVisible, setIsAllRecordsModalVisible, allRecordsLoading, allRecordsTab, setAllRecordsTab, allIssues, allLnfItems,
    handleRefresh, handleViewAuditLogs, handleViewAllRecords,
    handleRemoveIssue, handleKeepIssue, handleOverrideSeverity,
    handleResolveLnf, handleSuspendUser, handleBanUser, handleReinstateUser, handleViewUser,
  } = useAdminDashboard();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerEverything]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading database...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>ADMIN</Text>
        </View>
      </View>

      {connectionError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Could not connect to the server at {BASE_URL}.</Text>
        </View>
      )}

      <View style={styles.summaryContainer}>
        <View style={[styles.summaryBox, { borderTopColor: '#6bb8ff' }]}>
          <Text style={styles.summaryNumber}>{stats?.activeIssues || 0}</Text>
          <Text style={styles.summaryTitle}>Active Issues</Text>
        </View>
        <View style={[styles.summaryBox, { borderTopColor: '#ffb74d' }]}>
          <Text style={styles.summaryNumber}>{stats?.flaggedItems || 0}</Text>
          <Text style={styles.summaryTitle}>Flagged</Text>
        </View>
        <View style={[styles.summaryBox, { borderTopColor: '#4caf50' }]}>
          <Text style={styles.summaryNumber}>{stats?.openLnF || 0}</Text>
          <Text style={styles.summaryTitle}>Open L&F</Text>
        </View>
      </View>

      <View style={styles.adminControls}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleViewAllRecords}>
          <Text style={styles.actionBtnText}>Database</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleViewAuditLogs}>
          <Text style={styles.actionBtnText}>Audit Logs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, isRefreshing && styles.actionBtnDisabled]} onPress={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <ActivityIndicator size="small" color="#aaa" /> : <Text style={styles.actionBtnText}>Refresh</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Flagged Issues</Text>
        {flaggedIssues && flaggedIssues.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: '#cf667922' }]}>
            <Text style={[styles.countBadgeText, { color: '#cf6679' }]}>{flaggedIssues.length}</Text>
          </View>
        )}
      </View>
      {!flaggedIssues || flaggedIssues.length === 0 ? (
        <Text style={styles.emptyText}>No flagged issues to review.</Text>
      ) : (
        flaggedIssues.map(issue => {
          const sevColor = SEV_COLORS[issue.severity] || '#888';
          return (
            <View key={`issue-${issue.id}`} style={[styles.card, { borderLeftColor: sevColor, borderLeftWidth: 3 }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{issue.category}</Text>
                <View style={[styles.sevBadge, { backgroundColor: sevColor + '22', borderColor: sevColor }]}>
                  <Text style={[styles.sevBadgeText, { color: sevColor }]}>{issue.severity}</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>{issue.description}</Text>
              <Text style={styles.warningText}>{issue.report_count} report{issue.report_count !== 1 ? 's' : ''}</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.btnKeep} onPress={() => handleKeepIssue(issue.id)}>
                  <Text style={styles.btnKeepText}>Keep</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSev} onPress={() => handleOverrideSeverity(issue.id)}>
                  <Text style={styles.btnSevText}>Severity</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnRemove} onPress={() => handleRemoveIssue(issue.id)}>
                  <Text style={styles.btnRemoveText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lost & Found Queue</Text>
        {lostFoundItems && lostFoundItems.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: '#6bb8ff22' }]}>
            <Text style={[styles.countBadgeText, { color: '#6bb8ff' }]}>{lostFoundItems.length}</Text>
          </View>
        )}
      </View>
      {!lostFoundItems || lostFoundItems.length === 0 ? (
        <Text style={styles.emptyText}>No active Lost & Found items.</Text>
      ) : (
        lostFoundItems.map(item => (
          <View key={`lnf-${item.id}`} style={[styles.card, { borderLeftColor: '#6bb8ff', borderLeftWidth: 3 }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={[styles.typePill, item.type === 'lost' ? styles.typeLost : styles.typeFound]}>
                <Text style={styles.typePillText}>{item.type.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>{item.category} · {item.description}</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.btnRemove} onPress={() => handleResolveLnf(item.id)}>
                <Text style={styles.btnRemoveText}>Resolve / Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>User Management</Text>
        {flaggedUsers && flaggedUsers.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: '#bb86fc22' }]}>
            <Text style={[styles.countBadgeText, { color: '#bb86fc' }]}>{flaggedUsers.length}</Text>
          </View>
        )}
      </View>
      {!flaggedUsers || flaggedUsers.length === 0 ? (
        <Text style={styles.emptyText}>No users require moderation.</Text>
      ) : (
        flaggedUsers.map(user => {
          const statusColor = user.status === 'active' ? '#4caf50' : user.status === 'suspended' ? '#ffb74d' : '#cf6679';
          return (
            <View key={`user-${user.id}`} style={[styles.card, { borderLeftColor: '#bb86fc', borderLeftWidth: 3 }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{user.email}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
                  <Text style={[styles.statusPillText, { color: statusColor }]}>{user.status.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.btnNeutral} onPress={() => handleViewUser(user.id, user.email)}>
                  <Text style={styles.btnNeutralText}>View</Text>
                </TouchableOpacity>
                {(user.status === 'banned' || user.status === 'suspended') && (
                  <TouchableOpacity style={styles.btnKeep} onPress={() => handleReinstateUser(user.id)}>
                    <Text style={styles.btnKeepText}>Reinstate</Text>
                  </TouchableOpacity>
                )}
                {user.status === 'active' && (
                  <TouchableOpacity style={styles.btnWarn} onPress={() => handleSuspendUser(user.id)}>
                    <Text style={styles.btnWarnText}>Suspend</Text>
                  </TouchableOpacity>
                )}
                {user.status !== 'banned' && (
                  <TouchableOpacity style={styles.btnRemove} onPress={() => handleBanUser(user.id)}>
                    <Text style={styles.btnRemoveText}>Ban</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* All Records Modal */}
      <Modal visible={isAllRecordsModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsAllRecordsModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Global Database View</Text>
            <TouchableOpacity onPress={() => setIsAllRecordsModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, allRecordsTab === 'issues' && styles.tabActive]} onPress={() => setAllRecordsTab('issues')}>
              <Text style={[styles.tabText, allRecordsTab === 'issues' && styles.tabTextActive]}>Issue Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, allRecordsTab === 'lnf' && styles.tabActive]} onPress={() => setAllRecordsTab('lnf')}>
              <Text style={[styles.tabText, allRecordsTab === 'lnf' && styles.tabTextActive]}>Lost & Found</Text>
            </TouchableOpacity>
          </View>
          {allRecordsLoading ? (
            <View style={[styles.centerEverything, { flex: 1 }]}>
              <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 40 }} />
            </View>
          ) : (
            <ScrollView style={styles.modalContent}>
              {allRecordsTab === 'issues' && (
                allIssues.length === 0 ? <Text style={styles.emptyText}>No issues in database.</Text> :
                allIssues.map(issue => (
                  <View key={`all-issue-${issue.id}`} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyTitle}>#{issue.id} · {issue.category} ({issue.severity})</Text>
                      <Text style={[styles.historyStatus, issue.status === 'active' ? styles.statusActive : styles.statusArchived]}>{issue.status.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.historyDesc}>{issue.description}</Text>
                    <View style={styles.historyFooter}>
                      <Text style={styles.historyType}>{issue.report_count} reports · Reporter #{issue.reporter_id}</Text>
                      <Text style={styles.historyDate}>{new Date(issue.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                ))
              )}
              {allRecordsTab === 'lnf' && (
                allLnfItems.length === 0 ? <Text style={styles.emptyText}>No Lost & Found items in database.</Text> :
                allLnfItems.map(item => (
                  <View key={`all-lnf-${item.id}`} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyTitle}>#{item.id} · {item.type.toUpperCase()}: {item.title}</Text>
                      <Text style={[styles.historyStatus, item.status === 'active' ? styles.statusActive : styles.statusArchived]}>{item.status.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.historyDesc}>{item.category} · {item.description}</Text>
                    <View style={styles.historyFooter}>
                      <Text style={styles.historyType}>Reporter #{item.reporter_id}</Text>
                      <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Audit Log Modal */}
      <Modal visible={isAuditModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsAuditModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>System Audit Logs</Text>
            <TouchableOpacity onPress={() => setIsAuditModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          {auditLoading ? (
            <View style={[styles.centerEverything, { flex: 1 }]}>
              <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 40 }} />
            </View>
          ) : (
            <ScrollView style={styles.modalContent}>
              {auditLogs.length === 0 ? <Text style={styles.emptyText}>No recent audit logs.</Text> :
                auditLogs.map((log, index) => (
                  <View key={`log-${log.id}-${index}`} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyTitle}>{log.action}</Text>
                    </View>
                    <Text style={styles.historyDesc}>Admin: {log.admin_email || `ID: ${log.admin_user_id}`}</Text>
                    <View style={styles.historyFooter}>
                      <Text style={styles.historyType}>Content #{log.affected_content_id}</Text>
                      <Text style={styles.historyDate}>{new Date(log.timestamp).toLocaleString()}</Text>
                    </View>
                  </View>
                ))
              }
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* User History Modal */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedUserEmail}</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          {historyLoading ? (
            <View style={[styles.centerEverything, { flex: 1 }]}>
              <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 40 }} />
            </View>
          ) : (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.sectionTitle}>Activity History</Text>
              {userHistory.length === 0 ? <Text style={styles.emptyText}>This user has no history to display.</Text> :
                userHistory.map((item, index) => (
                  <View key={`history-${item.record_type}-${item.id}-${index}`} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyTitle}>{item.title}</Text>
                      <Text style={[styles.historyStatus, item.status === 'active' ? styles.statusActive : styles.statusArchived]}>{item.status.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.historyDesc}>{item.description}</Text>
                    <View style={styles.historyFooter}>
                      <Text style={styles.historyType}>{item.record_type.toUpperCase()}{item.severity !== 'N/A' ? ` · ${item.severity}` : ''}</Text>
                      <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                ))
              }
            </ScrollView>
          )}
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#121212', padding: 16 },
  centerEverything: { justifyContent: 'center', alignItems: 'center' },
  loadingText:      { color: '#aaaaaa', marginTop: 12 },
  errorBanner:      { backgroundColor: '#4a1c1c', borderWidth: 1, borderColor: '#cf6679', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText:        { color: '#cf6679', fontSize: 13 },
  emptyText:        { color: '#555', fontStyle: 'italic', marginBottom: 24, fontSize: 13 },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 40 },
  headerTitle:      { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  roleBadge:        { backgroundColor: '#6bb8ff22', borderWidth: 1, borderColor: '#6bb8ff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  roleBadgeText:    { color: '#6bb8ff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  summaryContainer: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  summaryBox:       { flex: 1, backgroundColor: '#1e1e1e', padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a', borderTopWidth: 3 },
  summaryTitle:     { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  summaryNumber:    { fontSize: 26, fontWeight: '700', color: '#ffffff' },
  adminControls:    { flexDirection: 'row', gap: 8, marginBottom: 28 },
  actionBtn:        { flex: 1, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  actionBtnDisabled:{ opacity: 0.5 },
  actionBtnText:    { color: '#ccc', fontSize: 13, fontWeight: '600' },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle:     { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  countBadge:       { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText:   { fontSize: 12, fontWeight: '700' },
  card:             { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a' },
  cardHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle:        { fontSize: 15, fontWeight: '600', color: '#ffffff', flex: 1, marginRight: 8 },
  cardSubtitle:     { fontSize: 13, color: '#888', marginBottom: 8, lineHeight: 18 },
  warningText:      { fontSize: 12, color: '#cf6679', fontWeight: '500', marginBottom: 10 },
  sevBadge:         { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  sevBadgeText:     { fontSize: 11, fontWeight: '700' },
  typePill:         { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeLost:         { backgroundColor: '#cf667922', borderWidth: 1, borderColor: '#cf6679' },
  typeFound:        { backgroundColor: '#4caf5022', borderWidth: 1, borderColor: '#4caf50' },
  typePillText:     { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  statusPill:       { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText:   { fontSize: 11, fontWeight: '700' },
  actionButtons:    { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  btnNeutral:       { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: '#444' },
  btnNeutralText:   { color: '#ccc', fontSize: 13, fontWeight: '600' },
  btnKeep:          { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#4caf5022', borderWidth: 1, borderColor: '#4caf50' },
  btnKeepText:      { color: '#4caf50', fontSize: 13, fontWeight: '600' },
  btnWarn:          { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#ffb74d22', borderWidth: 1, borderColor: '#ffb74d' },
  btnWarnText:      { color: '#ffb74d', fontSize: 13, fontWeight: '600' },
  btnSev:           { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#6bb8ff22', borderWidth: 1, borderColor: '#6bb8ff' },
  btnSevText:       { color: '#6bb8ff', fontSize: 13, fontWeight: '600' },
  btnRemove:        { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 6, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#cf6679' },
  btnRemoveText:    { color: '#cf6679', fontSize: 13, fontWeight: '600' },
  modalContainer:   { flex: 1, backgroundColor: '#121212', padding: 20 },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a2a', marginBottom: 16 },
  modalTitle:       { fontSize: 17, fontWeight: '700', color: '#ffffff', flex: 1, marginRight: 12 },
  closeText:        { color: '#6bb8ff', fontSize: 15, fontWeight: '600' },
  modalContent:     { flex: 1 },
  tabContainer:     { flexDirection: 'row', marginBottom: 16, backgroundColor: '#1e1e1e', borderRadius: 8, padding: 4 },
  tab:              { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabActive:        { backgroundColor: '#2a2a2a' },
  tabText:          { color: '#666', fontWeight: '600', fontSize: 13 },
  tabTextActive:    { color: '#ffffff' },
  historyCard:      { backgroundColor: '#1e1e1e', borderRadius: 8, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a' },
  historyHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  historyTitle:     { fontSize: 14, fontWeight: '600', color: '#ffffff', flex: 1, marginRight: 8 },
  historyStatus:    { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  statusActive:     { backgroundColor: '#4caf5033', color: '#4caf50' },
  statusArchived:   { backgroundColor: '#44444433', color: '#888' },
  historyDesc:      { fontSize: 13, color: '#888', marginBottom: 10, lineHeight: 18 },
  historyFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyType:      { fontSize: 12, color: '#666' },
  historyDate:      { fontSize: 12, color: '#555' },
});
