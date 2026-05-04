import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, Switch, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
//import { Stack, useRouter } from 'expo-router';
//<Stack.Screen options={{ title: 'Notifications' }} />

const PREFS_KEY = 'notification_prefs';

const DEFAULT_PREFS = {
    newIssuesNearby: true,
    issueStatusUpdates: true,
    lostFoundMatches: true,
    adminAnnouncements: true,
};

type Prefs = typeof DEFAULT_PREFS;

export default function NotificationsScreen() {
    const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

    useEffect(() => {
        SecureStore.getItemAsync(PREFS_KEY).then(raw => {
            if (raw) setPrefs(JSON.parse(raw));
        });
    }, []);

    const toggle = async (key: keyof Prefs) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(updated));
    };

    const rows: { key: keyof Prefs; label: string; description: string }[] = [
        { key: 'newIssuesNearby', label: 'New Issues Nearby', description: 'Get notified when a new issue is reported near your location.' },
        { key: 'issueStatusUpdates', label: 'Issue Status Updates', description: 'Get notified when an issue you reported is resolved or archived.' },
        { key: 'lostFoundMatches', label: 'Lost & Found Matches', description: 'Get notified when a found item matches something you reported lost.' },
        { key: 'adminAnnouncements', label: 'Admin Announcements', description: 'Receive important announcements from campus administrators.' },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {rows.map(({ key, label, description }) => (
                <View key={key} style={styles.row}>
                    <View style={styles.rowText}>
                        <Text style={styles.label}>{label}</Text>
                        <Text style={styles.description}>{description}</Text>
                    </View>
                    <Switch
                        value={prefs[key]}
                        onValueChange={() => toggle(key)}
                        trackColor={{ false: '#ddd', true: '#1A5276' }}
                        thumbColor="#fff"
                    />
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    content: { padding: 20, paddingBottom: 40 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    rowText: { flex: 1, marginRight: 12 },
    label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
    description: { fontSize: 13, color: '#888', lineHeight: 18 },
});
