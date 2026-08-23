import { NextRequest, NextResponse } from "next/server";
import { laporanKejadianToFeatures } from "@/lib/laporan/peta-features";
import { filterMarkersByKeys, loadMarkers } from "@/lib/markers";

export const dynamic = "force-dynamic";

async function withLaporanKejadian(fc: Awaited<ReturnType<typeof loadMarkers>>) {
  const laporanFeatures = await laporanKejadianToFeatures();
  if (laporanFeatures.length === 0) return fc;

  const existingIds = new Set(fc.features.map((f) => String(f.id ?? "")));
  const merged = laporanFeatures.filter((f) => !existingIds.has(String(f.id)));
  return {
    ...fc,
    features: [...fc.features, ...merged],
  };
}

export async function GET(req: NextRequest) {
  const fc = await withLaporanKejadian(await loadMarkers());
  const keysParam = req.nextUrl.searchParams.get("keys");
  if (!keysParam) return NextResponse.json(fc);

  const keys = keysParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return NextResponse.json({
    ...filterMarkersByKeys(fc, keys),
    source: fc.source,
  });
}
