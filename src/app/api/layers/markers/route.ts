import { NextRequest, NextResponse } from "next/server";
import { mergeLaporanOverlays } from "@/lib/laporan/peta-features";
import { expandMarkerLayerKeys } from "@/lib/map-url-aliases";
import { filterMarkersByKeys, loadMarkers } from "@/lib/markers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const fc = await mergeLaporanOverlays(await loadMarkers());
  const keysParam = req.nextUrl.searchParams.get("keys");
  if (!keysParam) return NextResponse.json(fc);

  const keys = expandMarkerLayerKeys(
    keysParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return NextResponse.json({
    ...filterMarkersByKeys(fc, keys),
    source: fc.source,
  });
}
