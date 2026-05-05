import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

function BackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 12 }}
    >
      <Ionicons name="chevron-back" size={28} color="#86c1ff" />
      <Text style={{ color: '#86c1ff', fontSize: 17 }}>Back</Text>
    </TouchableOpacity>
  );
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'Sign In', presentation: 'modal' }} />
        <Stack.Screen name="report/new" options={{ title: 'New Report', presentation: 'modal' }} />
        <Stack.Screen name="profile/edit-profile" options={{ title: 'Edit Profile', headerLeft: () => <BackButton /> }} />
        <Stack.Screen name="profile/notifications" options={{ title: 'Notifications', headerLeft: () => <BackButton /> }} />
        <Stack.Screen name="profile/privacy-security" options={{ title: 'Privacy & Security', headerLeft: () => <BackButton /> }} />
        <Stack.Screen name="profile/help-center" options={{ title: 'Help Center', headerLeft: () => <BackButton /> }} />
        <Stack.Screen name="profile/terms" options={{ title: 'Terms of Service', headerLeft: () => <BackButton /> }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
