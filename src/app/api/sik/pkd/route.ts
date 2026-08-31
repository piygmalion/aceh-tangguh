import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/admin";
import { canAccessModule, isDesaRole, isPenilaiPkd, scopeDesa } from "@/lib/sik/roles";
import { hitungIndeksKetangguhan } from "@/lib/sik/pkd";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("tahun") ?? new Date().getFullYear());
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  if (!canAccessModule(auth.profile, "destana")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: tahunRow } = await auth.supabase
    .from("pkd_tahun")
    .select("*")
    .eq("tahun", year)
    .maybeSingle();

  let tugasQuery = auth.supabase.from("pkd_tugas").select("*").order("nama_desa");
  if (tahunRow) tugasQuery = tugasQuery.eq("tahun_id", tahunRow.id);
  const desaKode = scopeDesa(auth.profile);
  if (desaKode) tugasQuery = tugasQuery.eq("kode_desa_kelurahan", desaKode);

  const [{ data: tugas }, { data: pertanyaan }] = await Promise.all([
    tugasQuery,
    auth.supabase.from("pkd_pertanyaan").select("*").order("indikator_nomor").order("nomor"),
  ]);
  const tugasIds = (tugas ?? []).map((row) => String(row.id)).filter(Boolean);
  const { data: jawaban } =
    tugasIds.length > 0
      ? await auth.supabase.from("pkd_jawaban").select("*").in("tugas_id", tugasIds)
      : { data: [] };

  return NextResponse.json({
    tahun: tahunRow,
    tugas: tugas ?? [],
    pertanyaan: pertanyaan ?? [],
    jawaban: jawaban ?? [],
  });
}

export async function POST(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireStaffApi();
  if (!auth.ok) return auth.response;
  if (!canAccessModule(auth.profile, "destana")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const action = String(json.action ?? "");

  if (action === "ensure-tugas") {
    const kode = isDesaRole(auth.profile)
      ? scopeDesa(auth.profile)
      : String(json.kode_desa_kelurahan ?? "");
    if (!kode) return NextResponse.json({ error: "kode desa required" }, { status: 400 });
    const year = Number(json.tahun ?? new Date().getFullYear());
    let { data: tahunRow } = await auth.supabase
      .from("pkd_tahun")
      .select("*")
      .eq("tahun", year)
      .maybeSingle();
    if (!tahunRow) {
      const inserted = await auth.supabase
        .from("pkd_tahun")
        .insert({ tahun: year, aktif: true, metode: "by_system" })
        .select("*")
        .single();
      tahunRow = inserted.data;
    }
    if (!tahunRow) return NextResponse.json({ error: "tahun missing" }, { status: 500 });

    const existing = await auth.supabase
      .from("pkd_tugas")
      .select("*")
      .eq("tahun_id", tahunRow.id)
      .eq("kode_desa_kelurahan", kode)
      .maybeSingle();
    if (existing.data) return NextResponse.json({ item: existing.data });

    const publicClient = createServerClient();
    const desa = publicClient
      ? await publicClient
          .from("profil_desa")
          .select("nama, kabupaten, kode_kabupaten")
          .eq("kode_desa_kelurahan", kode)
          .maybeSingle()
      : { data: null };

    const { data, error } = await auth.supabase
      .from("pkd_tugas")
      .insert({
        tahun_id: tahunRow.id,
        kode_desa_kelurahan: kode,
        nama_desa: desa.data?.nama ?? auth.profile.desa,
        kabupaten: desa.data?.kabupaten ?? auth.profile.kabupaten,
        kode_kabupaten: desa.data?.kode_kabupaten ?? auth.profile.kodeKabupaten,
        status: "draft",
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  }

  if (action === "jawab") {
    const tugasId = String(json.tugas_id ?? "");
    const pertanyaanId = String(json.pertanyaan_id ?? "");
    const ya = Boolean(json.ya);
    const bukti = typeof json.bukti_url === "string" ? json.bukti_url : null;
    if (!tugasId || !pertanyaanId) {
      return NextResponse.json({ error: "tugas/pertanyaan required" }, { status: 400 });
    }
    const { data, error } = await auth.supabase
      .from("pkd_jawaban")
      .upsert(
        { tugas_id: tugasId, pertanyaan_id: pertanyaanId, ya, bukti_url: bukti, evaluasi: "pending" },
        { onConflict: "tugas_id,pertanyaan_id" }
      )
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  }

  if (action === "submit") {
    const tugasId = String(json.tugas_id ?? "");
    const { error } = await auth.supabase
      .from("pkd_tugas")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", tugasId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "kunci" || action === "buka") {
    if (!isPenilaiPkd(auth.profile) && auth.profile.role !== "admin_provinsi") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const tugasId = String(json.tugas_id ?? "");
    const status = action === "kunci" ? "locked" : "returned";
    const { error } = await auth.supabase.from("pkd_tugas").update({ status }).eq("id", tugasId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "evaluasi") {
    if (!isPenilaiPkd(auth.profile) && auth.profile.role !== "admin_provinsi") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const id = String(json.jawaban_id ?? "");
    const evaluasi = json.evaluasi === "tolak" ? "tolak" : "terima";
    const rekomendasi = typeof json.rekomendasi === "string" ? json.rekomendasi : null;
    const { error } = await auth.supabase
      .from("pkd_jawaban")
      .update({ evaluasi, rekomendasi })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "final") {
    if (!isPenilaiPkd(auth.profile) && auth.profile.role !== "admin_provinsi") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const tugasId = String(json.tugas_id ?? "");
    const [{ data: jawaban }, { data: pertanyaan }] = await Promise.all([
      auth.supabase.from("pkd_jawaban").select("ya, pertanyaan_id").eq("tugas_id", tugasId),
      auth.supabase.from("pkd_pertanyaan").select("id, indikator_nomor"),
    ]);
    const indByQ = new Map(
      (pertanyaan ?? []).map((p) => [String(p.id), Number(p.indikator_nomor)])
    );
    const yaPerIndikator = new Map<number, number>();
    for (const row of jawaban ?? []) {
      const ind = indByQ.get(String(row.pertanyaan_id));
      if (!ind) continue;
      if (row.ya) yaPerIndikator.set(ind, (yaPerIndikator.get(ind) ?? 0) + 1);
    }
    const scored = hitungIndeksKetangguhan(yaPerIndikator);
    const { data: tugas, error } = await auth.supabase
      .from("pkd_tugas")
      .update({
        status: "final",
        indeks: scored.indeks,
        level: scored.level,
        finalized_at: new Date().toISOString(),
      })
      .eq("id", tugasId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const kodeDesa =
      typeof tugas?.kode_desa_kelurahan === "string" ? tugas.kode_desa_kelurahan : null;
    if (kodeDesa) {
      await auth.supabase
        .from("profil_desa")
        .update({
          destana_level: scored.level,
          destana_indeks: scored.indeks,
          destana_tahun: new Date().getFullYear(),
        })
        .eq("kode_desa_kelurahan", kodeDesa);
    }
    return NextResponse.json({ item: tugas, scored });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
