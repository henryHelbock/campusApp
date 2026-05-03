import React, { useState } from 'react';
import {
    ScrollView, View, Text, TextInput,
    TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { authAPI } from '../../src/services/api';
<Stack.Screen options={{ title: 'Edit Profile', headerBackTitle: 'Back' }} />

export default function EditProfileScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter a new email address.');
            return;
        }
        setIsLoading(true);
        try {
            await authAPI.updateEmail(email.trim());
            Alert.alert('Success', 'Email updated successfully.', [
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
            <Text style={styles.label}>New Email Address</Text>
            <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="yourname@oneonta.edu"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
            />
            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={isLoading}>
                {isLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>Save Changes</Text>
                }
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    content: { padding: 20, paddingBottom: 40 },
    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
    input: {
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#1A5276',
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
