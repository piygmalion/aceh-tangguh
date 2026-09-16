import { NextResponse } from "next/server";
import { getFirmsHotspots } from "@/lib/nasa-nrt/load";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const { body, status } = await getFirmsHotspots();
  return NextResponse.json(body, {
    status,
    headers:
      status === 200
        ? { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
        : { "Cache-Control": "no-store" },
  });
}
