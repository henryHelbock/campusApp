import React, { useState } from "react";
import {
	StyleSheet,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { authAPI, setAuthToken } from "../../src/services/api";

export default function LoginScreen() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [mode, setMode] = useState<"login" | "register">("login");

	//TEMPORARY: Remove this once the backend auth is fully hooked up
	const handleDevBypass = () => {
		setAuthToken("fake-dev-token-123");
		router.replace("/(tabs)");
	};

	const handleSubmit = async () => {
		setError("");
		if (!email.trim()) return setError("Please enter your email address.");
		if (!email.endsWith("@oneonta.edu"))
			return setError("Please use your @oneonta.edu email address.");
		if (!password) return setError("Please enter your password.");
		if (mode === "register" && password.length < 8)
			return setError("Password must be at least 8 characters.");

		setLoading(true);
		try {
			if (mode === "register") {
				await authAPI.register(email.trim().toLowerCase(), password);
				Alert.alert("Account created", "You can now sign in.", [
					{ text: "OK", onPress: () => setMode("login") },
				]);
			} else {
				const res = await authAPI.login(email.trim().toLowerCase(), password);
				setAuthToken(res.token);
				router.replace("/(tabs)");
			}
		} catch (err: any) {
			setError(err.message ?? "Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			<View style={styles.card}>
				{/* Logo */}
				<View style={styles.logoCircle}>
					<Text style={styles.logoText}>CL</Text>
				</View>
				<Text style={styles.title}>
					{mode === "login" ? "Welcome to CampusLens" : "Create an account"}
				</Text>
				<Text style={styles.subtitle}>SUNY Oneonta email required</Text>

				{/* Email */}
				<View style={styles.field}>
					<Text style={styles.label}>School email</Text>
					<TextInput
						style={styles.input}
						placeholder="yourname@oneonta.edu"
						placeholderTextColor="#aaa"
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
						keyboardType="email-address"
						autoCorrect={false}
					/>
				</View>

				{/* Password */}
				<View style={styles.field}>
					<Text style={styles.label}>Password</Text>
					<TextInput
						style={styles.input}
						placeholder={
							mode === "register" ? "Minimum 8 characters" : "••••••••"
						}
						placeholderTextColor="#aaa"
						value={password}
						onChangeText={setPassword}
						secureTextEntry
					/>
				</View>

				{/* Error */}
				{error ? (
					<View style={styles.errorBox}>
						<Text style={styles.errorText}>{error}</Text>
					</View>
				) : null}

				{/* Submit */}
				<TouchableOpacity
					style={[styles.btn, loading && styles.btnDisabled]}
					onPress={handleSubmit}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.btnText}>
							{mode === "login" ? "Sign in" : "Create account"}
						</Text>
					)}
				</TouchableOpacity>

				{/*DEV BYPASS BUTTON - REMOVE FOR PRODUCTION*/}
				<TouchableOpacity
					style={[styles.btn, { backgroundColor: "#e74c3c", marginTop: 10 }]}
					onPress={handleDevBypass}
				>
					<Text style={styles.btnText}>Skip Login (Dev Mode)</Text>
				</TouchableOpacity>

				{/* Toggle mode */}
				<View style={styles.footer}>
					<Text style={styles.footerText}>
						{mode === "login"
							? "Don't have an account? "
							: "Already have an account? "}
					</Text>
					<TouchableOpacity
						onPress={() => {
							setMode((m) => (m === "login" ? "register" : "login"));
							setError("");
						}}
					>
						<Text style={styles.footerLink}>
							{mode === "login" ? "Register" : "Sign in"}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f0f4f8",
		justifyContent: "center",
		padding: 20,
	},
	card: {
		backgroundColor: "#fff",
		borderRadius: 14,
		padding: 28,
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 4,
	},
	logoCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "#1A5276",
		alignSelf: "center",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 14,
	},
	logoText: { color: "#fff", fontSize: 18, fontWeight: "700" },
	title: {
		fontSize: 20,
		fontWeight: "600",
		color: "#1A3D5C",
		textAlign: "center",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 13,
		color: "#888",
		textAlign: "center",
		marginBottom: 22,
	},
	field: { marginBottom: 14 },
	label: {
		fontSize: 11,
		fontWeight: "600",
		color: "#555",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 5,
	},
	input: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		padding: 10,
		fontSize: 14,
		color: "#333",
		backgroundColor: "#fafafa",
	},
	errorBox: {
		backgroundColor: "#FDEDEC",
		borderWidth: 1,
		borderColor: "#E74C3C",
		borderRadius: 8,
		padding: 10,
		marginBottom: 12,
	},
	errorText: { fontSize: 12, color: "#922B21" },
	btn: {
		backgroundColor: "#1A5276",
		borderRadius: 8,
		paddingVertical: 13,
		alignItems: "center",
		marginTop: 4,
	},
	btnDisabled: { backgroundColor: "#aaa" },
	btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
	footer: {
		flexDirection: "row",
		justifyContent: "center",
		marginTop: 18,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: "#eee",
	},
	footerText: { fontSize: 13, color: "#888" },
	footerLink: { fontSize: 13, color: "#1A5276", fontWeight: "600" },
});
