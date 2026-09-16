import { NextResponse } from "next/server";
import { defaultGibsDate } from "@/lib/nasa-nrt/layers";
import { NASA_NRT_KIND, NASA_NRT_VALIDATION } from "@/lib/nasa-nrt/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const defaultDate = defaultGibsDate();
  return NextResponse.json(
    {
      kind: NASA_NRT_KIND,
      official: false,
      validation: NASA_NRT_VALIDATION,
      defaultDate,
      source: "utc-yesterday",
    },
    {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
