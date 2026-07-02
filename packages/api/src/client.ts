import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";

/**
 * Single factory for the Supabase client. The app (and only the app) provides
 * the credentials and platform-specific options (e.g. session storage on
 * React Native) — this package never reads platform env vars, so it stays
 * reusable across Expo, web and tests (docs/03-arquitetura.md).
 */
export interface VincApiConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  auth?: NonNullable<SupabaseClientOptions<"public">>["auth"];
}

export function createVincClient(config: VincApiConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: config.auth,
  });
}
