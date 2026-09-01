import type { AuthSupabaseClient } from "@/lib/supabase/ssr";
import type { KejadianDampakRow, KejadianOperasiRow } from "@/lib/sik/db-tables";
import {
  dampakToAmbang,
  formatKib,
  kibPrefix,
  memenuhiAmbangBatas,
  nextKibIndex,
  normalizeKorbanTerpilah,
  rekapStatis,
  tarikhFromWaktu,
  type DampakSnapshot,
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
): Promise<Record<string, number | null> | null> {
  const rows = await loadDampakSnapshots(supabase, kejadianId);
  return rekapStatis(rows);
}
