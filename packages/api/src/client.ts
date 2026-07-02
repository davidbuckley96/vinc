import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single factory for the Supabase client. The app (and only the app) provides
 * the credentials — this package never reads platform-specific env vars, so it
 * stays reusable across Expo, web and tests (docs/03-arquitetura.md).
 */
export interface VincApiConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function createVincClient(config: VincApiConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey);
}
