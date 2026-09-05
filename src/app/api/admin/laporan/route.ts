import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireModuleApi, sanitizeSearch } from "@/lib/auth/admin";
import { decryptPii } from "@/lib/laporan/crypto";
import { queueWaNotification } from "@/lib/laporan/service";
import { isLaporanStatus, LAPORAN_STATUSES, type LaporanStatus } from "@/lib/laporan/status";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { createServiceClient, type TypedSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * JWT GRANT on laporan_* is column-limited (no jawaban_json / pelapor_id).
 * Staff moderation reads those via service_role after requireModuleApi("moderasi").
 */
function requireStaffLaporanClient():
  | { ok: true; client: TypedSupabaseClient }
  | { ok: false; response: NextResponse } {
  const client = createServiceClient();
  if (!client) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Supabase service role missing" },
        { status: 503 }
      ),
    };
  }
  return { ok: true, client };
}

const patchSchema = z.object({
  tipe: z.enum(["kejadian", "penanganan"]),
  id: z.string().uuid(),
  status: z.enum([
    "draft",
    "submitted",
    "in_review",
    "approved",
    "rejected",
    "needs_info",
    "archived",
  ]),
  tampil_di_peta: z.boolean().optional(),
  catatan_moderator: z.string().max(2000).optional(),
});

function ringkasanFromJawaban(jawaban: Json, fallback = ""): string {
  if (typeof jawaban === "object" && jawaban && !Array.isArray(jawaban)) {
    const desc = (jawaban as Record<string, unknown>).deskripsi_kejadian;
    if (typeof desc === "string" && desc.trim()) return desc.trim().slice(0, 400);
  }
  return fallback.slice(0, 400);
}

function toKejadianItem(row: {
  id: string;
  nomor_laporan: string;
  jenis_bencana: string;
  status: string;
  latitude: number;
  longitude: number;
  kabupaten_kota: string;
  kecamatan: string | null;
  desa: string | null;
  skor_urgensi: number;
  tampil_di_peta: boolean;
  jawaban_json: Json;
  addendum: string | null;
  submitted_at: string;
  kejadian_id?: string | null;
}) {
  return {
    id: row.id,
    tipe: "kejadian" as const,
    nomorLaporan: row.nomor_laporan,
    jenisBencana: row.jenis_bencana,
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    kabupaten: row.kabupaten_kota,
    kecamatan: row.kecamatan,
    desa: row.desa,
    skorUrgensi: row.skor_urgensi,
    tampilDiPeta: row.tampil_di_peta,
    ringkasan: ringkasanFromJawaban(row.jawaban_json, row.addendum ?? ""),
    submittedAt: row.submitted_at,
    kejadianId: row.kejadian_id ?? null,
  };
}

