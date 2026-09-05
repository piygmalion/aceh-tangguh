import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi, sanitizeSearch } from "@/lib/auth/admin";
import { canAccessModule, type SikModule } from "@/lib/sik/roles";
import { rejectCrossOrigin } from "@/lib/security/origin";
import type { Database } from "@/lib/supabase/types";
import type { LooseInsert } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

const RESOURCES = {
  instansi: { table: "instansi", module: "master" as SikModule },
  pengungsian: { table: "tempat_pengungsian", module: "master" as SikModule },
  korban: { table: "kejadian_korban", module: "kejadian" as SikModule },
  pengungsi: { table: "pengungsi_terpilah", module: "kejadian" as SikModule },
  kerusakan: { table: "kerusakan_aset", module: "kejadian" as SikModule },
  personil: { table: "personil", module: "logistik" as SikModule },
  peralatan: { table: "peralatan", module: "logistik" as SikModule },
  kebutuhan: { table: "kebutuhan_dasar", module: "logistik" as SikModule },
  distPersonil: { table: "distribusi_personil", module: "logistik" as SikModule },
  distPeralatan: { table: "distribusi_peralatan", module: "logistik" as SikModule },
  distKebutuhan: { table: "distribusi_kebutuhan", module: "logistik" as SikModule },
  nomorPenting: { table: "nomor_penting", module: "publikCms" as SikModule },
  pelatihan: { table: "pelatihan", module: "publikCms" as SikModule },
  permintaanPelatihan: { table: "permintaan_pelatihan", module: "publikCms" as SikModule },
  disabilitas: { table: "disabilitas_agregat", module: "disabilitas" as SikModule },
  rehab: { table: "rehab_kebutuhan", module: "rehab" as SikModule },
  rehabMonitoring: { table: "rehab_monitoring", module: "rehab" as SikModule },
  rehabPenerima: { table: "rehab_penerima", module: "rehab" as SikModule },
} as const;

type ResourceKey = keyof typeof RESOURCES;
type TableName = (typeof RESOURCES)[ResourceKey]["table"];

function parseResource(raw: string | null): ResourceKey | null {
  if (!raw) return null;
  return raw in RESOURCES ? (raw as ResourceKey) : null;
}

export async function GET(req: NextRequest) {
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  const key = parseResource(req.nextUrl.searchParams.get("resource"));
  if (!key) return NextResponse.json({ error: "unknown resource" }, { status: 400 });
  const spec = RESOURCES[key];
  if (!canAccessModule(auth.profile, spec.module)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const kejadianId = req.nextUrl.searchParams.get("kejadian_id");
  const q = sanitizeSearch(req.nextUrl.searchParams.get("q") ?? "");
  let query = auth.supabase
    .from(spec.table as keyof Database["public"]["Tables"])
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (kejadianId) {
    query = query.eq("kejadian_id" as never, kejadianId);
  }
  if (q) query = query.ilike("nama" as never, `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const key = parseResource(typeof json?.resource === "string" ? json.resource : null);
  if (!key || !json) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const spec = RESOURCES[key];
  if (!canAccessModule(auth.profile, spec.module)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { resource: _r, ...payload } = json;
  const { data, error } = await auth.supabase
    .from(spec.table as TableName)
    .insert(payload as LooseInsert)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const key = parseResource(typeof json?.resource === "string" ? json.resource : null);
  const id = typeof json?.id === "string" ? json.id : null;
  if (!key || !id || !json) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const spec = RESOURCES[key];
  if (!canAccessModule(auth.profile, spec.module)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { resource: _r, id: _id, ...payload } = json;
  const { data, error } = await auth.supabase
    .from(spec.table as TableName)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const key = parseResource(typeof json?.resource === "string" ? json.resource : null);
  const id = typeof json?.id === "string" ? json.id : null;
  if (!key || !id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const spec = RESOURCES[key];
  if (!canAccessModule(auth.profile, spec.module)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { error } = await auth.supabase.from(spec.table as TableName).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
