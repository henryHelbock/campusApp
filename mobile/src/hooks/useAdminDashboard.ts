import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../services/api';

export interface DashboardStats    { activeIssues: number; flaggedItems: number; openLnF: number; }
export interface FlaggedIssue      { id: number; category: string; severity: string; description: string; report_count: number; reporter_id: number; }
export interface IssueRecord extends FlaggedIssue { status: string; created_at: string; }
export interface LostFoundItem     { id: number; type: string; title: string; description: string; category: string; status: string; reporter_id: number; created_at: string; }
export interface FlaggedUser       { id: number; email: string; status: string; }
export interface HistoryItem       { id: number; record_type: string; title: string; severity: string; description: string; status: string; created_at: string; }
export interface AuditLogItem      { id: number; action: string; affected_content_id: number; timestamp: string; admin_email: string | null; admin_user_id: number; }

const BASE_URL = `${API_BASE}/admin`;

async function fetchWithAuth(url: string, options: any = {}) {
  const token = await SecureStore.getItemAsync('auth_token');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

export function useAdminDashboard() {
  const [stats,           setStats]           = useState<DashboardStats>({ activeIssues: 0, flaggedItems: 0, openLnF: 0 });
  const [flaggedIssues,   setFlaggedIssues]   = useState<FlaggedIssue[]>([]);
  const [lostFoundItems,  setLostFoundItems]  = useState<LostFoundItem[]>([]);
  const [flaggedUsers,    setFlaggedUsers]    = useState<FlaggedUser[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const [isModalVisible,      setIsModalVisible]      = useState(false);
  const [userHistory,          setUserHistory]          = useState<HistoryItem[]>([]);
  const [historyLoading,       setHistoryLoading]       = useState(false);
  const [selectedUserEmail,    setSelectedUserEmail]    = useState('');

  const [isAuditModalVisible,  setIsAuditModalVisible]  = useState(false);
  const [auditLogs,            setAuditLogs]            = useState<AuditLogItem[]>([]);
  const [auditLoading,         setAuditLoading]         = useState(false);

  const [isAllRecordsModalVisible, setIsAllRecordsModalVisible] = useState(false);
  const [allRecordsLoading,        setAllRecordsLoading]        = useState(false);
  const [allRecordsTab,            setAllRecordsTab]            = useState<'issues' | 'lnf'>('issues');
  const [allIssues,                setAllIssues]                = useState<IssueRecord[]>([]);
  const [allLnfItems,              setAllLnfItems]              = useState<LostFoundItem[]>([]);

  const fetchAdminData = useCallback(async () => {
    setConnectionError(false);
    try {
      const [statsRes, issuesRes, usersRes, lnfRes] = await Promise.all([
        fetchWithAuth(`${BASE_URL}/analytics`),
        fetchWithAuth(`${BASE_URL}/moderation-queue`),
        fetchWithAuth(`${BASE_URL}/users`),
        fetchWithAuth(`${BASE_URL}/lost-found`),
      ]);
      if (!statsRes.ok || !issuesRes.ok || !usersRes.ok || !lnfRes.ok) throw new Error('One or more requests failed.');
      setStats(await statsRes.json());
      setFlaggedIssues(await issuesRes.json());
      setFlaggedUsers(await usersRes.json());
      setLostFoundItems(await lnfRes.json());
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      setConnectionError(true);
    }
  }, []);

  useEffect(() => {
    fetchAdminData().finally(() => setIsLoading(false));
  }, [fetchAdminData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAdminData();
    setIsRefreshing(false);
  };

  const handleViewAuditLogs = async () => {
    setIsAuditModalVisible(true);
    setAuditLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/audit-log`);
      if (res.ok) setAuditLogs(await res.json());
    } catch (error) {
      console.error('Network error fetching audit logs', error);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleViewAllRecords = async () => {
    setIsAllRecordsModalVisible(true);
    setAllRecordsLoading(true);
    try {
      const [issuesRes, lnfRes] = await Promise.all([
        fetchWithAuth(`${BASE_URL}/issues`),
        fetchWithAuth(`${BASE_URL}/lost-found/all`),
      ]);
      if (issuesRes.ok && lnfRes.ok) {
        setAllIssues(await issuesRes.json());
        setAllLnfItems(await lnfRes.json());
      }
    } catch (error) {
      console.error('Network error fetching all records:', error);
    } finally {
      setAllRecordsLoading(false);
    }
  };

  const handleRemoveIssue = async (issueId: number) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/issues/${issueId}`, { method: 'DELETE' });
      if (res.ok) setFlaggedIssues(prev => prev.filter(i => i.id !== issueId));
    } catch (error) {
      console.error('Network error removing issue:', error);
    }
  };

  const handleKeepIssue = async (issueId: number) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/issues/${issueId}/dismiss`, { method: 'PATCH' });
      if (res.ok) setFlaggedIssues(prev => prev.filter(i => i.id !== issueId));
    } catch (error) {
      console.error('Network error keeping issue:', error);
    }
  };

  const handleOverrideSeverity = (issueId: number) => {
    Alert.alert('Override Severity', 'Select a new severity level:', [
      ...['Mild', 'Medium', 'Large', 'Severe'].map(s => ({
        text: s,
        onPress: async () => {
          try {
            await fetchWithAuth(`${BASE_URL}/issues/${issueId}/severity`, {
              method: 'PATCH',
              body: JSON.stringify({ severity: s }),
            });
            handleRefresh();
          } catch {
            Alert.alert('Error', 'Could not update severity.');
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleResolveLnf = async (itemId: number) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/lost-found/${itemId}`, { method: 'DELETE' });
      if (res.ok) { setLostFoundItems(prev => prev.filter(i => i.id !== itemId)); handleRefresh(); }
    } catch (error) {
      console.error('Network error resolving L&F:', error);
    }
  };

  const handleSuspendUser = async (userId: number) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/users/${userId}/suspend`, { method: 'PATCH' });
      if (res.ok) setFlaggedUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'suspended' } : u));
    } catch (error) {
      console.error('Network error suspending user:', error);
    }
  };

  const handleBanUser = async (userId: number) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/users/${userId}/ban`, { method: 'PATCH' });
      if (res.ok) handleRefresh();
    } catch (error) {
      console.error('Network error banning user:', error);
    }
  };

  const handleReinstateUser = async (userId: number) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/users/${userId}/reactivate`, { method: 'PATCH' });
      if (res.ok) setFlaggedUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
    } catch (error) {
      console.error('Network error reinstating user:', error);
    }
  };

  const handleViewUser = async (userId: number, email: string) => {
    setSelectedUserEmail(email);
    setHistoryLoading(true);
    setIsModalVisible(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/users/${userId}/history`);
      if (res.ok) setUserHistory(await res.json());
    } catch (error) {
      console.error('Network error fetching user history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  return {
    stats, flaggedIssues, lostFoundItems, flaggedUsers,
    isLoading, isRefreshing, connectionError, BASE_URL,
    isModalVisible, setIsModalVisible, userHistory, historyLoading, selectedUserEmail,
    isAuditModalVisible, setIsAuditModalVisible, auditLogs, auditLoading,
    isAllRecordsModalVisible, setIsAllRecordsModalVisible, allRecordsLoading, allRecordsTab, setAllRecordsTab, allIssues, allLnfItems,
    handleRefresh, handleViewAuditLogs, handleViewAllRecords,
    handleRemoveIssue, handleKeepIssue, handleOverrideSeverity,
    handleResolveLnf, handleSuspendUser, handleBanUser, handleReinstateUser, handleViewUser,
  };
}
