import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./public-env";
import type { Database } from "./types";

export type TypedSupabaseClient = SupabaseClient<Database>;

/** Next.js App Router caches fetch by default; Supabase must always be fresh. */
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

/**
 * Server-side Supabase client using the anon key (MVP).
 * Returns null when env is missing so callers can fall back to fixtures.
 */
export function createServerClient(): TypedSupabaseClient | null {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();

  if (!url || !anonKey) {
    return null;
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: noStoreFetch,
    },
  });
}

/** Strict variant — throws if env vars are missing. */
export function createServerClientOrThrow(): TypedSupabaseClient {
  const client = createServerClient();
  if (!client) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return client;
}

/** Service role — laporan writes, storage upload, cron / WA worker (never expose to browser). */
export function createServiceClient(): TypedSupabaseClient | null {
  const url = supabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: noStoreFetch },
  });
}
