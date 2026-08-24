/** PRRPKA / PRRKA Rencana Induk fixtures — numbers come from JSON only. */

export const PRRPKA_DOC_PATH = "/docs/Kepgub_Renduk_PRRPKA_26-28.pdf";

export type PrrpkaMetadata = {
  judul: string;
  deskripsi: string;
  nomor_kepgub: string;
  periode: string;
  sumber: string;
  dokumen_url: string;
  terakhir_diperbarui: string;
  total_kabupaten_kota: number;
  grain: string;
};

export type PrrpkaKabTop = {
  kabupaten_kota: string;
  kerusakan_kerugian: number;
  prrka_total: number;
};

export type PrrpkaKesenjanganRow = {
  tingkat: string;
  kebutuhan: number;
  terakomodasi: number;
  kesenjangan: number;
  catatan: string;
};

export type PrrpkaSektorRow = {
  sektor: string;
  total: number;
  y2026: number;
  y2027: number;
  y2028: number;
};

export type PrrpkaRingkasan = {
  judul: string;
  unit_analisis: string;
  peran_kabupaten: string;
  total_kabupaten_kota: number;
  kabupaten_dalam_lingkup: number;
  kabupaten_terdampak: number;
  jitupasna_kerusakan_kerugian: number;
  jitupasna_kebutuhan_rr: number;
  perumahan_prrp_kk: number;
  perumahan_r3p_unit: number;
  perumahan_bnba_unit: number;
  prrka_kewenangan_aceh: number;
  prrka_lintas_kabupaten: number;
  kebutuhan_pusat: number;
  kebutuhan_provinsi_r3p: number;
  kebutuhan_kab_r3p: number;
  kebutuhan_kab_prrp: number;
  lima_kabupaten_kerusakan_terbesar: PrrpkaKabTop[];
  kesenjangan_tingkat: PrrpkaKesenjanganRow[];
  prrka_sektor: PrrpkaSektorRow[];
};

export type PrrpkaKabRow = {
  kode_bps: string;
  kabupaten_kota: string;
  jenis: string;
  dalam_lingkup_prrpka: boolean;
  terdampak_jitupasna: boolean;
  jitupasna_kerusakan_kerugian: number;
  jitupasna_kebutuhan_rr: number;
  perumahan_prrp_kk_jumlah: number;
  perumahan_r3p_jumlah: number;
  perumahan_bnba_jumlah: number;
  perumahan_r3p_rb: number;
  perumahan_r3p_rs: number;
  perumahan_r3p_rr: number;
  prrka_total: number;
  prrka_2026: number;
  prrka_2027: number;
  prrka_2028: number;
  pangsa_prrka_terhadap_kebutuhan_rr: number | null;
  peringkat_kerusakan: number | null;
};

export type PrrpkaAcehFixture = {
  metadata: {
    judul: string;
    deskripsi: string;
    nomor_kepgub: string;
    periode: string;
    sumber: string;
    berkas_asal?: string;
    terakhir_diperbarui: string;
    total_kabupaten_kota: number;
    grain: string;
  };
  kabupaten_kota: PrrpkaKabRow[];
};

export type PrrpkaSummaryResponse = {
  source: "fixture";
  metadata: PrrpkaMetadata;
  ringkasan: PrrpkaRingkasan;
  kabupaten_kota: PrrpkaKabRow[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asPrrpkaRingkasan(payload: unknown): PrrpkaRingkasan | null {
  if (!isRecord(payload)) return null;
  if (!Array.isArray(payload.lima_kabupaten_kerusakan_terbesar)) return null;
  if (!Array.isArray(payload.kesenjangan_tingkat)) return null;
  if (!Array.isArray(payload.prrka_sektor)) return null;
  if (typeof payload.jitupasna_kerusakan_kerugian !== "number") return null;
  return payload as unknown as PrrpkaRingkasan;
}

export function asPrrpkaAcehFixture(payload: unknown): PrrpkaAcehFixture | null {
  if (!isRecord(payload)) return null;
  if (!isRecord(payload.metadata)) return null;
  if (!Array.isArray(payload.kabupaten_kota) || payload.kabupaten_kota.length === 0) {
    return null;
  }
  return payload as unknown as PrrpkaAcehFixture;
}

/**
 * Assemble the homepage API payload from the two public fixtures.
 * Replaces the local Windows `berkas_asal` path with the public PDF URL.
 */
export function buildPrrpkaSummary(
  aceh: PrrpkaAcehFixture,
  ringkasan: PrrpkaRingkasan
): PrrpkaSummaryResponse {
  return {
    source: "fixture",
    metadata: {
      judul: aceh.metadata.judul,
      deskripsi: aceh.metadata.deskripsi,
      nomor_kepgub: aceh.metadata.nomor_kepgub,
      periode: aceh.metadata.periode,
      sumber: aceh.metadata.sumber,
      dokumen_url: PRRPKA_DOC_PATH,
      terakhir_diperbarui: aceh.metadata.terakhir_diperbarui,
      total_kabupaten_kota: aceh.metadata.total_kabupaten_kota,
      grain: aceh.metadata.grain,
    },
    ringkasan,
    kabupaten_kota: aceh.kabupaten_kota,
  };
}
