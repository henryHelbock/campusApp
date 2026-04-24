import React, { useState, useEffect, useCallback } from "react";
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
} from "react-native";
import { API_BASE } from "../../src/services/api";
import * as SecureStore from "expo-secure-store";

interface DashboardStats {
    activeIssues: number;
    flaggedItems: number;
    openLnF: number;
}

interface FlaggedIssue {
    id: number;
    category: string;
    severity: string;
    description: string;
    report_count: number;
    reporter_id: number;
}

interface IssueRecord extends FlaggedIssue {
    status: string;
    created_at: string;
}

interface LostFoundItem {
    id: number;
    type: string;
    title: string;
    description: string;
    category: string;
    status: string;
    reporter_id: number;
    created_at: string;
}

interface FlaggedUser {
    id: number;
    email: string;
    status: string;
}

interface HistoryItem {
    id: number;
    record_type: string;
    title: string;
    severity: string;
    description: string;
    status: string;
    created_at: string;
}

interface AuditLogItem {
    id: number;
    action: string;
    affected_content_id: number;
    timestamp: string;
    admin_email: string | null;
    admin_user_id: number;
}

export default function AdminDashboardScreen() {
    const [stats, setStats] = useState<DashboardStats>({
        activeIssues: 0,
        flaggedItems: 0,
        openLnF: 0,
    });
    const [flaggedIssues, setFlaggedIssues] = useState<FlaggedIssue[]>([]);
    const [lostFoundItems, setLostFoundItems] = useState<LostFoundItem[]>([]);
    const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);
    
    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    
    // User History Modal States
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [userHistory, setUserHistory] = useState<HistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedUserEmail, setSelectedUserEmail] = useState("");

    // Audit Log Modal States
    const [isAuditModalVisible, setIsAuditModalVisible] = useState(false);
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    // ALL Records Database Modal States
    const [isAllRecordsModalVisible, setIsAllRecordsModalVisible] = useState(false);
    const [allRecordsLoading, setAllRecordsLoading] = useState(false);
    const [allRecordsTab, setAllRecordsTab] = useState<"issues" | "lnf">("issues");
    const [allIssues, setAllIssues] = useState<IssueRecord[]>([]);
    const [allLnfItems, setAllLnfItems] = useState<LostFoundItem[]>([]);

    const BASE_URL = `${API_BASE}/admin`;

    const fetchWithAuth = async (url: string, options: any = {}) => {
        const token = await SecureStore.getItemAsync("auth_token");
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
    };

    // --- FETCH MASTER DATA FUNCTION ---
    const fetchAdminData = useCallback(async () => {
        setConnectionError(false);
        try {
            const [statsRes, issuesRes, usersRes, lnfRes] = await Promise.all([
                fetchWithAuth(`${BASE_URL}/analytics`),
                fetchWithAuth(`${BASE_URL}/moderation-queue`),
                fetchWithAuth(`${BASE_URL}/users`),
                fetchWithAuth(`${BASE_URL}/lost-found`),
            ]);

            if (!statsRes.ok || !issuesRes.ok || !usersRes.ok || !lnfRes.ok) {
                throw new Error("One or more requests failed.");
            }

            setStats(await statsRes.json());
            setFlaggedIssues(await issuesRes.json());
            setFlaggedUsers(await usersRes.json());
            setLostFoundItems(await lnfRes.json());
        } catch (error) {
            console.error("❌ Failed to fetch admin data:", error);
            setConnectionError(true);
        }
    }, []);

    // Initial Load
    useEffect(() => {
        fetchAdminData().finally(() => setIsLoading(false));
    }, [fetchAdminData]);

    // Manual Refresh Button
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchAdminData();
        setIsRefreshing(false);
    };

    // Fetch and show Audit Logs
    const handleViewAuditLogs = async () => {
        setIsAuditModalVisible(true);
        setAuditLoading(true);
        try {
            const response = await fetchWithAuth(`${BASE_URL}/audit-log`);
            if (response.ok) {
                setAuditLogs(await response.json());
            }
        } catch (error) {
            console.error("Network error fetching audit logs", error);
        } finally {
            setAuditLoading(false);
        }
    };

    // Fetch and show ALL Database Records
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
            console.error("Network error fetching all records:", error);
        } finally {
            setAllRecordsLoading(false);
        }
    };

    // --- ISSUE ACTIONS ---
    const handleRemoveIssue = async (issueId: number) => {
        try {
            const response = await fetchWithAuth(`${BASE_URL}/issues/${issueId}`, { method: "DELETE" });
            if (response.ok) {
                setFlaggedIssues((prev) => prev.filter((issue) => issue.id !== issueId));
            }
        } catch (error) {
            console.error("Network error when trying to delete:", error);
        }
    };

    const handleKeepIssue = async (issueId: number) => {
        try {
            const response = await fetchWithAuth(`${BASE_URL}/issues/${issueId}/dismiss`, { method: "PATCH" });
            if (response.ok) {
                setFlaggedIssues((prev) => prev.filter((issue) => issue.id !== issueId));
            }
        } catch (error) {
            console.error("Network error when trying to keep:", error);
        }
    };

    // --- LOST & FOUND ACTIONS ---
    const handleResolveLnf = async (itemId: number) => {
        try {
            const response = await fetchWithAuth(`${BASE_URL}/lost-found/${itemId}`, { method: "DELETE" });
            if (response.ok) {
                setLostFoundItems((prev) => prev.filter((item) => item.id !== itemId));
                handleRefresh();
            }
        } catch (error) {
            console.error("Network error when trying to resolve L&F:", error);
        }
    };

    // --- USER ACTIONS ---
    const handleSuspendUser = async (userId: number) => {
        try {
            const response = await fetchWithAuth(`${BASE_URL}/users/${userId}/suspend`, { method: "PATCH" });
            if (response.ok) setFlaggedUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: "suspended" } : u));
        } catch (error) {
            console.error("Network error when trying to suspend:", error);
        }
    };

    const handleBanUser = async (userId: number) => {
        try {
            const response = await fetchWithAuth(`${BASE_URL}/users/${userId}/ban`, { method: "PATCH" });
            if (response.ok) handleRefresh();
        } catch (error) {
            console.error("Network error when trying to ban:", error);
        }
    };

    const handleReinstateUser = async (userId: number) => {
        try {
            const response = await fetchWithAuth(`${BASE_URL}/users/${userId}/reactivate`, { method: "PATCH" });
            if (response.ok) setFlaggedUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: "active" } : u));
        } catch (error) {
            console.error("Network error when trying to reinstate user:", error);
        }
    };

    const handleViewUser = async (userId: number, email: string) => {
        setSelectedUserEmail(email);
        setHistoryLoading(true);
        setIsModalVisible(true);
        try {
            const response = await fetchWithAuth(`${BASE_URL}/users/${userId}/history`);
            if (response.ok) setUserHistory(await response.json());
        } catch (error) {
            console.error("Network error when trying to fetch history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centerEverything]}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>Loading database...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
                <Text style={styles.headerRole}>Admin</Text>
            </View>

            {connectionError && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>Could not connect to the server at {BASE_URL}.</Text>
                </View>
            )}

            {/* Summary Boxes */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Active Issues</Text>
                    <Text style={styles.summaryNumber}>{stats?.activeIssues || 0}</Text>
                </View>
                <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Flagged Items</Text>
                    <Text style={styles.summaryNumber}>{stats?.flaggedItems || 0}</Text>
                </View>
                <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Open L&F</Text>
                    <Text style={styles.summaryNumber}>{stats?.openLnF || 0}</Text>
                </View>
            </View>

            {/* Admin Controls (Logs, Database, Refresh) */}
            <View style={styles.adminControls}>
                <TouchableOpacity style={styles.buttonPrimary} onPress={handleViewAllRecords}>
                    <Text style={styles.buttonText}>Database View</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.buttonPrimary} onPress={handleViewAuditLogs}>
                    <Text style={styles.buttonText}>View Logs</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.buttonPrimary} 
                    onPress={handleRefresh} 
                    disabled={isRefreshing}
                >
                    {isRefreshing ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <Text style={styles.buttonText}>Refresh</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Flagged Content Section (Issues) */}
            <Text style={styles.sectionTitle}>Flagged Content - Issues</Text>

            {!flaggedIssues || flaggedIssues.length === 0 ? (
                <Text style={styles.emptyText}>No flagged issues to review.</Text>
            ) : (
                flaggedIssues.map((issue) => (
                    <View key={`issue-${issue.id}`} style={styles.card}>
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitle}>{issue.category} Issue ({issue.severity})</Text>
                            <Text style={styles.cardSubtitle}>&quot;{issue.description}&quot;</Text>
                            <Text style={styles.warningText}>Reported by {issue.report_count} users</Text>
                        </View>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.buttonPrimary} onPress={() => handleKeepIssue(issue.id)}>
                                <Text style={styles.buttonText}>Keep</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.buttonDanger} onPress={() => handleRemoveIssue(issue.id)}>
                                <Text style={styles.buttonTextDanger}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}

            {/* Lost & Found Queue */}
            <Text style={styles.sectionTitle}>Lost & Found Queue</Text>

            {!lostFoundItems || lostFoundItems.length === 0 ? (
                <Text style={styles.emptyText}>No active Lost & Found items.</Text>
            ) : (
                lostFoundItems.map((item) => (
                    <View key={`lnf-${item.id}`} style={styles.card}>
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitle}>{item.type.toUpperCase()}: {item.title}</Text>
                            <Text style={styles.cardSubtitle}>{item.category} • &quot;{item.description}&quot;</Text>
                        </View>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.buttonDanger} onPress={() => handleResolveLnf(item.id)}>
                                <Text style={styles.buttonTextDanger}>Resolve / Remove</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}

            {/* User Management Section */}
            <Text style={styles.sectionTitle}>User Management</Text>

            {!flaggedUsers || flaggedUsers.length === 0 ? (
                <Text style={styles.emptyText}>No users require moderation.</Text>
            ) : (
                flaggedUsers.map((user) => (
                    <View key={`user-${user.id}`} style={styles.card}>
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitle}>{user.email}</Text>
                            <Text style={styles.cardSubtitle}>Account Status: {user.status}</Text>
                        </View>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.buttonPrimary} onPress={() => handleViewUser(user.id, user.email)}>
                                <Text style={styles.buttonText}>View</Text>
                            </TouchableOpacity>
                            {(user.status === "banned" || user.status === "suspended") && (
                                <TouchableOpacity style={[styles.buttonPrimary, { backgroundColor: "#4caf50", borderColor: "#4caf50" }]} onPress={() => handleReinstateUser(user.id)}>
                                    <Text style={styles.buttonText}>Reinstate</Text>
                                </TouchableOpacity>
                            )}
                            {user.status === "active" && (
                                <TouchableOpacity style={[styles.buttonDanger, { borderColor: "#ffb74d" }]} onPress={() => handleSuspendUser(user.id)}>
                                    <Text style={[styles.buttonTextDanger, { color: "#ffb74d" }]}>Suspend</Text>
                                </TouchableOpacity>
                            )}
                            {user.status !== "banned" && (
                                <TouchableOpacity style={[styles.buttonDanger, { borderColor: "#f44336" }]} onPress={() => handleBanUser(user.id)}>
                                    <Text style={styles.buttonTextDanger}>Ban</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))
            )}

            {/* --- MODALS --- */}

            {/* All Records Database Modal */}
            <Modal visible={isAllRecordsModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsAllRecordsModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Global Database View</Text>
                        <TouchableOpacity onPress={() => setIsAllRecordsModalVisible(false)}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Toggle Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity 
                            style={[styles.tab, allRecordsTab === "issues" && styles.tabActive]} 
                            onPress={() => setAllRecordsTab("issues")}
                        >
                            <Text style={[styles.tabText, allRecordsTab === "issues" && styles.tabTextActive]}>Issue Reports</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tab, allRecordsTab === "lnf" && styles.tabActive]} 
                            onPress={() => setAllRecordsTab("lnf")}
                        >
                            <Text style={[styles.tabText, allRecordsTab === "lnf" && styles.tabTextActive]}>Lost & Found</Text>
                        </TouchableOpacity>
                    </View>

                    {allRecordsLoading ? (
                        <View style={[styles.centerEverything, { flex: 1 }]}>
                            <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 40 }} />
                        </View>
                    ) : (
                        <ScrollView style={styles.modalContent}>
                            {allRecordsTab === "issues" && (
                                allIssues.length === 0 ? (
                                    <Text style={styles.emptyText}>No issues in database.</Text>
                                ) : (
                                    allIssues.map((issue) => (
                                        <View key={`all-issue-${issue.id}`} style={styles.historyCard}>
                                            <View style={styles.historyHeader}>
                                                <Text style={styles.historyTitle}>ID {issue.id} | {issue.category} ({issue.severity})</Text>
                                                <Text style={[styles.historyStatus, issue.status === "active" ? styles.statusActive : styles.statusArchived]}>
                                                    {issue.status.toUpperCase()}
                                                </Text>
                                            </View>
                                            <Text style={styles.historyDesc}>&quot;{issue.description}&quot;</Text>
                                            <View style={styles.historyFooter}>
                                                <Text style={styles.historyType}>Reports: {issue.report_count} | Reporter ID: {issue.reporter_id}</Text>
                                                <Text style={styles.historyDate}>{new Date(issue.created_at).toLocaleDateString()}</Text>
                                            </View>
                                        </View>
                                    ))
                                )
                            )}

                            {allRecordsTab === "lnf" && (
                                allLnfItems.length === 0 ? (
                                    <Text style={styles.emptyText}>No Lost & Found items in database.</Text>
                                ) : (
                                    allLnfItems.map((item) => (
                                        <View key={`all-lnf-${item.id}`} style={styles.historyCard}>
                                            <View style={styles.historyHeader}>
                                                <Text style={styles.historyTitle}>ID {item.id} | {item.type.toUpperCase()}: {item.title}</Text>
                                                <Text style={[styles.historyStatus, item.status === "active" ? styles.statusActive : styles.statusArchived]}>
                                                    {item.status.toUpperCase()}
                                                </Text>
                                            </View>
                                            <Text style={styles.historyDesc}>Category: {item.category} • &quot;{item.description}&quot;</Text>
                                            <View style={styles.historyFooter}>
                                                <Text style={styles.historyType}>Reporter ID: {item.reporter_id}</Text>
                                                <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                            </View>
                                        </View>
                                    ))
                                )
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
                            {auditLogs.length === 0 ? (
                                <Text style={styles.emptyText}>No recent audit logs.</Text>
                            ) : (
                                auditLogs.map((log, index) => (
                                    <View key={`log-${log.id}-${index}`} style={styles.historyCard}>
                                        <View style={styles.historyHeader}>
                                            <Text style={styles.historyTitle}>Action: {log.action}</Text>
                                        </View>
                                        <Text style={styles.historyDesc}>Admin: {log.admin_email || `ID: ${log.admin_user_id}`}</Text>
                                        <View style={styles.historyFooter}>
                                            <Text style={styles.historyType}>Content ID: {log.affected_content_id}</Text>
                                            <Text style={styles.historyDate}>{new Date(log.timestamp).toLocaleString()}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
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
                            <Text style={styles.sectionTitle}>User History</Text>
                            {userHistory.length === 0 ? (
                                <Text style={styles.emptyText}>This user has no history to display.</Text>
                            ) : (
                                userHistory.map((item, index) => (
                                    <View key={`history-${item.record_type}-${item.id}-${index}`} style={styles.historyCard}>
                                        <View style={styles.historyHeader}>
                                            <Text style={styles.historyTitle}>
                                                {item.record_type === "lost" || item.record_type === "found" ? "🔍 " : "⚠️ "}
                                                {item.title}
                                            </Text>
                                            <Text style={[styles.historyStatus, item.status === "active" ? styles.statusActive : styles.statusArchived]}>
                                                {item.status.toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={styles.historyDesc}>&quot;{item.description}&quot;</Text>
                                        <View style={styles.historyFooter}>
                                            <Text style={styles.historyType}>
                                                Type: {item.record_type.toUpperCase()}
                                                {item.severity !== "N/A" ? ` | Severity: ${item.severity}` : ""}
                                            </Text>
                                            <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#121212", padding: 16 },
    centerEverything: { justifyContent: "center", alignItems: "center" },
    loadingText: { color: "#aaaaaa", marginTop: 12 },
    errorBanner: { backgroundColor: "#4a1c1c", borderWidth: 1, borderColor: "#cf6679", borderRadius: 8, padding: 12, marginBottom: 16 },
    errorText: { color: "#cf6679", fontSize: 13 },
    emptyText: { color: "#666666", fontStyle: "italic", marginBottom: 24 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
    headerRole: { fontSize: 16, color: "#aaaaaa" },
    summaryContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
    summaryBox: { flex: 1, backgroundColor: "#1e1e1e", padding: 12, marginHorizontal: 4, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#333333" },
    summaryTitle: { fontSize: 12, color: "#bbbbbb", textAlign: "center", marginBottom: 4 },
    summaryNumber: { fontSize: 22, fontWeight: "bold", color: "#ffffff" },
    adminControls: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: "#ffffff", marginBottom: 12 },
    card: { backgroundColor: "#1e1e1e", borderRadius: 8, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: "#333333", flexDirection: "column" },
    cardInfo: { marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: "500", color: "#ffffff", marginBottom: 4 },
    cardSubtitle: { fontSize: 14, color: "#aaaaaa", marginBottom: 4 },
    warningText: { fontSize: 13, color: "#cf6679", fontWeight: "500" },
    actionButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
    buttonPrimary: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: "#333333", borderWidth: 1, borderColor: "#555555" },
    buttonDanger: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: "transparent", borderWidth: 1, borderColor: "#cf6679" },
    buttonText: { color: "#ffffff", fontWeight: "600" },
    buttonTextDanger: { color: "#cf6679", fontWeight: "600" },
    modalContainer: { flex: 1, backgroundColor: "#121212", padding: 20 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#333333", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
    closeText: { color: "#6bb8ff", fontSize: 16, fontWeight: "500" },
    modalContent: { flex: 1 },
    tabContainer: { flexDirection: "row", marginBottom: 16, backgroundColor: "#1e1e1e", borderRadius: 8, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 6 },
    tabActive: { backgroundColor: "#333333" },
    tabText: { color: "#aaaaaa", fontWeight: "600" },
    tabTextActive: { color: "#ffffff" },
    historyCard: { backgroundColor: "#1e1e1e", borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#333333" },
    historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    historyTitle: { fontSize: 16, fontWeight: "bold", color: "#ffffff" },
    historyStatus: { fontSize: 12, fontWeight: "bold", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
    statusActive: { backgroundColor: "#4caf50", color: "#ffffff" },
    statusArchived: { backgroundColor: "#555555", color: "#ffffff" },
    historyDesc: { fontSize: 14, color: "#aaaaaa", marginBottom: 12, fontStyle: "italic" },
    historyFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    historyType: { fontSize: 12, color: "#bbbbbb" },
    historyDate: { fontSize: 12, color: "#666666" },
});