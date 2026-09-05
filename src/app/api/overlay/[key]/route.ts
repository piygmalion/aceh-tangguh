import { NextResponse } from "next/server";
import { isOverlayLayerKey } from "@/lib/overlay-layers";
import { overlayVectorApiPath } from "@/lib/overlay-paths";
import {
  isOverlayLiveRefreshKey,
  loadOverlayLive,
  OVERLAY_UPSTREAM_FAILURE_BODY,
} from "@/lib/overlay-live";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * G14: live keys only. Static / tiles / maritime stay off this route
 * until a later wave. Cron writes; this handler only reads the ledger.
 */
export async function GET(
  _req: Request,
  { params }: { params: { key: string } },
) {
  const key = params.key;
  if (!isOverlayLayerKey(key) || !isOverlayLiveRefreshKey(key)) {
    let hint: string | undefined;
    if (isOverlayLayerKey(key)) {
      try {
        hint = overlayVectorApiPath(key);
      } catch {
        hint = undefined;
      }
    }
    return NextResponse.json(
      hint ? { error: "Unknown overlay", hint } : { error: "Unknown overlay" },
      { status: 404 },
    );
  }
  try {
    const result = await loadOverlayLive(key);
    return NextResponse.json(result.body, {
      status: result.status,
      headers:
        result.status === 200
          ? { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
          : { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/overlay]", key, err);
    return NextResponse.json(OVERLAY_UPSTREAM_FAILURE_BODY, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
