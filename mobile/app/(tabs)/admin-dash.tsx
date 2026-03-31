import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
} from "react-native";

// 1. Define what your database data looks like
interface DashboardStats {
	activeIssues: number;
	flaggedItems: number;
	openLnF: number;
}

interface FlaggedReport {
	report_id: number;
	title: string;
	details: string;
}

interface FlaggedUser {
	user_id: string;
	username: string;
	details: string;
}

export default function AdminDashboardScreen() {
	const [stats, setStats] = useState<DashboardStats>({
		activeIssues: 0,
		flaggedItems: 0,
		openLnF: 0,
	});
	const [flaggedReports, setFlaggedReports] = useState<FlaggedReport[]>([]);
	const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		setTimeout(() => {
			setStats({ activeIssues: 24, flaggedItems: 7, openLnF: 12 });

			setFlaggedReports([
				{
					report_id: 1,
					title: "Fight in dining hall",
					details: "Reported by 3 users - Severe - 2 hours ago",
				},
			]);

			setFlaggedUsers([
				{
					user_id: "user_4630",
					username: "user_4630",
					details: "3 flagged submissions\nLast Active 2 hours ago",
				},
			]);

			setIsLoading(false);
		}, 1000);
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

			{/* Dynamic Summary Boxes */}
			<View style={styles.summaryContainer}>
				<View style={styles.summaryBox}>
					<Text style={styles.summaryTitle}>Active Issues</Text>
					<Text style={styles.summaryNumber}>{stats.activeIssues}</Text>
				</View>
				<View style={styles.summaryBox}>
					<Text style={styles.summaryTitle}>Flagged Items</Text>
					<Text style={styles.summaryNumber}>{stats.flaggedItems}</Text>
				</View>
				<View style={styles.summaryBox}>
					<Text style={styles.summaryTitle}>Open L&F</Text>
					<Text style={styles.summaryNumber}>{stats.openLnF}</Text>
				</View>
			</View>

			{/* Dynamic Flagged Content Section */}
			<Text style={styles.sectionTitle}>Flagged Content - Review Queue</Text>
			{flaggedReports.length === 0 ? (
				<Text style={styles.emptyText}>No flagged items to review.</Text>
			) : (
				flaggedReports.map((report) => (
					<View key={`report-${report.report_id}`} style={styles.card}>
						<View style={styles.cardInfo}>
							<Text style={styles.cardTitle}>
								Issue: &quot;{report.title}&quot;
							</Text>
							<Text style={styles.cardSubtitle}>{report.details}</Text>
						</View>
						<View style={styles.actionButtons}>
							<TouchableOpacity style={styles.buttonPrimary}>
								<Text style={styles.buttonText}>Keep</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.buttonDanger}>
								<Text style={styles.buttonTextDanger}>Remove</Text>
							</TouchableOpacity>
						</View>
					</View>
				))
			)}

			{/* Dynamic User Management Section */}
			<Text style={styles.sectionTitle}>User Management</Text>
			{flaggedUsers.length === 0 ? (
				<Text style={styles.emptyText}>No users require moderation.</Text>
			) : (
				flaggedUsers.map((user) => (
					<View key={`user-${user.user_id}`} style={styles.card}>
						<View style={styles.cardInfo}>
							<Text style={styles.cardTitle}>{user.username}</Text>
							<Text style={styles.cardSubtitle}>{user.details}</Text>
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
		fontSize: 13,
		color: "#aaaaaa",
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
