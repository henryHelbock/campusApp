import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
//import { Stack, useRouter } from 'expo-router'
//<Stack.Screen options={{ title: 'Help Center' }} />

export default function HelpCenterScreen() {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reporting an Issue</Text>
                <Text style={styles.body}>
                    Tap the Reports tab and press the + button to submit a new campus issue. Fill in the category, severity, description, and location. Your report will be visible to other students and reviewed by admins.
                </Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Lost & Found</Text>
                <Text style={styles.body}>
                    Use the Lost & Found tab to post items you've lost or found on campus. Found items can be claimed by other users. Once resolved, items are removed from the active list.
                </Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Campus Map</Text>
                <Text style={styles.body}>
                    The map shows active issue reports across campus. Tap any marker to see details. Use the filters to view issues by category or severity.
                </Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact</Text>
                <Text style={styles.body}>
                    For urgent issues, contact Facilities Management directly at facilities@oneonta.edu or call (607) 436-3000.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    content: { padding: 20, paddingBottom: 40 },
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
