"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./public-env";
import type { Database } from "./types";

export type AuthSupabaseClient = SupabaseClient<Database>;

/**
 * Cookie-aware browser client for sign-in / sign-out / session.
 * Distinct from the public anon client in `./client.ts`.
 */
export function createAuthBrowserClient(): AuthSupabaseClient | null {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) return null;
  return createBrowserClient<Database>(url, anonKey);
}
