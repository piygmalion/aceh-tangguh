import { NextResponse } from "next/server";
import { bearerMatches } from "@/lib/security/bearer";
import { isEarthEngineConfigured } from "@/lib/weather-inovasi/ee-config";
import { emptyInovasiResponse } from "@/lib/weather-inovasi/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Bearer cron for the inovasi lane only.
 * Does not call BMKG or the official weather service.
 * Does not write invented kabupaten weather; ingest is the data script.
 */
export async function POST(request: Request) {
  const secret = process.env.WEATHER_INOVASI_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEarthEngineConfigured()) {
    return NextResponse.json(
      { ...emptyInovasiResponse("unconfigured"), error: "Earth Engine not configured" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      ...emptyInovasiResponse("upstream"),
      error: "upstream",
      note: "Use scripts/build-weather-inovasi-snapshot.mjs after allowlist; this route does not invent points.",
    },
    { status: 503 },
  );
}
