import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { API_BASE, setAuthToken } from "../../src/services/api";

interface UserProfile {
	email: string;
	totalReports: number;
	resolvedReports: number;
}

export default function ProfileScreen() {
	const router = useRouter();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const token = await SecureStore.getItemAsync("auth_token");
				const response = await fetch(`${API_BASE}/auth/me`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (response.ok) {
					const data = await response.json();
					setProfile(data);
				} else {
					// THIS IS THE MAGIC: Grab the actual error from the backend
					const errorText = await response.text();
					Alert.alert(
						"Backend Error",
						`Status ${response.status}: ${errorText}`,
					);
				}
			} catch (error: any) {
				Alert.alert("Network Error", error.message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchProfile();
	}, []);

	const handleLogout = async () => {
		Alert.alert("Log Out", "Are you sure you want to log out?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Log Out",
				style: "destructive",
				onPress: async () => {
					await SecureStore.deleteItemAsync("auth_token");
					await SecureStore.deleteItemAsync("user_role");

					setAuthToken("");

					router.replace("/auth/login");
				},
			},
		]);
	};

	if (isLoading) {
		return (
			<View
				style={[
					styles.container,
					{ justifyContent: "center", alignItems: "center" },
				]}
			>
				<ActivityIndicator size="large" color="#1A5276" />
			</View>
		);
	}

	// Safely generate display data from the database email
	const email = profile?.email || "student@oneonta.edu";
	const displayName = email.split("@")[0]; // "smithj1@oneonta.edu" -> "smithj1"
	const initial = displayName.charAt(0).toUpperCase();

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.contentContainer}
		>
			{/* 1. Identity Header */}
			<View style={styles.header}>
				<View style={styles.avatarPlaceholder}>
					<Text style={styles.avatarText}>{initial}</Text>
				</View>
				<Text style={styles.userName}>{displayName}</Text>
				<Text style={styles.userEmail}>{email}</Text>
				<TouchableOpacity style={styles.editButton}>
					<Text style={styles.editButtonText}>Edit Profile</Text>
				</TouchableOpacity>
			</View>

			{/* 2. Quick Stats Row */}
			<View style={styles.statsContainer}>
				<View style={styles.statBox}>
					<Text style={styles.statNumber}>{profile?.totalReports || 0}</Text>
					<Text style={styles.statLabel}>Reports</Text>
				</View>
				<View style={styles.statDivider} />
				<View style={styles.statBox}>
					<Text style={styles.statNumber}>{profile?.resolvedReports || 0}</Text>
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
			<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
