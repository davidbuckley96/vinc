import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { SessionProvider } from '@/features/auth/session-context';

SplashScreen.preventAutoHideAsync();
SplashScreen.hideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const colors = Colors[dark ? 'dark' : 'light'];
  const base = dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.line,
    },
  };

  return (
    <SessionProvider>
      <ThemeProvider value={navigationTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
        </Stack>
      </ThemeProvider>
    </SessionProvider>
  );
}
