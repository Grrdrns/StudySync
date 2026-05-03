import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-get-random-values';
import 'react-native-reanimated';

import { FirebaseProvider } from '@/contexts/FirebaseContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

function RootLayoutNav() {
  const { isDark } = useTheme();
  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" backgroundColor={isDark ? '#0B1120' : '#FFFFFF'} />
    </NavThemeProvider>
  );
}

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <FirebaseProvider>
        <RootLayoutNav />
      </FirebaseProvider>
    </ThemeProvider>
  );
}
