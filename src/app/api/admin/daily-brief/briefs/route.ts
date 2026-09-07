import { NextRequest, NextResponse } from "next/server";
import { requireModuleApi } from "@/lib/auth/admin";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { enqueueAndSend, upsertDailyBrief } from "@/lib/daily-brief/service";
import { todayJakartaYmd } from "@/lib/sik/kunci-statis";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireModuleApi("dailyBrief");
  if (!auth.ok) return auth.response;
  const client = createServiceClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase service role missing" }, { status: 503 });
  }
  const { data, error } = await client
    .from("daily_briefs")
    .select("id, brief_date, whatsapp_enqueued_at, created_at")
    .order("brief_date", { ascending: false })
    .limit(14);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ items: data ?? [], today: todayJakartaYmd() });
}

export async function POST(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireModuleApi("dailyBrief");
  if (!auth.ok) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as { force?: boolean; send?: boolean };
    const briefDate = todayJakartaYmd();
    const { summary, created } = await upsertDailyBrief(briefDate, { force: Boolean(body.force) });
    let send: { enqueued: number; sent: number; failed: number } | undefined;
    if (body.send) {
      send = await enqueueAndSend(briefDate);
    }
    return NextResponse.json({ briefDate, created, summary, send });
  } catch (err) {
    const message = err instanceof Error ? err.message : "generate failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
