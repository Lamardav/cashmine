import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AppProviders } from '@/app';
import { colors } from '@/shared/ui';

// expo-router routes live in /app and stay thin; screens are FSD pages in src/pages.
export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppProviders>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      </AppProviders>
    </View>
  );
}
