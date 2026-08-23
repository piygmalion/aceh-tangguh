import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import type { FeatureCollection } from "geojson";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const file = path.join(process.cwd(), "public/fixtures/markers.geojson");
  const raw = await readFile(file, "utf8");
  const fc = JSON.parse(raw) as FeatureCollection;
  const keysParam = req.nextUrl.searchParams.get("keys");
  if (!keysParam) return NextResponse.json(fc);
  const keys = new Set(keysParam.split(",").map((s) => s.trim()).filter(Boolean));
  return NextResponse.json({
    type: "FeatureCollection",
    features: fc.features.filter((f) => keys.has(String(f.properties?.layer ?? ""))),
  });
}
