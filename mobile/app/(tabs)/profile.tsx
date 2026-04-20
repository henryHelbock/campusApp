import React from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
} from "react-native";

export default function ProfileScreen() {
	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.contentContainer}
		>
			{/* 1. Identity Header */}
			<View style={styles.header}>
				<View style={styles.avatarPlaceholder}>
					<Text style={styles.avatarText}>AS</Text>
				</View>
				<Text style={styles.userName}>Alex Student</Text>
				<Text style={styles.userEmail}>student@oneonta.edu</Text>
				<TouchableOpacity style={styles.editButton}>
					<Text style={styles.editButtonText}>Edit Profile</Text>
				</TouchableOpacity>
			</View>

			{/* 2. Quick Stats Row */}
			<View style={styles.statsContainer}>
				<View style={styles.statBox}>
					<Text style={styles.statNumber}>12</Text>
					<Text style={styles.statLabel}>Reports</Text>
				</View>
				<View style={styles.statDivider} />
				<View style={styles.statBox}>
					<Text style={styles.statNumber}>3</Text>
					<Text style={styles.statLabel}>Resolved</Text>
				</View>
			</View>

			{/* 3. Settings Menu */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Account</Text>

				<TouchableOpacity style={styles.menuItem}>
					<Text style={styles.menuItemText}>Notification Preferences</Text>
					<Text style={styles.chevron}>›</Text>
				</TouchableOpacity>

				<TouchableOpacity style={styles.menuItem}>
					<Text style={styles.menuItemText}>Privacy & Security</Text>
					<Text style={styles.chevron}>›</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Support</Text>

				<TouchableOpacity style={styles.menuItem}>
					<Text style={styles.menuItemText}>Help Center</Text>
					<Text style={styles.chevron}>›</Text>
				</TouchableOpacity>

				<TouchableOpacity style={styles.menuItem}>
					<Text style={styles.menuItemText}>Terms of Service</Text>
					<Text style={styles.chevron}>›</Text>
				</TouchableOpacity>
			</View>

			{/* 4. Log Out Button */}
			<TouchableOpacity style={styles.logoutButton}>
				<Text style={styles.logoutButtonText}>Log Out</Text>
			</TouchableOpacity>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8f9fa",
	},
	contentContainer: {
		padding: 20,
		paddingBottom: 40,
	},
	header: {
		alignItems: "center",
		marginTop: 20,
		marginBottom: 30,
	},
	avatarPlaceholder: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: "#1A5276",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
	},
	avatarText: {
		fontSize: 36,
		fontWeight: "bold",
		color: "#ffffff",
	},
	userName: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 4,
	},
	userEmail: {
		fontSize: 16,
		color: "#666",
		marginBottom: 16,
	},
	editButton: {
		paddingHorizontal: 20,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: "#e9ecef",
	},
	editButtonText: {
		color: "#333",
		fontWeight: "600",
	},
	statsContainer: {
		flexDirection: "row",
		backgroundColor: "#ffffff",
		borderRadius: 12,
		paddingVertical: 16,
		marginBottom: 30,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	statBox: {
		flex: 1,
		alignItems: "center",
	},
	statDivider: {
		width: 1,
		backgroundColor: "#eee",
	},
	statNumber: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#1A5276",
		marginBottom: 4,
	},
	statLabel: {
		fontSize: 13,
		color: "#666",
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: "#888",
		textTransform: "uppercase",
		letterSpacing: 1,
		marginBottom: 12,
		marginLeft: 4,
	},
	menuItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "#ffffff",
		paddingVertical: 16,
		paddingHorizontal: 16,
		borderRadius: 10,
		marginBottom: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 4,
		elevation: 1,
	},
	menuItemText: {
		fontSize: 16,
		color: "#333",
	},
	chevron: {
		fontSize: 20,
		color: "#ccc",
	},
	logoutButton: {
		marginTop: 10,
		backgroundColor: "#ffeeee",
		paddingVertical: 16,
		borderRadius: 10,
		alignItems: "center",
	},
	logoutButtonText: {
		color: "#e74c3c",
		fontSize: 16,
		fontWeight: "bold",
	},
});
