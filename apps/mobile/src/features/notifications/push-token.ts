import { unregisterPushToken } from '@vinc/api';

import { supabase } from '@/lib/supabase';

/**
 * This device's Expo push token, kept module-side so sign-out can drop it
 * (stop pushes) without pulling the session/notifications graph into
 * auth-actions. Set by the push registration hook.
 */
let currentToken: string | null = null;

export function setCurrentPushToken(token: string | null): void {
  currentToken = token;
}

/** Called on sign-out: removes this device's token for the leaving user. */
export async function clearPushRegistration(): Promise<void> {
  if (supabase && currentToken) {
    try {
      await unregisterPushToken(supabase, currentToken);
    } catch {
      // best-effort; a later login reclaims the token anyway
    }
  }
  currentToken = null;
}
