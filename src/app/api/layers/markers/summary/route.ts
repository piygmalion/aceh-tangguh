import { NextResponse } from "next/server";
import { loadPublicMarkerCollection, summarizeMarkerLayers } from "../load-public";

export const dynamic = "force-dynamic";

/** Lightweight GET: feature counts by `properties.layer`. */
export async function GET() {
  const fc = await loadPublicMarkerCollection();
  return NextResponse.json(summarizeMarkerLayers(fc));
}
