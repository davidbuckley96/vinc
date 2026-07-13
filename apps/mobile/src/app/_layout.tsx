import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { PayoutOnboardingGate } from '@/features/auth/components/payout-onboarding-gate';
import { WelcomeGate } from '@/features/auth/components/welcome-gate';
import { SessionProvider } from '@/features/auth/session-context';
import { PushRegistrar } from '@/features/notifications/push';

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

  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={navigationTheme}>
          <PayoutOnboardingGate />
          <WelcomeGate />
          <PushRegistrar />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="gig/[id]" />
            <Stack.Screen name="service/[id]" />
            <Stack.Screen name="review/[gigId]" />
            <Stack.Screen name="user/[id]" />
          </Stack>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
