import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, ActivityIndicator } from "react-native";
import MapView, { Marker, Callout, Circle } from "react-native-maps";
import { CAMPUS_CENTER, CAMPUS_DEFAULT_ZOOM } from "@campusapp/shared";

// 1. Expected data structure from your backend
interface MapIssue {
	id: number;
	category: string;
	severity: string;
	description: string;
	latitude: number;
	longitude: number;
}

export default function CampusMap() {
	const [issues, setIssues] = useState<MapIssue[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Swap 'localhost' for your IPv4 address if testing on a physical device
	const BASE_URL = "http://localhost:3000/api";

	useEffect(() => {
		const fetchIssues = async () => {
			try {
				const response = await fetch(`${BASE_URL}/issues`);
				if (response.ok) {
					const data = await response.json();
					setIssues(data);
				} else {
					console.error("Backend refused to send map data.");
				}
			} catch (error) {
				console.error("Network error fetching map data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchIssues();
	}, []);

	const getSeverityStyles = (severity: string) => {
		switch (severity) {
			case "Large":
				return { fill: "rgba(255, 0, 0, 0.3)", stroke: "rgba(255, 0, 0, 0.8)" }; // Red
			case "Medium":
				return {
					fill: "rgba(255, 165, 0, 0.3)",
					stroke: "rgba(255, 165, 0, 0.8)",
				};
			case "Mild":
				return {
					fill: "rgba(255, 215, 0, 0.3)",
					stroke: "rgba(255, 215, 0, 0.8)",
				};
			default:
				return {
					fill: "rgba(0, 150, 255, 0.3)",
					stroke: "rgba(0, 150, 255, 0.8)",
				};
		}
	};

	if (isLoading) {
		return (
			<View style={[styles.map, styles.centerEverything]}>
				<ActivityIndicator size="large" color="#333333" />
				<Text style={styles.loadingText}>Loading campus map...</Text>
			</View>
		);
	}

	return (
		<MapView
			style={styles.map}
			initialRegion={{
				latitude: CAMPUS_CENTER.latitude,
				longitude: CAMPUS_CENTER.longitude,
				...CAMPUS_DEFAULT_ZOOM,
			}}
			showsUserLocation
			showsCompass
			showsScale
		>
			{/* 3. Layer the Circles and Markers */}
			{issues.map((issue) => {
				const mapStyles = getSeverityStyles(issue.severity);
				const lat = Number(issue.latitude);
				const lng = Number(issue.longitude);

				return (
					<React.Fragment key={`issue-group-${issue.id}`}>
						<Circle
							center={{ latitude: lat, longitude: lng }}
							radius={40}
							fillColor={mapStyles.fill}
							strokeColor={mapStyles.stroke}
							strokeWidth={1}
						/>

						<Marker
							coordinate={{ latitude: lat, longitude: lng }}
							pinColor={
								issue.severity === "Large"
									? "red"
									: issue.severity === "Medium"
										? "orange"
										: "gold"
							}
						>
							<Callout>
								<View style={calloutStyles.container}>
									<Text style={calloutStyles.title}>
										{issue.category} Issue
									</Text>
									<Text style={calloutStyles.desc}>{issue.description}</Text>
								</View>
							</Callout>
						</Marker>
					</React.Fragment>
				);
			})}
		</MapView>
	);
}

const styles = StyleSheet.create({
	map: {
		flex: 1,
	},
	centerEverything: {
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f5f5f5",
	},
	loadingText: {
		marginTop: 12,
		color: "#666",
	},
});

const calloutStyles = StyleSheet.create({
	container: {
		padding: 10,
		minWidth: 150,
	},
	title: {
		fontWeight: "bold",
		fontSize: 16,
		marginBottom: 4,
	},
	desc: {
		fontSize: 14,
		color: "#555",
	},
});
