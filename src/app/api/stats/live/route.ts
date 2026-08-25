import { NextResponse } from "next/server";
import type { LiveStats } from "@/lib/types";
import { normalizePoskoCount } from "@/lib/live-stats";
import { createServerClient } from "@/lib/supabase/server";
import { LIVE_STATS_FALLBACK } from "@/lib/preview/fallbacks";

export const dynamic = "force-dynamic";

const FALLBACK: LiveStats = {
  ...LIVE_STATS_FALLBACK,
  poskoCount: normalizePoskoCount(LIVE_STATS_FALLBACK.poskoCount),
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ ...FALLBACK, source: "fallback" });
  }

  try {
    const { data: row, error } = await supabase
      .from("live_stats")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ ...FALLBACK, source: "fallback" });
    }

    let reportsLast24h = row.reports_last_24h;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);

    if (!countError && typeof count === "number") {
      reportsLast24h = count;
    }

    const body: LiveStats & { source: string } = {
      activeIncidents: row.active_incidents,
      poskoCount: normalizePoskoCount(row.posko_count),
      reportsLast24h,
      updatedAt: row.updated_at,
      source: "supabase",
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ ...FALLBACK, source: "fallback" });
  }
}
