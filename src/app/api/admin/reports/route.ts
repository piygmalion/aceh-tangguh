import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireModuleApi, sanitizeSearch } from "@/lib/auth/admin";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { authorizeLegacyReports } from "@/lib/sik/laporan-scope";
import type { ReportRow, ReportStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUSES: ReportStatus[] = ["queued", "published", "rejected"];

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["queued", "published", "rejected"]),
});

function toApiItem(row: ReportRow) {
  return {
    id: row.id,
    topic: row.topic,
    description: row.description,
    longitude: row.longitude,
    latitude: row.latitude,
    placeName: row.place_name ?? undefined,
    consentMapDisplay: row.consent_map_display,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireModuleApi("moderasi");
  if (!auth.ok) return auth.response;
  const legacy = authorizeLegacyReports(auth.profile);
  if (!legacy.ok) return NextResponse.json({ error: legacy.error }, { status: legacy.status });

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status")?.trim();
  const q = sanitizeSearch(sp.get("q") ?? "");
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "20") || 20));
  const summary = sp.get("summary") === "1";

  if (summary) {
    const counts: Record<ReportStatus, number> = {
      queued: 0,
      published: 0,
      rejected: 0,
    };
    for (const s of STATUSES) {
      const { count } = await auth.supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      counts[s] = count ?? 0;
    }
    return NextResponse.json({
      counts,
      total: counts.queued + counts.published + counts.rejected,
    });
  }

  let query = auth.supabase
    .from("reports")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status && STATUSES.includes(status as ReportStatus)) {
    query = query.eq("status", status as ReportStatus);
  }
  if (q) {
    query = query.or(
      `description.ilike.%${q}%,place_name.ilike.%${q}%,topic.ilike.%${q}%`
    );
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({
    items: (data ?? []).map(toApiItem),
    total: count ?? 0,
    page,
    pageSize,
  });
}

export async function PATCH(req: NextRequest) {
  const cross = rejectCrossOrigin(req);
  if (cross) return cross;

  const auth = await requireModuleApi("moderasi");
  if (!auth.ok) return auth.response;
  const legacy = authorizeLegacyReports(auth.profile);
  if (!legacy.ok) return NextResponse.json({ error: legacy.error }, { status: legacy.status });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("reports")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({ item: toApiItem(data) });
}
