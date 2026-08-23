import { NextResponse } from "next/server";
import { loadMarkers } from "@/lib/markers";

export const dynamic = "force-dynamic";

/** Lightweight GET: feature counts by `properties.layer`. */
export async function GET() {
  const fc = await loadMarkers();
  const byLayer: Record<string, number> = {};
  for (const f of fc.features) {
    const key = String(f.properties?.layer ?? "unknown");
    byLayer[key] = (byLayer[key] ?? 0) + 1;
  }
  return NextResponse.json({
    total: fc.features.length,
    byLayer,
    source: fc.source,
  });
}
