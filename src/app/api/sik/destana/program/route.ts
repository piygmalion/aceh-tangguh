import { NextRequest, NextResponse } from "next/server";
import { requireModuleApi } from "@/lib/auth/admin";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { isDesaRole, scopeDesa } from "@/lib/sik/roles";
import {
  authorizeDestanaProgramRead,
  authorizeDestanaProgramWrite,
  emptyAktivitasSlots,
  INSTRUMEN_PKD,
  INSTRUMEN_PROGRAM,
  isDestanaAktivitasKode,
  isDestanaAktivitasStatus,
  parseDestanaTeksBebas,
  parseKodeDesaAceh,
  penilaianBerikutnya,
} from "@/lib/sik/destana-program";
import type { DestanaAktivitasRow, DestanaSiRow } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

function parseTahun(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isInteger(n) && n >= 2000 && n <= 2100) return n;
  return new Date().getFullYear();
}

async function resolveKode(
  profile: Parameters<typeof scopeDesa>[0],
  raw: unknown
): Promise<{ ok: true; kode: string } | { ok: false; response: NextResponse }> {
  const fromQuery = parseKodeDesaAceh(raw);
  if (fromQuery) return { ok: true, kode: fromQuery };
  if (isDesaRole(profile)) {
    const desa = scopeDesa(profile);
    const kode = parseKodeDesaAceh(desa);
    if (kode) return { ok: true, kode };
  }
  return { ok: false, response: NextResponse.json({ error: "kode_desa_required" }, { status: 400 }) };
}

export async function GET(req: NextRequest) {
  const auth = await requireModuleApi("destana");
  if (!auth.ok) return auth.response;

  const resolved = await resolveKode(auth.profile, req.nextUrl.searchParams.get("kode"));
  if (!resolved.ok) return resolved.response;
  const read = authorizeDestanaProgramRead(auth.profile, resolved.kode);
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: read.status });

  const tahun = parseTahun(req.nextUrl.searchParams.get("tahun"));

  const [siRes, storedRes, tugasRes] = await Promise.all([
    auth.supabase.from("destana_si").select("*").eq("kode_desa_kelurahan", resolved.kode).maybeSingle(),
    auth.supabase
      .from("destana_aktivitas")
      .select("*")
      .eq("kode_desa_kelurahan", resolved.kode)
      .eq("tahun", tahun),
    auth.supabase
      .from("pkd_tugas")
      .select("id, tahun_id")
      .eq("kode_desa_kelurahan", resolved.kode)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (siRes.error) return NextResponse.json({ error: siRes.error.message }, { status: 500 });
  if (storedRes.error) return NextResponse.json({ error: storedRes.error.message }, { status: 500 });
  const si = siRes.data;
  const stored = storedRes.data;
  const tugas = tugasRes.data;

  const byKode = new Map(
    ((stored ?? []) as DestanaAktivitasRow[]).map((row) => [row.kode_aktivitas, row])
  );
  const aktivitas = emptyAktivitasSlots().map((slot) => {
    const row = byKode.get(slot.kode_aktivitas);
    if (!row || !isDestanaAktivitasStatus(row.status)) return slot;
    return { ...slot, status: row.status, catatan: row.catatan };
  });

  let tahunPkd: number | null = null;
  const tahunId = (tugas as { tahun_id?: string } | null)?.tahun_id;
  if (tahunId) {
    const { data: tahunRow } = await auth.supabase.from("pkd_tahun").select("tahun").eq("id", tahunId).maybeSingle();
    const n = (tahunRow as { tahun?: number } | null)?.tahun;
    if (typeof n === "number") tahunPkd = n;
  }

  return NextResponse.json({
    kode_desa_kelurahan: resolved.kode,
    tahun,
    instrumen_pkd: INSTRUMEN_PKD,
    instrumen_program: INSTRUMEN_PROGRAM,
    si: (si as DestanaSiRow | null) ?? {
      kode_desa_kelurahan: resolved.kode,
      info_umum: "",
      sebaran: resolved.kode,
      penilaian_rujukan: null,
      fasilitator: "",
      pembelajaran: "",
    },
    aktivitas,
    penilaian_berikutnya: penilaianBerikutnya(tahunPkd ?? null),
    can_write: authorizeDestanaProgramWrite(auth.profile, resolved.kode).ok,
  });
}

export async function PATCH(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireModuleApi("destana");
  if (!auth.ok) return auth.response;

  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json || json.kind !== "si") {
    return NextResponse.json({ error: "kind_si_required" }, { status: 400 });
  }

  const resolved = await resolveKode(auth.profile, json.kode_desa_kelurahan ?? json.kode);
  if (!resolved.ok) return resolved.response;
  const write = authorizeDestanaProgramWrite(auth.profile, resolved.kode);
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

  const info = parseDestanaTeksBebas(json.info_umum ?? "");
  const fasilitator = parseDestanaTeksBebas(json.fasilitator ?? "");
  const pembelajaran = parseDestanaTeksBebas(json.pembelajaran ?? "");
  if (!info.ok) return NextResponse.json({ error: info.error }, { status: 400 });
  if (!fasilitator.ok) return NextResponse.json({ error: fasilitator.error }, { status: 400 });
  if (!pembelajaran.ok) return NextResponse.json({ error: pembelajaran.error }, { status: 400 });

  let penilaian: string | null = null;
  if (json.penilaian_rujukan != null && json.penilaian_rujukan !== "") {
    if (typeof json.penilaian_rujukan !== "string") {
      return NextResponse.json({ error: "penilaian_rujukan_invalid" }, { status: 400 });
    }
    penilaian = json.penilaian_rujukan;
  }

  const row = {
    kode_desa_kelurahan: resolved.kode,
    info_umum: info.value,
    sebaran: resolved.kode,
    penilaian_rujukan: penilaian,
    fasilitator: fasilitator.value,
    pembelajaran: pembelajaran.value,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await auth.supabase
    .from("destana_si")
    .upsert(row, { onConflict: "kode_desa_kelurahan" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PUT(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireModuleApi("destana");
  if (!auth.ok) return auth.response;

  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json || json.kind !== "aktivitas") {
    return NextResponse.json({ error: "kind_aktivitas_required" }, { status: 400 });
  }

  const resolved = await resolveKode(auth.profile, json.kode_desa_kelurahan ?? json.kode);
  if (!resolved.ok) return resolved.response;
  const write = authorizeDestanaProgramWrite(auth.profile, resolved.kode);
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

  const kodeAktivitas = typeof json.kode_aktivitas === "string" ? json.kode_aktivitas : "";
  if (!isDestanaAktivitasKode(kodeAktivitas)) {
    return NextResponse.json({ error: "kode_aktivitas_invalid" }, { status: 400 });
  }
  const status = typeof json.status === "string" ? json.status : "";
  if (!isDestanaAktivitasStatus(status)) {
    return NextResponse.json({ error: "status_invalid" }, { status: 400 });
  }
  const catatanRaw = json.catatan == null ? "" : json.catatan;
  const catatan = parseDestanaTeksBebas(catatanRaw);
  if (!catatan.ok) return NextResponse.json({ error: catatan.error }, { status: 400 });

  const tahun = parseTahun(json.tahun);
  const row = {
    kode_desa_kelurahan: resolved.kode,
    tahun,
    kode_aktivitas: kodeAktivitas,
    status,
    catatan: catatan.value.length > 0 ? catatan.value : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await auth.supabase
    .from("destana_aktivitas")
    .upsert(row, { onConflict: "kode_desa_kelurahan,tahun,kode_aktivitas" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
