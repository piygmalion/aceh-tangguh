import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { verifikasiSchema } from "@/lib/sik/schemas";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { createServiceClient } from "@/lib/supabase/server";
import { toDisasterJenisLabel } from "@/lib/sik/jenis-bencana";
import type { Json } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function asRecord(value: Json | null): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function POST(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = verifikasiSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "laporan_id required" }, { status: 400 });
  }

  const service = createServiceClient();
  const client = service ?? auth.supabase;

  const { data: laporan, error } = await client
    .from("laporan_kejadian")
    .select("*")
    .eq("id", parsed.data.laporan_id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!laporan) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (laporan.kejadian_id) {
    return NextResponse.json({ kejadian_id: laporan.kejadian_id, existing: true });
  }

  const jawaban = asRecord(laporan.jawaban_json);
  const deskripsi =
    typeof jawaban.deskripsi_kejadian === "string"
      ? jawaban.deskripsi_kejadian
      : laporan.addendum;
  const jenisLabel = toDisasterJenisLabel({ jenis: laporan.jenis_bencana });

  const { data: kejadian, error: insertErr } = await auth.supabase
    .from("kejadian_operasi")
    .insert({
      jenis_bencana: jenisLabel,
      nama_kejadian: `${jenisLabel} ${laporan.desa ?? laporan.kabupaten_kota}`,
      waktu_kejadian: laporan.submitted_at,
      deskripsi: deskripsi ?? null,
      kronologi: deskripsi ?? null,
      kabupaten: laporan.kabupaten_kota,
      kecamatan: laporan.kecamatan,
      desa_ringkas: laporan.desa,
      latitude: laporan.latitude,
      longitude: laporan.longitude,
      sumber_informasi: "Laporan masyarakat",
      laporan_id: laporan.id,
      status: "aktif",
      created_by: auth.profile.userId,
    })
    .select("id")
    .single();

  if (insertErr || !kejadian) {
    return NextResponse.json({ error: insertErr?.message ?? "insert failed" }, { status: 500 });
  }

  await client
    .from("laporan_kejadian")
    .update({
      kejadian_id: kejadian.id,
      status: "approved",
      tampil_di_peta: true,
      disetujui_at: new Date().toISOString(),
      moderator_id: auth.profile.userId,
    })
    .eq("id", laporan.id);

  if (laporan.desa || laporan.kecamatan) {
    await auth.supabase.from("kejadian_lokasi").insert({
      kejadian_id: kejadian.id,
      desa: laporan.desa,
      kecamatan: laporan.kecamatan,
      kabupaten: laporan.kabupaten_kota,
      latitude: laporan.latitude,
      longitude: laporan.longitude,
      deskripsi: deskripsi ?? null,
    });
  }

  return NextResponse.json({ kejadian_id: kejadian.id, existing: false }, { status: 201 });
}
