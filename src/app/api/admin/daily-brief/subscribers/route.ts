import { NextRequest, NextResponse } from "next/server";
import { requireModuleApi } from "@/lib/auth/admin";
import { rejectCrossOrigin } from "@/lib/security/origin";
import {
  addSubscriber,
  exportSubscriberCsv,
  listSubscribers,
  updateSubscriberStatus,
} from "@/lib/daily-brief/service";
import type { DailyBriefSubscriberStatus } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

const STATUSES = new Set<DailyBriefSubscriberStatus>(["active", "inactive", "unsubscribed"]);

export async function GET(req: NextRequest) {
  const auth = await requireModuleApi("dailyBrief");
  if (!auth.ok) return auth.response;
  try {
    const format = req.nextUrl.searchParams.get("format");
    if (format === "csv") {
      const csv = await exportSubscriberCsv();
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=daily-brief-subscribers.csv",
        },
      });
    }
    const items = await listSubscribers();
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "load failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireModuleApi("dailyBrief");
  if (!auth.ok) return auth.response;
  try {
    const body = (await req.json()) as { phone?: string; name?: string };
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: "phone_required" }, { status: 400 });
    }
    const item = await addSubscriber({
      phone: body.phone,
      name: body.name,
      createdBy: auth.profile.userId,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireModuleApi("dailyBrief");
  if (!auth.ok) return auth.response;
  try {
    const body = (await req.json()) as { id?: string; status?: string };
    if (!body.id || !body.status || !STATUSES.has(body.status as DailyBriefSubscriberStatus)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    await updateSubscriberStatus(body.id, body.status as DailyBriefSubscriberStatus);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
