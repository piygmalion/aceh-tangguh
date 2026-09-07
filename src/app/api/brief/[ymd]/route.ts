import { NextResponse } from "next/server";
import { parseBriefYmd } from "@/lib/daily-brief/compose";
import { loadPublicBrief } from "@/lib/daily-brief/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { ymd: string } }
) {
  const ymd = parseBriefYmd(params.ymd);
  if (!ymd) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }
  const summary = await loadPublicBrief(ymd);
  if (!summary) {
    return NextResponse.json({ error: "not_found", briefDate: ymd }, { status: 404 });
  }
  return NextResponse.json(summary, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
