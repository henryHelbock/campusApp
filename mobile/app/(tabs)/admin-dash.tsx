import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
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
}

interface FlaggedUser {
	id: number;
	email: string;
	status: string;
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

	const BASE_URL = "http://localhost:3000/api/admin";

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

				console.log("Stats Data:", statsData);
				console.log("Issues Data:", issuesData);
				console.log("Users Data:", usersData);

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
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Admin Dashboard</Text>
				<Text style={styles.headerRole}>Admin</Text>
			</View>

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
							<TouchableOpacity style={styles.buttonPrimary}>
								<Text style={styles.buttonText}>View</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.buttonDanger}>
								<Text style={styles.buttonTextDanger}>Suspend</Text>
							</TouchableOpacity>
						</View>
					</View>
				))
			)}
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
});
