import { NextResponse } from "next/server";
import { loadOverlayVector } from "@/lib/overlay-live";
import { loadPelabuhanGeojson } from "@/lib/maritime";
import { OVERLAY_STATIC_FIXTURES } from "@/lib/overlay-layers";
import type { OverlayLayerKey } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const STATIC_KEYS = new Set<string>(Object.keys(OVERLAY_STATIC_FIXTURES));

function isStaticOverlayKey(key: string): key is OverlayLayerKey {
  return STATIC_KEYS.has(key);
}

export async function GET(
  _req: Request,
  { params }: { params: { key: string } },
) {
  const key = params.key;
  if (!isStaticOverlayKey(key)) {
    return NextResponse.json({ error: "Unknown static overlay" }, { status: 404 });
  }
  try {
    if (key === "maritimePorts") {
      const fc = await loadPelabuhanGeojson();
      return NextResponse.json(fc, {
        headers: { "Cache-Control": "public, s-maxage=3600" },
      });
    }
    const fc = await loadOverlayVector(key);
    return NextResponse.json(fc ?? { type: "FeatureCollection", features: [] }, {
      headers: { "Cache-Control": "public, s-maxage=86400" },
    });
  } catch (err) {
    console.error("[api/overlay/static]", key, err);
    return NextResponse.json(
      { type: "FeatureCollection", features: [], stale: true },
      { status: 200 },
    );
  }
}
