import { NextResponse } from "next/server";
import { getPerairanOverlay } from "@/lib/maritime";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** BMKG Maritim perairan Aceh — geometry fixture + live forecast merge. */
export async function GET() {
  try {
    const fc = await getPerairanOverlay();
    return NextResponse.json(fc, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    console.error("[api/overlay/maritime/perairan]", err);
    return NextResponse.json(
      { type: "FeatureCollection", features: [], stale: true, source: "bmkg-maritim" },
      { status: 200 },
    );
  }
}
