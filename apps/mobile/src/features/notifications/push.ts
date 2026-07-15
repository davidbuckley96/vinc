import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { registerPushToken } from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

import { setCurrentPushToken } from './push-token';

// Show a banner + play a sound when a push arrives with the app in foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** EAS project id — required to obtain an Expo push token (set on the build). */
function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId
  );
}

async function obtainToken(): Promise<string | null> {
  // Real push needs a physical device; simulators/web can't get a token.
  if (!Device.isDevice || Platform.OS === 'web') return null;

  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted && settings.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Vinc',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#6D28D9',
    });
  }

  const id = projectId();
  if (!id) {
    // No EAS project yet (Expo Go dev / no build): plumbing is ready, but a
    // token can't be minted. Skip quietly.
    console.log('[push] no EAS projectId; skipping token registration');
    return null;
  }
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    return data;
  } catch (err) {
    console.log('[push] getExpoPushTokenAsync failed', err);
    return null;
  }
}

/**
 * Registers this device's push token for the signed-in user and routes a
 * tapped notification to the related service. Safe to mount app-wide: it
 * no-ops on web, simulators and when there is no session or EAS build.
 */
export function usePushNotifications() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const router = useRouter();
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase || !userId) return;
    if (registeredFor.current === userId) return;
    let cancelled = false;
    (async () => {
      const token = await obtainToken();
      if (cancelled || !token || !supabase) return;
      try {
        await registerPushToken(supabase, userId, token, Platform.OS);
        registeredFor.current = userId;
        setCurrentPushToken(token);
      } catch (err) {
        console.log('[push] register failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Tapping a push opens the related service.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const gigId = response.notification.request.content.data?.gigId;
      if (typeof gigId === 'string') router.push(`/service/${gigId}`);
    });
    return () => sub.remove();
  }, [router]);
}

/** Mount-anywhere component that runs the push registration hook. */
export function PushRegistrar() {
  usePushNotifications();
  return null;
}

/**
 * On-demand push diagnostic (V-08): runs the exact registration flow and
 * returns a human-readable result, so a tester can SEE why the token isn't
 * minting instead of it failing silently. Also saves the token on success.
 */
export async function pushSelfTest(
  supabaseClient: typeof supabase,
  userId: string | null,
): Promise<string> {
  if (Platform.OS === 'web') return 'Push não funciona no navegador (só no app instalado).';
  if (!Device.isDevice) return 'Precisa de um aparelho real (emulador não gera token).';
  const perm = await Notifications.getPermissionsAsync();
  let granted = perm.granted;
  if (!granted && perm.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return 'Permissão de notificação negada. Ative nas configurações do Android.';
  const id = projectId();
  if (!id) return 'Build sem projectId do EAS — o app não consegue pedir o token.';
  let token: string;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Vinc',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#6D28D9',
      });
    }
    const result = await Notifications.getExpoPushTokenAsync({ projectId: id });
    token = result.data;
  } catch (err) {
    return `Falha ao gerar o token (FCM): ${String((err as Error)?.message ?? err)}`;
  }
  if (!supabaseClient || !userId) {
    return `Token gerado, mas você não está logado para salvá-lo. (${token.slice(0, 18)}…)`;
  }
  try {
    await registerPushToken(supabaseClient, userId, token, Platform.OS);
    setCurrentPushToken(token);
    return `✅ Tudo certo! Notificações ativas. (${token.slice(0, 18)}…)`;
  } catch (err) {
    return `Token gerado, mas falhou ao salvar: ${String((err as Error)?.message ?? err)}`;
  }
}
