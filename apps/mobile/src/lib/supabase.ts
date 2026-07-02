import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { createVincClient } from '@vinc/api';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * False while the Supabase project isn't configured (docs/07 #14). The app
 * then runs in demo mode: mock data, auth screen shows a friendly notice.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createVincClient({
      supabaseUrl: url!,
      supabaseAnonKey: anonKey!,
      auth: {
        // PKCE + manual URL handling are required for the native OAuth flow.
        flowType: 'pkce',
        detectSessionInUrl: Platform.OS === 'web',
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;
