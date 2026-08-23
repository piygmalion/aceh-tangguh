import { NextRequest, NextResponse } from "next/server";
import { filterMarkersByKeys, loadMarkers } from "@/lib/markers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const fc = await loadMarkers();
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