function toPenangananItem(row: {
  id: string;
  nomor_laporan: string;
  jenis_bencana: string;
  tipe_laporan: string;
  status: string;
  latitude: number;
  longitude: number;
  kabupaten_kota: string;
  kecamatan: string | null;
  desa: string | null;
  tampil_di_peta: boolean;
  deskripsi_penanganan: string;
  submitted_at: string;
}) {
  return {
    id: row.id,
    tipe: "penanganan" as const,
    nomorLaporan: row.nomor_laporan,
    jenisBencana: row.jenis_bencana,
    topic: row.tipe_laporan,
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    kabupaten: row.kabupaten_kota,
    kecamatan: row.kecamatan,
    desa: row.desa,
    skorUrgensi: null as number | null,
    tampilDiPeta: row.tampil_di_peta,
    ringkasan: row.deskripsi_penanganan.slice(0, 400),
    submittedAt: row.submitted_at,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireModuleApi("moderasi");
  if (!auth.ok) return auth.response;
  const svc = requireStaffLaporanClient();
  if (!svc.ok) return svc.response;

  const sp = req.nextUrl.searchParams;
  const tipe = sp.get("tipe") === "penanganan" ? "penanganan" : "kejadian";
  const status = sp.get("status")?.trim() ?? "";
  const q = sanitizeSearch(sp.get("q") ?? "");
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "20") || 20));
  const summary = sp.get("summary") === "1";

  if (summary) {
    const counts: Record<LaporanStatus, number> = {
      draft: 0,
      submitted: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
      needs_info: 0,
      archived: 0,
    };
    const table = tipe === "penanganan" ? "laporan_penanganan" : "laporan_kejadian";
    for (const s of LAPORAN_STATUSES) {
      const { count } = await svc.client
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      counts[s] = count ?? 0;
    }
    return NextResponse.json({
      tipe,
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (tipe === "penanganan") {
    let query = svc.client
      .from("laporan_penanganan")
      .select("*", { count: "exact" })
      .order("submitted_at", { ascending: false });
    if (status && isLaporanStatus(status)) query = query.eq("status", status);
    if (q) {
      query = query.or(
        `nomor_laporan.ilike.%${q}%,kabupaten_kota.ilike.%${q}%,desa.ilike.%${q}%,deskripsi_penanganan.ilike.%${q}%`
      );
    }
    const { data, error, count } = await query.range(from, to);
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({
      items: (data ?? []).map(toPenangananItem),
      total: count ?? 0,
      page,
      pageSize,
      tipe,
    });
  }

  let query = svc.client
    .from("laporan_kejadian")
    .select("*", { count: "exact" })
    .order("submitted_at", { ascending: false });
  if (status && isLaporanStatus(status)) query = query.eq("status", status);
  if (q) {
    query = query.or(
      `nomor_laporan.ilike.%${q}%,kabupaten_kota.ilike.%${q}%,desa.ilike.%${q}%,jenis_bencana.ilike.%${q}%`
    );
  }
  const { data, error, count } = await query.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({
    items: (data ?? []).map(toKejadianItem),
    total: count ?? 0,
    page,
    pageSize,
    tipe,
  });
}

export async function PATCH(req: NextRequest) {
  const cross = rejectCrossOrigin(req);
  if (cross) return cross;

  const auth = await requireModuleApi("moderasi");
  if (!auth.ok) return auth.response;
  const svc = requireStaffLaporanClient();
  if (!svc.ok) return svc.response;

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

  const now = new Date().toISOString();
  let pelaporId: string | undefined;
  let nomor: string | undefined;
  let item: ReturnType<typeof toKejadianItem> | ReturnType<typeof toPenangananItem>;

  if (parsed.data.tipe === "penanganan") {
    const { data, error } = await svc.client
      .from("laporan_penanganan")
      .update({
        status: parsed.data.status,
        tampil_di_peta:
          parsed.data.status === "approved"
            ? (parsed.data.tampil_di_peta ?? true)
            : false,
        updated_at: now,
      })
      .eq("id", parsed.data.id)
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Update failed" },
        { status: 502 }
      );
    }
    pelaporId = data.pelapor_id;
    nomor = data.nomor_laporan;
    item = toPenangananItem(data);
  } else {
    const showOnMap =
      parsed.data.tampil_di_peta ?? parsed.data.status === "approved";
    const { data, error } = await svc.client
      .from("laporan_kejadian")
      .update({
        status: parsed.data.status,
        tampil_di_peta: parsed.data.status === "approved" ? showOnMap : false,
        moderator_id: auth.profile.userId,
        catatan_moderator: parsed.data.catatan_moderator,
        disetujui_at: parsed.data.status === "approved" ? now : undefined,
        updated_at: now,
      })
      .eq("id", parsed.data.id)
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Update failed" },
        { status: 502 }
      );
    }
    pelaporId = data.pelapor_id;
    nomor = data.nomor_laporan;
    item = toKejadianItem(data);
  }

  const template =
    parsed.data.status === "approved"
      ? "laporan_approved"
      : parsed.data.status === "rejected"
        ? "laporan_rejected"
        : null;
  if (template && pelaporId) {
    try {
      const { data: pelapor } = await auth.supabase
        .from("laporan_pelapor")
        .select("telepon_enc")
        .eq("id", pelaporId)
        .maybeSingle();
      if (pelapor?.telepon_enc) {
        const phone = decryptPii(pelapor.telepon_enc);
        await queueWaNotification(
          parsed.data.tipe,
          parsed.data.id,
          phone,
          template,
          { nomor_laporan: nomor }
        );
      }
    } catch {
      // WA is best-effort; moderation status already saved
    }
  }

  return NextResponse.json({ item });
}
