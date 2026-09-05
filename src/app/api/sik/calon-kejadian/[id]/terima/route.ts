import { NextRequest, NextResponse } from "next/server";
import { requireOpsApi } from "@/lib/auth/admin";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { allocateKib, resolveTarikh } from "@/lib/sik/kejadian-write";
import {
  asProperties,
  authorizeCalonTerima,
  buildKejadianInsertFromCalon,
  lokasiDariSnapshot,
  resolveJenisTerima,
  resolveNamaTerima,
  resolveWaktuTerima,
} from "@/lib/overlay-calon";
import type { KejadianOperasiRow, OverlayCalonKejadianRow } from "@/lib/sik/db-tables";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOpsApi();
  if (!auth.ok) return auth.response;

  const json = (await req.json().catch(() => ({}))) as {
    kabupaten?: unknown;
    kode_kabupaten?: unknown;
    waktu_kejadian?: unknown;
    kode_jenis?: unknown;
    nama_kejadian?: unknown;
  };

  const { data, error } = await auth.supabase
    .from("overlay_calon_kejadian")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const calon = data as OverlayCalonKejadianRow;
  if (calon.status !== "draf") {
    return NextResponse.json({ error: "bukan draf" }, { status: 409 });
  }

  const kab = authorizeCalonTerima(auth.profile, calon, {
    kabupaten: typeof json.kabupaten === "string" ? json.kabupaten : null,
    kode_kabupaten: typeof json.kode_kabupaten === "string" ? json.kode_kabupaten : null,
  });
  if (!kab.ok) {
    return NextResponse.json({ error: kab.error }, { status: kab.status });
  }

  const waktu = resolveWaktuTerima(
    calon.waktu_sinyal,
    typeof json.waktu_kejadian === "string" ? json.waktu_kejadian : null,
  );
  if (!waktu) {
    return NextResponse.json({ error: "waktu_kejadian wajib" }, { status: 400 });
  }

  const jenis = resolveJenisTerima(
    calon,
    typeof json.kode_jenis === "number" ? json.kode_jenis : null,
  );
  if (!jenis.ok) {
    return NextResponse.json({ error: jenis.error }, { status: 400 });
  }

  const nama = resolveNamaTerima(
    calon,
    typeof json.nama_kejadian === "string" ? json.nama_kejadian : null,
  );

  let tarikh: string;
  try {
    tarikh = resolveTarikh(waktu);
  } catch {
    return NextResponse.json({ error: "waktu_kejadian tidak valid" }, { status: 400 });
  }

  let kib: string | null = null;
  let kibIndex: number | null = null;
  try {
    const allocated = await allocateKib(auth.supabase, {
      kodeKabupaten: kab.kode_kabupaten,
      kodeJenis: jenis.kode,
      tarikh,
    });
    if (allocated) {
      kib = allocated.kib;
      kibIndex = allocated.kib_index;
    }
  } catch {
    kib = null;
    kibIndex = null;
  }

  const insert = buildKejadianInsertFromCalon({
    calon,
    jenis_bencana: jenis.jenis,
    kode_jenis: jenis.kode,
    nama_kejadian: nama.nama,
    slug_nama: nama.slug_nama,
    waktu_kejadian: waktu,
    tarikh,
    kabupaten: kab.kabupaten ?? null,
    kode_kabupaten: kab.kode_kabupaten ?? null,
    created_by: auth.profile.userId,
    kib,
    kib_index: kibIndex,
  });

  const { data: created, error: insertError } = await auth.supabase
    .from("kejadian_operasi")
    .insert(insert)
    .select("*")
    .single();
  if (insertError || !created) {
    return NextResponse.json({ error: insertError?.message ?? "insert failed" }, { status: 500 });
  }
  const kejadian = created as KejadianOperasiRow;

  const lokasi = lokasiDariSnapshot(asProperties(calon.properties_snapshot), {
    kabupaten: kab.kabupaten ?? null,
    latitude: calon.latitude,
    longitude: calon.longitude,
  });
  if (lokasi) {
    await auth.supabase.from("kejadian_lokasi").insert({
      kejadian_id: kejadian.id,
      ...lokasi,
    });
  }

  const decidedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await auth.supabase
    .from("overlay_calon_kejadian")
    .update({
      status: "diterima",
      kejadian_id: kejadian.id,
      decided_by: auth.profile.userId,
      decided_at: decidedAt,
      kabupaten: kab.kabupaten ?? null,
      kode_kabupaten: kab.kode_kabupaten ?? null,
      updated_at: decidedAt,
    })
    .eq("id", calon.id)
    .eq("status", "draf")
    .select("*")
    .maybeSingle();
  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? "calon update failed" }, { status: 500 });
  }

  return NextResponse.json({
    item: updated as OverlayCalonKejadianRow,
    kejadian,
  });
}
