"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./public-env";
import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Browser Supabase client (singleton). Returns null if env is missing.
 */
export function createBrowserClient(): SupabaseClient<Database> | null {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();

  if (!url || !anonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return browserClient;
}
