import { NextResponse } from "next/server";
import { ensureExistingHazardKindBuckets } from "@/lib/hazard-kinds";
import { loadMarkers } from "@/lib/markers";
import { HAZARD_STATUS_FALLBACK } from "@/lib/preview/fallbacks";
import { createServerClient } from "@/lib/supabase/server";
import type { HazardStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const FALLBACK: HazardStatus[] = HAZARD_STATUS_FALLBACK;

const SEVERITY_ORDER: Record<string, number> = {
  high: 0,
  med: 1,
  low: 2,
};

function sortHazardStatus(rows: HazardStatus[]): HazardStatus[] {
  return [...rows].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity ?? "low"] ?? 9;
    const sb = SEVERITY_ORDER[b.severity ?? "low"] ?? 9;
    if (sa !== sb) return sa - sb;
    return a.label.localeCompare(b.label);
  });
}

async function existingDisasterJenis(): Promise<string[]> {
  try {
    const fc = await loadMarkers();
    const jenis: string[] = [];
    for (const feature of fc.features) {
      if (String(feature.properties?.layer ?? "") !== "disasterEvents") continue;
      const raw = feature.properties?.jenis_bencana;
      if (typeof raw === "string" && raw.trim()) jenis.push(raw);
    }
    return jenis;
  } catch {
    return [];
  }
}

export async function GET() {
  const jenis = await existingDisasterJenis();
  const supabase = createServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("hazard_status").select("*");

    if (!error && data && data.length > 0) {
      const body: HazardStatus[] = data.map((row) => ({
        kind: row.kind,
        label: row.label,
        count: row.count,
        severity: row.severity ?? undefined,
      }));
      return NextResponse.json(
        sortHazardStatus(ensureExistingHazardKindBuckets(body, jenis))
      );
    }
  }

  return NextResponse.json(
    sortHazardStatus(ensureExistingHazardKindBuckets(FALLBACK, jenis))
  );
}
