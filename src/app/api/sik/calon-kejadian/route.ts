import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { rejectCrossOrigin } from "@/lib/security/origin";
import {
  asProperties,
  buildCalonSnapshot,
  calonVisibleToOps,
  decideDedup,
  isCalonSource,
  nilaiKelayakan,
  type OverlayLiveSignal,
} from "@/lib/overlay-calon";
import type { OverlayCalonKejadianRow, OverlayCalonSource, OverlayCalonStatus } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

const CALON_STATUS: readonly OverlayCalonStatus[] = ["draf", "ditolak", "diterima"];

function asSignal(row: {
  id: string;
  source: string;
  layer_key: string;
  external_id: string;
  longitude: number;
  latitude: number;
  occurred_at: string | null;
  properties: unknown;
  updated_at: string;
}): OverlayLiveSignal {
  return {
    id: row.id,
    source: row.source,
    layer_key: row.layer_key,
    external_id: row.external_id,
    longitude: row.longitude,
    latitude: row.latitude,
    occurred_at: row.occurred_at,
    properties: asProperties(row.properties),
    updated_at: row.updated_at,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const rawStatus = req.nextUrl.searchParams.get("status")?.trim() ?? "draf";
  if (!CALON_STATUS.includes(rawStatus as OverlayCalonStatus)) {
    return NextResponse.json({ error: "status tidak dikenali" }, { status: 400 });
  }
  const status = rawStatus as OverlayCalonStatus;

  const { data, error } = await auth.supabase
    .from("overlay_calon_kejadian")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = ((data ?? []) as OverlayCalonKejadianRow[]).filter((row) =>
    calonVisibleToOps(auth.profile, row),
  );
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const json = (await req.json().catch(() => null)) as {
    source?: unknown;
    external_id?: unknown;
    overlay_id?: unknown;
  } | null;
  const overlayId = typeof json?.overlay_id === "string" ? json.overlay_id.trim() : "";
  const source = typeof json?.source === "string" ? json.source.trim() : "";
  const externalId = typeof json?.external_id === "string" ? json.external_id.trim() : "";
  if (!overlayId && !(source && externalId)) {
    return NextResponse.json({ error: "source+external_id atau overlay_id wajib" }, { status: 400 });
  }

  let query = auth.supabase
    .from("overlay_live_features")
    .select("id, source, layer_key, external_id, longitude, latitude, occurred_at, properties, updated_at");
  if (overlayId) {
    query = query.eq("id", overlayId);
  } else if (isCalonSource(source)) {
    query = query.eq("source", source).eq("external_id", externalId);
  } else {
    return NextResponse.json({ error: "source tidak dikenali" }, { status: 400 });
  }
  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "sinyal tidak ditemukan" }, { status: 404 });

  const signal = asSignal(data);
  const layak = nilaiKelayakan(signal);
  if (!layak.ok) {
    return NextResponse.json({ error: "sinyal tidak layak", alasan: layak.alasan }, { status: 400 });
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from("overlay_calon_kejadian")
    .select("id, status, decided_at, kejadian_id")
    .eq("source", signal.source as OverlayCalonSource)
    .eq("external_id", signal.external_id);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const decision = decideDedup(
    (existing ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      decided_at: row.decided_at,
      kejadian_id: row.kejadian_id,
    })),
    signal.updated_at,
  );
  if (decision.action === "diam_diterima") {
    return NextResponse.json(
      { error: "sudah diterima", kejadian_id: decision.kejadian_id },
      { status: 409 },
    );
  }
  if (decision.action === "diam") {
    return NextResponse.json({ error: "sudah ditolak" }, { status: 409 });
  }

  const snapshot = buildCalonSnapshot(signal);
  const now = new Date().toISOString();

  if (decision.action === "update_draf") {
    const { data: updated, error: updateError } = await auth.supabase
      .from("overlay_calon_kejadian")
      .update({ ...snapshot, tautan_status: "utuh", updated_at: now })
      .eq("id", decision.id)
      .select("*")
      .single();
    if (updateError || !updated) {
      return NextResponse.json({ error: updateError?.message ?? "update failed" }, { status: 500 });
    }
    return NextResponse.json({ item: updated as OverlayCalonKejadianRow });
  }

  const { data: created, error: insertError } = await auth.supabase
    .from("overlay_calon_kejadian")
    .insert({
      ...snapshot,
      status: "draf",
      tautan_status: "utuh",
      asal_buat: "manual",
      created_by: auth.profile.userId,
    })
    .select("*")
    .single();
  if (insertError || !created) {
    return NextResponse.json({ error: insertError?.message ?? "insert failed" }, { status: 500 });
  }
  return NextResponse.json({ item: created as OverlayCalonKejadianRow }, { status: 201 });
}
