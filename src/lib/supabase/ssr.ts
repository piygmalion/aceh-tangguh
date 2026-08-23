import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isStaticExport } from "@/lib/preview/env";
import type { Database } from "./types";

export type AuthSupabaseClient = SupabaseClient<Database>;

/**
 * Cookie-aware server client. Uses the user JWT so RLS role checks apply.
 * Returns null when env is missing so the public site still runs.
 */
export function createAuthServerClient(): AuthSupabaseClient | null {
  if (isStaticExport()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;

  const cookieStore = cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always set cookies; middleware refreshes.
        }
      },
    },
  });
}
