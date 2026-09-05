import { NextResponse } from "next/server";
import { isInariskRasterKey, inariskExportImageUrl } from "@/lib/inarisk-tiles";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; InaRISK tiles)";

/** A 256px InaRISK hazard tile is a few dozen KB; anything larger is suspect. */
const MAX_TILE_BYTES = 2 * 1024 * 1024;

const EMPTY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64",
);

export async function GET(
  _req: Request,
  { params }: { params: { parts: string[] } },
) {
  const [key, zRaw, xRaw, yRaw] = params.parts ?? [];
  const z = Number(zRaw);
  const x = Number(xRaw);
  const y = Number(String(yRaw ?? "").replace(/\.png$/i, ""));
  if (!isInariskRasterKey(key) || ![z, x, y].every((n) => Number.isInteger(n) && n >= 0)) {
    return new NextResponse("Bad tile", { status: 400 });
  }
  // Reject coordinates outside the tile grid for this zoom so junk requests
  // never reach the upstream ImageServer or pollute the CDN cache.
  if (z > 24 || x >= 2 ** z || y >= 2 ** z) {
    return new NextResponse("Bad tile", { status: 400 });
  }
  if (z < 5 || z > 14) {
    return new NextResponse(EMPTY_PNG, {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
    });
  }
  const url = inariskExportImageUrl(key, z, x, y);
  if (!url) return new NextResponse("Unknown layer", { status: 404 });
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "image/png" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return new NextResponse(EMPTY_PNG, {
        status: 200,
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
      });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    // Upstream returns an ArcGIS error page as JSON/HTML on some failures;
    // never echo a non-image content type back through our own origin.
    const upstreamType = res.headers.get("content-type") ?? "";
    if (!upstreamType.startsWith("image/") || buf.byteLength > MAX_TILE_BYTES) {
      return new NextResponse(EMPTY_PNG, {
        status: 200,
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
      });
    }
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[inarisk-tiles]", key, err);
    return new NextResponse(EMPTY_PNG, {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=120" },
    });
  }
}
