import { NextResponse } from "next/server";
import { fetchSentinelStatus } from "@/lib/sentinel";

export const dynamic = "force-dynamic";
export const revalidate = 21600;

export async function GET() {
  try {
    const data = await fetchSentinelStatus();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sentinel status failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
