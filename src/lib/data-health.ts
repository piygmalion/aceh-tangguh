import { createServerClient } from "@/lib/supabase/server";

/**
 * True when the Node host is serving fixture snapshots instead of live
 * Supabase domain rows (missing client, empty kejadian_bencana, or query error).
 */
export async function isServingFixtureFallback(): Promise<boolean> {
  const client = createServerClient();
  if (!client) return true;

  try {
    const { count, error } = await client
      .from("kejadian_bencana")
      .select("id", { count: "exact", head: true });
    if (error) return true;
    return !count || count < 1;
  } catch {
    return true;
  }
}
