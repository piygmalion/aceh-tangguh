import type { AuthSupabaseClient } from "@/lib/supabase/ssr";
import type { KejadianDampakRow, KejadianOperasiRow } from "@/lib/sik/db-tables";
import {
  dampakToAmbang,
  formatKib,
  kibPrefix,
  memenuhiAmbangBatas,
  nextKibIndex,
  normalizeKorbanTerpilah,
  normalizeKerugianRinci,
  rekapStatis,
  tarikhFromWaktu,
  type DampakSnapshot,
  type RekapStatis,
} from "@/lib/sik/juklak";

export async function allocateKib(
  supabase: AuthSupabaseClient,
  input: {
    kodeKabupaten: string | null | undefined;
    kodeJenis: number | null | undefined;
    tarikh: string;
    excludeId?: string;
  }
): Promise<{ kib: string; kib_index: number } | null> {
  if (!input.kodeKabupaten || input.kodeJenis == null) return null;
  const prefix = kibPrefix({
    kodeKabupaten: input.kodeKabupaten,
    kodeJenis: input.kodeJenis,
    tarikh: input.tarikh,
  });
  let query = supabase.from("kejadian_operasi").select("kib").like("kib", `${prefix}%`);
  if (input.excludeId) query = query.neq("id", input.excludeId);
  const { data } = await query;
  const existing = ((data ?? []) as { kib: string | null }[])
    .map((r) => r.kib)
    .filter((k): k is string => Boolean(k));
  const index = nextKibIndex(existing);
  return { kib: formatKib(prefix, index), kib_index: index };
}

export function resolveTarikh(waktu: string, tarikh?: string | null): string {
  if (tarikh && /^\d{4}-\d{2}-\d{2}$/.test(tarikh)) return tarikh;
  return tarikhFromWaktu(waktu);
}

export function snapshotFromDampak(row: KejadianDampakRow): DampakSnapshot {
  return {
    tanggal: row.tanggal,
    meninggal: row.meninggal,
    hilang: row.hilang,
    luka_berat: row.luka_berat,
    luka_ringan: row.luka_ringan,
    mengungsi: row.mengungsi,
    menderita: row.menderita,
    rumah_rb: row.rumah_rb,
    rumah_rs: row.rumah_rs,
    rumah_rr: row.rumah_rr,
    rumah_terendam: row.rumah_terendam,
    kerugian_rumah_rp: row.kerugian_rumah_rp,
    faskes: row.faskes,
    pendidikan: row.pendidikan,
    ibadah: row.ibadah,
    kantor: row.kantor,
    pasar: row.pasar,
    kerugian_pelayanan_rp: row.kerugian_pelayanan_rp,
    sapras: row.sapras,
    kerugian_sapras_rp: row.kerugian_sapras_rp,
    lahan_ha: row.lahan_ha,
    toko: row.toko,
    pabrik: row.pabrik,
    kerugian_ekonomi_rp: row.kerugian_ekonomi_rp,
    korban_terpilah: row.korban_terpilah
      ? normalizeKorbanTerpilah(row.korban_terpilah)
      : null,
    kerugian_rinci: normalizeKerugianRinci(row.kerugian_rinci),
    kebutuhan_dana_juta: row.kebutuhan_dana_juta,
    kebutuhan_sdm: row.kebutuhan_sdm,
    kebutuhan_sapras: row.kebutuhan_sapras,
    kebutuhan_logistik: row.kebutuhan_logistik,
    kebutuhan_peralatan: row.kebutuhan_peralatan,
    aset_kedaruratan: row.aset_kedaruratan,
    kondisi_mutakhir: row.kondisi_mutakhir,
    upaya_penanganan: row.upaya_penanganan,
    sawah_ha: row.sawah_ha,
    kebun_ha: row.kebun_ha,
    hutan_ha: row.hutan_ha,
    kolam_ha: row.kolam_ha,
    pendidikan_rb: row.pendidikan_rb,
    pendidikan_rs: row.pendidikan_rs,
    pendidikan_rr: row.pendidikan_rr,
    pendidikan_terendam: row.pendidikan_terendam,
    ibadah_rb: row.ibadah_rb,
    ibadah_rs: row.ibadah_rs,
    ibadah_rr: row.ibadah_rr,
    ibadah_terendam: row.ibadah_terendam,
    faskes_rb: row.faskes_rb,
    faskes_rs: row.faskes_rs,
    faskes_rr: row.faskes_rr,
    faskes_terendam: row.faskes_terendam,
    kantor_rb: row.kantor_rb,
    kantor_rs: row.kantor_rs,
    kantor_rr: row.kantor_rr,
    kantor_terendam: row.kantor_terendam,
    pasar_rb: row.pasar_rb,
    pasar_rs: row.pasar_rs,
    pasar_rr: row.pasar_rr,
    pasar_terendam: row.pasar_terendam,
    toko_rb: row.toko_rb,
    toko_rs: row.toko_rs,
    toko_rr: row.toko_rr,
    toko_terendam: row.toko_terendam,
    pabrik_rb: row.pabrik_rb,
    pabrik_rs: row.pabrik_rs,
    pabrik_rr: row.pabrik_rr,
    pabrik_terendam: row.pabrik_terendam,
    jembatan_rb: row.jembatan_rb,
    jembatan_rs: row.jembatan_rs,
    jembatan_rr: row.jembatan_rr,
    jembatan_terendam: row.jembatan_terendam,
    jalan_km: row.jalan_km,
    air_jaringan: row.air_jaringan,
    listrik_jaringan: row.listrik_jaringan,
    telekom_jaringan: row.telekom_jaringan,
    irigasi_jaringan: row.irigasi_jaringan,
    transportasi_jaringan: row.transportasi_jaringan,
    spbu_jaringan: row.spbu_jaringan,
  };
}

export async function refreshIsBencana(
  supabase: AuthSupabaseClient,
  kejadian: Pick<
    KejadianOperasiRow,
    "id" | "status_darurat" | "permintaan_bantuan_nasional"
  >,
  latest?: KejadianDampakRow | null
): Promise<boolean> {
  const isBencana = memenuhiAmbangBatas({
    statusDarurat: kejadian.status_darurat,
    permintaanBantuanNasional: kejadian.permintaan_bantuan_nasional,
    dampak: latest ? dampakToAmbang(snapshotFromDampak(latest)) : null,
  });
  await supabase.from("kejadian_operasi").update({ is_bencana: isBencana }).eq("id", kejadian.id);
  return isBencana;
}

export async function loadDampakSnapshots(
  supabase: AuthSupabaseClient,
  kejadianId: string
): Promise<DampakSnapshot[]> {
  const { data } = await supabase
    .from("kejadian_dampak")
    .select("*")
    .eq("kejadian_id", kejadianId)
    .order("tanggal", { ascending: true });
  return ((data ?? []) as KejadianDampakRow[]).map(snapshotFromDampak);
}

export async function buildRekapStatis(
  supabase: AuthSupabaseClient,
  kejadianId: string
): Promise<RekapStatis | null> {
  const rows = await loadDampakSnapshots(supabase, kejadianId);
  return rekapStatis(rows);
}
