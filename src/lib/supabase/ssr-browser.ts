"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type AuthSupabaseClient = SupabaseClient<Database>;

/**
 * Cookie-aware browser client for sign-in / sign-out / session.
 * Distinct from the public anon client in `./client.ts`.
 */
export function createAuthBrowserClient(): AuthSupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return createBrowserClient<Database>(url, anonKey);
}
