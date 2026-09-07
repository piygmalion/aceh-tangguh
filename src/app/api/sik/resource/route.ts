import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi, sanitizeSearch } from "@/lib/auth/admin";
import type { AdminProfile } from "@/lib/auth/types";
import { canAccessModule, isKabScoped, scopeKabupaten, type SikModule } from "@/lib/sik/roles";
import {
  authorizeResourceList,
  authorizeResourceRow,
  isSikResourceKey,
  RESOURCE_SCOPE_MODE,
  type ResourceScopeMode,
} from "@/lib/sik/resource-scope";
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
type StaffClient = Exclude<
  Awaited<ReturnType<typeof requireStaffApi>>,
  { ok: false }
>["supabase"];

type KabRow = { kode_kabupaten?: string | null; kabupaten?: string | null };

function parseResource(raw: string | null): ResourceKey | null {
  if (!raw || !isSikResourceKey(raw)) return null;
  return raw in RESOURCES ? (raw as ResourceKey) : null;
}

function asId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asKabRow(value: Record<string, unknown> | null | undefined): KabRow | null {
  if (!value) return null;
  return {
    kode_kabupaten: typeof value.kode_kabupaten === "string" ? value.kode_kabupaten : null,
    kabupaten: typeof value.kabupaten === "string" ? value.kabupaten : null,
  };
}

async function loadKejadianHeader(
  supabase: StaffClient,
  id: string | null,
): Promise<KabRow | null> {
  if (!id) return null;
  const { data } = await supabase
    .from("kejadian_operasi")
    .select("kode_kabupaten, kabupaten")
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function loadRehabParent(
  supabase: StaffClient,
  id: string | null,
): Promise<(KabRow & { kejadian_id?: string | null }) | null> {
  if (!id) return null;
  const { data } = await supabase
    .from("rehab_kebutuhan")
    .select("kode_kabupaten, kabupaten, kejadian_id")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    kode_kabupaten: typeof data.kode_kabupaten === "string" ? data.kode_kabupaten : null,
    kabupaten: typeof data.kabupaten === "string" ? data.kabupaten : null,
    kejadian_id: typeof data.kejadian_id === "string" ? data.kejadian_id : null,
  };
}

async function loadExisting(
  supabase: StaffClient,
  table: TableName,
  id: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from(table as keyof Database["public"]["Tables"])
    .select("*")
    .eq("id" as never, id)
    .maybeSingle();
  return (data ?? null) as Record<string, unknown> | null;
}

async function decideRow(
  profile: AdminProfile,
  mode: ResourceScopeMode,
  supabase: StaffClient,
  input: { kejadianId: string | null; kebutuhanId: string | null; row?: KabRow | null },
) {
  const parentRehab = await loadRehabParent(supabase, input.kebutuhanId);
  const kejadianId = input.kejadianId ?? parentRehab?.kejadian_id ?? null;
  const header = await loadKejadianHeader(supabase, kejadianId);
  return authorizeResourceRow(profile, mode, {
    header,
    row: input.row ?? null,
    parentRehab,
    kejadianId,
    kebutuhanId: input.kebutuhanId,
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  const key = parseResource(req.nextUrl.searchParams.get("resource"));
  if (!key) return NextResponse.json({ error: "unknown resource" }, { status: 400 });
  const spec = RESOURCES[key];
  if (!canAccessModule(auth.profile, spec.module, auth.roleModules)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const mode = RESOURCE_SCOPE_MODE[key];
  const kejadianId = req.nextUrl.searchParams.get("kejadian_id");
  const kebutuhanId = req.nextUrl.searchParams.get("kebutuhan_id");
  const list = authorizeResourceList(auth.profile, mode, { kejadianId, kebutuhanId });
  if (!list.ok) return NextResponse.json({ error: list.error }, { status: list.status });

  if (isKabScoped(auth.profile) && (mode === "kejadian" || (mode === "kejadian_row" && kejadianId))) {
    const row = await decideRow(auth.profile, mode === "kejadian" ? "kejadian" : "kejadian_row", auth.supabase, {
      kejadianId,
      kebutuhanId: null,
    });
    if (!row.ok) return NextResponse.json({ error: row.error }, { status: row.status });
  }
  if (isKabScoped(auth.profile) && mode === "via_rehab") {
    const row = await decideRow(auth.profile, mode, auth.supabase, {
      kejadianId: null,
      kebutuhanId,
    });
    if (!row.ok) return NextResponse.json({ error: row.error }, { status: row.status });
  }

  const q = sanitizeSearch(req.nextUrl.searchParams.get("q") ?? "");
  let query = auth.supabase
    .from(spec.table as keyof Database["public"]["Tables"])
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (kejadianId) {
    query = query.eq("kejadian_id" as never, kejadianId);
  }
  if (kebutuhanId && mode === "via_rehab") {
    query = query.eq("kebutuhan_id" as never, kebutuhanId);
  }
  if (list.applyRowKabFilter) {
    const scope = sanitizeSearch(scopeKabupaten(auth.profile) ?? "");
    if (scope) query = query.or(`kode_kabupaten.eq.${scope},kabupaten.eq.${scope}`);
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
  if (!canAccessModule(auth.profile, spec.module, auth.roleModules)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { resource: _r, ...payload } = json;
  const mode = RESOURCE_SCOPE_MODE[key];
  const gated = await decideRow(auth.profile, mode, auth.supabase, {
    kejadianId: asId(payload.kejadian_id),
    kebutuhanId: asId(payload.kebutuhan_id),
    row: asKabRow(payload),
  });
  if (!gated.ok) return NextResponse.json({ error: gated.error }, { status: gated.status });

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
  if (!canAccessModule(auth.profile, spec.module, auth.roleModules)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const existing = await loadExisting(auth.supabase, spec.table, id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const mode = RESOURCE_SCOPE_MODE[key];
  const { resource: _r, id: _id, ...payload } = json;
  const existingGate = await decideRow(auth.profile, mode, auth.supabase, {
    kejadianId: asId(existing.kejadian_id),
    kebutuhanId: asId(existing.kebutuhan_id),
    row: asKabRow(existing),
  });
  if (!existingGate.ok) {
    return NextResponse.json({ error: existingGate.error }, { status: existingGate.status });
  }
  const nextGate = await decideRow(auth.profile, mode, auth.supabase, {
    kejadianId: asId(payload.kejadian_id) ?? asId(existing.kejadian_id),
    kebutuhanId: asId(payload.kebutuhan_id) ?? asId(existing.kebutuhan_id),
    row: asKabRow({ ...existing, ...payload }),
  });
  if (!nextGate.ok) return NextResponse.json({ error: nextGate.error }, { status: nextGate.status });

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
  if (!canAccessModule(auth.profile, spec.module, auth.roleModules)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const existing = await loadExisting(auth.supabase, spec.table, id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const gated = await decideRow(auth.profile, RESOURCE_SCOPE_MODE[key], auth.supabase, {
    kejadianId: asId(existing.kejadian_id),
    kebutuhanId: asId(existing.kebutuhan_id),
    row: asKabRow(existing),
  });
  if (!gated.ok) return NextResponse.json({ error: gated.error }, { status: gated.status });

  const { error } = await auth.supabase.from(spec.table as TableName).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
