import { NextRequest, NextResponse } from "next/server";
import { expandMarkerLayerKeys } from "@/lib/map-url-aliases";
import { filterMarkersByKeys } from "@/lib/markers";
import { loadPublicMarkerCollection } from "./load-public";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const fc = await loadPublicMarkerCollection();
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
