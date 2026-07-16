import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';

import { DemoModeBanner } from '@/components/demo-mode-banner';
import { Colors } from '@/constants/theme';
import { PayoutOnboardingGate } from '@/features/auth/components/payout-onboarding-gate';
import { WelcomeGate } from '@/features/auth/components/welcome-gate';
import { SessionProvider } from '@/features/auth/session-context';
import { PushRegistrar } from '@/features/notifications/push';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initSentry, Sentry } from '@/lib/sentry';
import { PreferencesProvider } from '@/lib/preferences';

// Observabilidade (F-08/D-069): iniciar o mais cedo possível, antes de montar.
initSentry();

SplashScreen.preventAutoHideAsync();
SplashScreen.hideAsync();

function ThemedApp() {
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
          <DemoModeBanner />
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

// PreferencesProvider (tema/notificações) fica no topo para os hooks de
// color-scheme e o PushRegistrar lerem a preferência (D-072 follow-up).
function RootLayout() {
  return (
    <PreferencesProvider>
      <ThemedApp />
    </PreferencesProvider>
  );
}

// Sentry.wrap habilita a captura de erros de renderização e o touch/nav tracking.
export default Sentry.wrap(RootLayout);
