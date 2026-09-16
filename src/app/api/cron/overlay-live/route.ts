import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { refreshMaritimeForecasts } from "@/lib/maritime";
import { refreshMaritimeWarnings } from "@/lib/peringatan-dini/maritim";
import { refreshAllOverlayLive } from "@/lib/overlay-live";
import { bearerMatches } from "@/lib/security/bearer";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
/** Hobby cap is 60s. Live fetches run sequentially per layer. */
export const maxDuration = 60;

/**
 * Refresh overlay_live_features from BMKG / MAGMA / Sipongi / Tatonas.
 * Auth: Authorization Bearer OVERLAY_CRON_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.OVERLAY_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "OVERLAY_CRON_SECRET not configured" }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role missing" }, { status: 503 });
  }

  const [result, maritime, warnings] = await Promise.all([
    refreshAllOverlayLive(),
    refreshMaritimeForecasts(),
    refreshMaritimeWarnings(),
  ]);
  revalidateTag("maritime-perairan");
  revalidateTag("peringatan-magma");
  revalidateTag("peringatan-sipongi");
  revalidateTag("peringatan-tatonas");
  const failed = result.layers.filter((layer) => !layer.ok);
  return NextResponse.json({
    refreshed: result.layers.filter((layer) => layer.ok).length,
    failed: failed.length,
    purged: result.purged,
    layers: result.layers,
    maritime: {
      ok: maritime.ok,
      failed: maritime.failed,
      codes: maritime.codes,
    },
    warnings: {
      ok: warnings.ok,
      source: warnings.source,
      count: warnings.count,
    },
  });
}
