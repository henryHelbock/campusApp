import React, { useState } from 'react';
import {
    ScrollView, View, Text, TextInput,
    TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
//import { Stack, useRouter } from 'expo-router';
import { authAPI } from '../../src/services/api';
//<Stack.Screen options={{ title: 'Privacy & Security' }} />
import { useRouter } from 'expo-router';

export default function PrivacySecurityScreen() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match.');
            return;
        }
        setIsLoading(true);
        try {
            await authAPI.updatePassword(currentPassword, newPassword);
            Alert.alert('Success', 'Password updated successfully.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.sectionTitle}>Change Password</Text>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
            />
            <Text style={styles.label}>New Password</Text>
            <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                secureTextEntry
            />
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={isLoading}>
                {isLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>Update Password</Text>
                }
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    content: { padding: 20, paddingBottom: 40 },
    sectionTitle: {
        fontSize: 18, fontWeight: '700', color: '#1A5276', marginBottom: 20,
    },
    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
    input: {
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#1A5276',
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
