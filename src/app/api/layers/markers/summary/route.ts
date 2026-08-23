import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { FeatureCollection } from "geojson";

export const dynamic = "force-dynamic";

/** Lightweight GET: feature counts by `properties.layer` from markers.geojson (debug). */
export async function GET() {
  const file = path.join(process.cwd(), "public/fixtures/markers.geojson");
  const raw = await readFile(file, "utf8");
  const fc = JSON.parse(raw) as FeatureCollection;
  const byLayer: Record<string, number> = {};
  for (const f of fc.features) {
    const key = String(f.properties?.layer ?? "unknown");
    byLayer[key] = (byLayer[key] ?? 0) + 1;
  }
  return NextResponse.json({
    total: fc.features.length,
    byLayer,
    source: "fixtures/markers.geojson",
  });
}
