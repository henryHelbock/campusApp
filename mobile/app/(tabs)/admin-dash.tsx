import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Modal,
} from "react-native";

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

export default function AdminDashboardScreen() {
	const [stats, setStats] = useState<DashboardStats>({
		activeIssues: 0,
		flaggedItems: 0,
		openLnF: 0,
	});
	const [flaggedIssues, setFlaggedIssues] = useState<FlaggedIssue[]>([]);
	const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [userHistory, setUserHistory] = useState<HistoryItem[]>([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [selectedUserEmail, setSelectedUserEmail] = useState("");

	// IMPORTANT: Replace this with your actual IPv4 address or ngrok URL when testing on a physical device!
	const BASE_URL = "http://localhost:3000/api/admin";

	// --- ISSUE ACTIONS ---
	const handleRemoveIssue = async (issueId: number) => {
		try {
			const response = await fetch(`${BASE_URL}/issues/${issueId}`, {
				method: "DELETE",
			});

			if (response.ok) {
				setFlaggedIssues((prevIssues) =>
					prevIssues.filter((issue) => issue.id !== issueId),
				);
			} else {
				console.error("Backend refused to delete the issue.");
			}
		} catch (error) {
			console.error("Network error when trying to delete:", error);
		}
	};

	const handleKeepIssue = async (issueId: number) => {
		try {
			const response = await fetch(`${BASE_URL}/issues/${issueId}/dismiss`, {
				method: "PATCH",
			});

			if (response.ok) {
				setFlaggedIssues((prevIssues) =>
					prevIssues.filter((issue) => issue.id !== issueId),
				);
			} else {
				console.error("Backend refused to dismiss the flag.");
			}
		} catch (error) {
			console.error("Network error when trying to keep:", error);
		}
	};

	// --- USER ACTIONS ---
	const handleSuspendUser = async (userId: number) => {
		try {
			const response = await fetch(`${BASE_URL}/users/${userId}/suspend`, {
				method: "PATCH",
			});

			if (response.ok) {
				setFlaggedUsers((prevUsers) =>
					prevUsers.map((user) =>
						user.id === userId ? { ...user, status: "suspended" } : user,
					),
				);
			} else {
				console.error("Backend refused to suspend the user.");
			}
		} catch (error) {
			console.error("Network error when trying to suspend:", error);
		}
	};

	const handleBanUser = async (userId: number) => {
		try {
			const response = await fetch(`${BASE_URL}/users/${userId}/ban`, {
				method: "PATCH",
			});
			if (response.ok) {
				setFlaggedUsers((prevUsers) =>
					prevUsers.map((user) =>
						user.id === userId ? { ...user, status: "banned" } : user,
					),
				);
				setFlaggedIssues((prevIssues) =>
					prevIssues.filter((issue) => issue.reporter_id !== userId),
				);

				const statsRes = await fetch(`${BASE_URL}/analytics?t=${Date.now()}`, {
					headers: { "Cache-Control": "no-cache, no-store" },
				});
				const freshStats = await statsRes.json();
				setStats(freshStats);
			}
		} catch (error) {
			console.error("Network error when trying to ban:", error);
		}
	};

	const handleReinstateUser = async (userId: number) => {
		try {
			const response = await fetch(`${BASE_URL}/users/${userId}/reactivate`, {
				method: "PATCH",
			});
			if (response.ok) {
				setFlaggedUsers((prevUsers) =>
					prevUsers.map((user) =>
						user.id === userId ? { ...user, status: "active" } : user,
					),
				);
			}
		} catch (error) {
			console.error("Network error when trying to reinstate user:", error);
		}
	};

	const handleViewUser = async (userId: number, email: string) => {
		setSelectedUserEmail(email);
		setHistoryLoading(true);
		setIsModalVisible(true);
		try {
			const response = await fetch(`${BASE_URL}/users/${userId}/history`);
			if (response.ok) {
				const historyData = await response.json();
				setUserHistory(historyData);
			} else {
				console.error("Backend refused to provide user history.");
			}
		} catch (error) {
			console.error("Network error when trying to fetch history:", error);
		} finally {
			setHistoryLoading(false);
		}
	};

	// --- FETCH DATA ---
	useEffect(() => {
		const fetchAdminData = async () => {
			try {
				const [statsRes, issuesRes, usersRes] = await Promise.all([
					fetch(`${BASE_URL}/analytics`),
					fetch(`${BASE_URL}/moderation-queue`),
					fetch(`${BASE_URL}/users`),
				]);

				const statsData = await statsRes.json();
				const issuesData = await issuesRes.json();
				const usersData = await usersRes.json();

				setStats(statsData);
				setFlaggedIssues(issuesData);
				setFlaggedUsers(usersData);
			} catch (error) {
				console.error("❌ Failed to fetch admin data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAdminData();
	}, []);

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

			{/* Flagged Content Section */}
			<Text style={styles.sectionTitle}>Flagged Content - Review Queue</Text>

			{!flaggedIssues ||
			!Array.isArray(flaggedIssues) ||
			flaggedIssues.length === 0 ? (
				<Text style={styles.emptyText}>No flagged items to review.</Text>
			) : (
				flaggedIssues.map((issue) => (
					<View key={`issue-${issue.id}`} style={styles.card}>
						<View style={styles.cardInfo}>
							<Text style={styles.cardTitle}>
								{issue.category} Issue ({issue.severity})
							</Text>
							<Text style={styles.cardSubtitle}>
								&quot;{issue.description}&quot;
							</Text>
							<Text style={styles.warningText}>
								Reported by {issue.report_count} users
							</Text>
						</View>
						<View style={styles.actionButtons}>
							<TouchableOpacity
								style={styles.buttonPrimary}
								onPress={() => handleKeepIssue(issue.id)}
							>
								<Text style={styles.buttonText}>Keep</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.buttonDanger}
								onPress={() => handleRemoveIssue(issue.id)}
							>
								<Text style={styles.buttonTextDanger}>Remove</Text>
							</TouchableOpacity>
						</View>
					</View>
				))
			)}

			{/* User Management Section */}
			<Text style={styles.sectionTitle}>User Management</Text>

			{!flaggedUsers ||
			!Array.isArray(flaggedUsers) ||
			flaggedUsers.length === 0 ? (
				<Text style={styles.emptyText}>No users require moderation.</Text>
			) : (
				flaggedUsers.map((user) => (
					<View key={`user-${user.id}`} style={styles.card}>
						<View style={styles.cardInfo}>
							<Text style={styles.cardTitle}>{user.email}</Text>
							<Text style={styles.cardSubtitle}>
								Account Status: {user.status}
							</Text>
						</View>
						<View style={styles.actionButtons}>
							<TouchableOpacity
								style={styles.buttonPrimary}
								onPress={() => handleViewUser(user.id, user.email)}
							>
								<Text style={styles.buttonText}>View</Text>
							</TouchableOpacity>

							{user.status === "banned" && (
								<TouchableOpacity
									style={[
										styles.buttonPrimary,
										{ backgroundColor: "#4caf50", borderColor: "#4caf50" },
									]}
									onPress={() => handleReinstateUser(user.id)}
								>
									<Text style={styles.buttonText}>Reinstate</Text>
								</TouchableOpacity>
							)}

							{user.status === "suspended" && (
								<TouchableOpacity
									style={[
										styles.buttonPrimary,
										{ backgroundColor: "#4caf50", borderColor: "#4caf50" },
									]}
									onPress={() => handleReinstateUser(user.id)}
								>
									<Text style={styles.buttonText}>Reinstate</Text>
								</TouchableOpacity>
							)}

							{user.status === "active" && (
								<TouchableOpacity
									style={[styles.buttonDanger, { borderColor: "#ffb74d" }]}
									onPress={() => handleSuspendUser(user.id)}
								>
									<Text style={[styles.buttonTextDanger, { color: "#ffb74d" }]}>
										Suspend
									</Text>
								</TouchableOpacity>
							)}

							{user.status !== "banned" && (
								<TouchableOpacity
									style={[styles.buttonDanger, { borderColor: "#f44336" }]}
									onPress={() => handleBanUser(user.id)}
								>
									<Text style={styles.buttonTextDanger}>Ban</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
				))
			)}

			{/* User History Modal */}
			<Modal
				visible={isModalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setIsModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>{selectedUserEmail}</Text>
						<TouchableOpacity onPress={() => setIsModalVisible(false)}>
							<Text style={styles.closeText}>Close</Text>
						</TouchableOpacity>
					</View>

					{historyLoading ? (
						<View style={[styles.centerEverything, { flex: 1 }]}>
							<ActivityIndicator
								size="large"
								color="#ffffff"
								style={{ marginTop: 40 }}
							/>
						</View>
					) : (
						<ScrollView style={styles.modalContent}>
							<Text style={styles.sectionTitle}>User History</Text>

							{userHistory.length === 0 ? (
								<Text style={styles.emptyText}>
									This user has no history to display.
								</Text>
							) : (
								userHistory.map((item, index) => (
									<View
										key={`history-${item.record_type}-${item.id}-${index}`}
										style={styles.historyCard}
									>
										<View style={styles.historyHeader}>
											<Text style={styles.historyTitle}>
												{item.record_type === "lost" ||
												item.record_type === "found"
													? "🔍 "
													: "⚠️ "}
												{item.title}
											</Text>
											<Text
												style={[
													styles.historyStatus,
													item.status === "active"
														? styles.statusActive
														: styles.statusArchived,
												]}
											>
												{item.status.toUpperCase()}
											</Text>
										</View>
										<Text style={styles.historyDesc}>
											&quot;{item.description}&quot;
										</Text>
										<View style={styles.historyFooter}>
											<Text style={styles.historyType}>
												Type: {item.record_type.toUpperCase()}
												{item.severity !== "N/A"
													? ` | Severity: ${item.severity}`
													: ""}
											</Text>
											<Text style={styles.historyDate}>
												{new Date(item.created_at).toLocaleDateString()}
											</Text>
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
	container: {
		flex: 1,
		backgroundColor: "#121212",
		padding: 16,
	},
	centerEverything: {
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		color: "#aaaaaa",
		marginTop: 12,
	},
	emptyText: {
		color: "#666666",
		fontStyle: "italic",
		marginBottom: 24,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 24,
		marginTop: 40,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#ffffff",
	},
	headerRole: {
		fontSize: 16,
		color: "#aaaaaa",
	},
	summaryContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 32,
	},
	summaryBox: {
		flex: 1,
		backgroundColor: "#1e1e1e",
		padding: 12,
		marginHorizontal: 4,
		borderRadius: 8,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#333333",
	},
	summaryTitle: {
		fontSize: 12,
		color: "#bbbbbb",
		textAlign: "center",
		marginBottom: 4,
	},
	summaryNumber: {
		fontSize: 22,
		fontWeight: "bold",
		color: "#ffffff",
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#ffffff",
		marginBottom: 12,
	},
	card: {
		backgroundColor: "#1e1e1e",
		borderRadius: 8,
		padding: 16,
		marginBottom: 24,
		borderWidth: 1,
		borderColor: "#333333",
		flexDirection: "column",
	},
	cardInfo: {
		marginBottom: 16,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: "500",
		color: "#ffffff",
		marginBottom: 4,
	},
	cardSubtitle: {
		fontSize: 14,
		color: "#aaaaaa",
		marginBottom: 4,
	},
	warningText: {
		fontSize: 13,
		color: "#cf6679",
		fontWeight: "500",
	},
	actionButtons: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: 12,
	},
	buttonPrimary: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 6,
		backgroundColor: "#333333",
		borderWidth: 1,
		borderColor: "#555555",
	},
	buttonDanger: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 6,
		backgroundColor: "transparent",
		borderWidth: 1,
		borderColor: "#cf6679",
	},
	buttonText: {
		color: "#ffffff",
		fontWeight: "600",
	},
	buttonTextDanger: {
		color: "#cf6679",
		fontWeight: "600",
	},
	modalContainer: {
		flex: 1,
		backgroundColor: "#121212",
		padding: 20,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#333333",
		marginBottom: 16,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#ffffff",
	},
	closeText: {
		color: "#6bb8ff",
		fontSize: 16,
		fontWeight: "500",
	},
	modalContent: {
		flex: 1,
	},
	historyCard: {
		backgroundColor: "#1e1e1e",
		borderRadius: 8,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: "#333333",
	},
	historyHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	historyTitle: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#ffffff",
	},
	historyStatus: {
		fontSize: 12,
		fontWeight: "bold",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		overflow: "hidden",
	},
	statusActive: {
		backgroundColor: "#4caf50",
		color: "#ffffff",
	},
	statusArchived: {
		backgroundColor: "#555555",
		color: "#ffffff",
	},
	historyDesc: {
		fontSize: 14,
		color: "#aaaaaa",
		marginBottom: 12,
		fontStyle: "italic",
	},
	historyFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	historyType: {
		fontSize: 12,
		color: "#bbbbbb",
	},
	historyDate: {
		fontSize: 12,
		color: "#666666",
	},
});
