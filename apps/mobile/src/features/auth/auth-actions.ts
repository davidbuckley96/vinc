import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { savePayoutAccount } from '@vinc/api';
import type { PixKeyType } from '@vinc/core';

import { clearPushRegistration } from '@/features/notifications/push-token';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export interface AuthResult {
  ok: boolean;
  /** User-facing message (pt-BR) when ok is false. */
  error?: string;
}

const GENERIC_ERROR = 'Não foi possível completar. Verifique os dados e tente de novo.';

function translateAuthError(message: string): string {
  const known: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'User already registered': 'Este e-mail já tem uma conta. Toque em "Entrar".',
    'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 letras ou números.',
    'Unable to validate email address: invalid format': 'Digite um e-mail válido.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).',
  };
  return known[message] ?? GENERIC_ERROR;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'O servidor ainda não foi configurado.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: translateAuthError(error.message) } : { ok: true };
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
  payout: { pixKeyType: PixKeyType; pixKey: string; holderCpf: string },
): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'O servidor ainda não foi configurado.' };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  // Receiving key collected at sign-up (D-038). With email confirmation
  // off the session is live and we save right away; with it on there is
  // no session yet — the mandatory completion screen catches the account
  // on the first sign-in.
  if (data.session && data.user) {
    try {
      const result = await savePayoutAccount(supabase, data.user.id, payout);
      if (result === 'cpf_taken') {
        return { ok: false, error: 'Este CPF já está em uso em outra conta. Cada pessoa pode ter só uma conta.' };
      }
      if (result === 'cpf_banned') {
        return { ok: false, error: 'Este CPF não pode ser usado no Vinc.' };
      }
    } catch {
      // Non-fatal: the completion screen will ask again.
    }
  }
  return { ok: true };
}

/**
 * Google sign-in. On web Supabase handles the redirect; on native we open the
 * provider in a browser session and exchange the returned code (PKCE flow).
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'O servidor ainda não foi configurado.' };

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return error ? { ok: false, error: GENERIC_ERROR } : { ok: true };
  }

  const redirectTo = Linking.createURL('/auth');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { ok: false, error: GENERIC_ERROR };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { ok: false, error: 'Entrada com Google cancelada.' };

  const code = new URL(result.url).searchParams.get('code');
  if (!code) return { ok: false, error: GENERIC_ERROR };

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return exchangeError ? { ok: false, error: GENERIC_ERROR } : { ok: true };
}

export async function signOut(): Promise<void> {
  await clearPushRegistration();
  await supabase?.auth.signOut();
}

