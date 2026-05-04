import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
//import { Stack, useRouter } from 'expo-router';
//<Stack.Screen options={{ title: 'Terms of Service' }} />


export default function TermsScreen() {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.updated}>Last updated: May 2026</Text>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. Acceptable Use</Text>
                <Text style={styles.body}>
                    This app is intended for SUNY Oneonta students, faculty, and staff. You agree to use it only for legitimate campus reporting and lost & found purposes.
                </Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. Accurate Reporting</Text>
                <Text style={styles.body}>
                    You agree to submit only accurate, good-faith reports. False or misleading reports may result in account suspension or ban.
                </Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>3. Account Responsibility</Text>
                <Text style={styles.body}>
                    You are responsible for all activity under your account. Keep your credentials secure and log out on shared devices.
                </Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>4. Privacy</Text>
                <Text style={styles.body}>
                    Your email and report history are stored securely and used only for app functionality. We do not sell your data to third parties.
                </Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>5. Changes</Text>
                <Text style={styles.body}>
                    These terms may be updated at any time. Continued use of the app constitutes acceptance of the updated terms.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    content: { padding: 20, paddingBottom: 40 },
    updated: { fontSize: 13, color: '#999', marginBottom: 16 },
    section: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A5276', marginBottom: 8 },
    body: { fontSize: 15, color: '#444', lineHeight: 22 },
});
