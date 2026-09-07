import { NextResponse } from "next/server";
import { bearerMatches } from "@/lib/security/bearer";
import { runDailyBriefCron } from "@/lib/daily-brief/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.DAILY_BRIEF_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "DAILY_BRIEF_CRON_SECRET not configured" }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const force = body && typeof body === "object" && "force" in body ? Boolean(body.force) : false;
    const result = await runDailyBriefCron({ force });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "cron failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
