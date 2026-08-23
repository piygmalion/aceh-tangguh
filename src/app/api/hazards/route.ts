import { NextResponse } from "next/server";
import type { HazardStatus } from "@/lib/types";
import { createServerClient } from "@/lib/supabase/server";
import { HAZARD_STATUS_FALLBACK } from "@/lib/preview/fallbacks";

export const dynamic = "force-dynamic";

const FALLBACK: HazardStatus[] = HAZARD_STATUS_FALLBACK;

const SEVERITY_ORDER: Record<string, number> = {
  high: 0,
  med: 1,
  low: 2,
};

export async function GET() {
  const supabase = createServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("hazard_status").select("*");

    if (!error && data && data.length > 0) {
      const body: HazardStatus[] = data
        .map((row) => ({
          kind: row.kind,
          label: row.label,
          count: row.count,
          severity: row.severity ?? undefined,
        }))
        .sort((a, b) => {
          const sa = SEVERITY_ORDER[a.severity ?? "low"] ?? 9;
          const sb = SEVERITY_ORDER[b.severity ?? "low"] ?? 9;
          if (sa !== sb) return sa - sb;
          return a.label.localeCompare(b.label);
        });
      return NextResponse.json(body);
    }
  }

  return NextResponse.json(FALLBACK);
}
