/**
 * Juklak BNPB No. 7 Tahun 2023 — Standar Data Kejadian dan Dampak Bencana.
 * KIB, ambang batas, rekap dinamis/statis, katalog wilayah Aceh.
 */

import { findJenisByKode, type JenisBencanaKode } from "@/lib/sik/jenis-bencana";

export const KODE_PROVINSI_ACEH = "11";

export const FASE_DATA = ["dinamis", "diajukan", "statis"] as const;
export type FaseData = (typeof FASE_DATA)[number];

export const KELOMPOK_UMUR = ["anak", "dewasa", "lansia"] as const;
export type KelompokUmur = (typeof KELOMPOK_UMUR)[number];

export const JENIS_KELAMIN_KORBAN = ["L", "P"] as const;
export type JenisKelaminKorban = (typeof JENIS_KELAMIN_KORBAN)[number];

export const KATEGORI_KORBAN = [
  "meninggal",
  "hilang",
  "luka",
  "menderita",
  "mengungsi",
] as const;
export type KategoriKorban = (typeof KATEGORI_KORBAN)[number];

export type KorbanCell = { L: number; P: number };
export type KorbanUmur = Record<KelompokUmur, KorbanCell>;
export type KorbanTerpilah = Record<KategoriKorban, KorbanUmur>;

export const ACEH_KABUPATEN = [
  { kode: "1101", nama: "Aceh Selatan" },
  { kode: "1102", nama: "Aceh Tenggara" },
  { kode: "1103", nama: "Aceh Timur" },
  { kode: "1104", nama: "Aceh Tengah" },
  { kode: "1105", nama: "Aceh Barat" },
  { kode: "1106", nama: "Aceh Besar" },
  { kode: "1107", nama: "Pidie" },
  { kode: "1108", nama: "Aceh Utara" },
  { kode: "1109", nama: "Simeulue" },
  { kode: "1110", nama: "Aceh Singkil" },
  { kode: "1111", nama: "Bireuen" },
  { kode: "1112", nama: "Aceh Barat Daya" },
  { kode: "1113", nama: "Gayo Lues" },
  { kode: "1114", nama: "Aceh Tamiang" },
  { kode: "1115", nama: "Nagan Raya" },
  { kode: "1116", nama: "Aceh Jaya" },
  { kode: "1117", nama: "Bener Meriah" },
  { kode: "1118", nama: "Pidie Jaya" },
  { kode: "1171", nama: "Banda Aceh" },
  { kode: "1172", nama: "Sabang" },
  { kode: "1173", nama: "Langsa" },
  { kode: "1174", nama: "Lhokseumawe" },
  { kode: "1175", nama: "Subulussalam" },
] as const;

export type AcehKabKode = (typeof ACEH_KABUPATEN)[number]["kode"];

/** Slug laporan masyarakat (kode lama dipertahankan) → kode jenis Juklak. */
export const LAPORAN_SLUG_TO_KODE: Record<string, JenisBencanaKode> = {
  banjir: 101,
  longsor: 102,
  abrasi: 103,
  cuaca_ekstrem: 104,
  kekeringan: 105,
  karhutla: 106,
  gempa: 107,
  tsunami: 108,
  gunung_meletus: 109,
  epidemi: 201,
  kebakaran_permukiman: 202,
  gagal_teknologi: 203,
  konflik_sosial: 301,
};

export const LAPORAN_JENIS_SLUGS = [
  "banjir",
  "longsor",
  "gempa",
  "tsunami",
  "gunung_meletus",
  "abrasi",
  "cuaca_ekstrem",
  "kekeringan",
  "karhutla",
  "epidemi",
  "kebakaran_permukiman",
  "gagal_teknologi",
  "konflik_sosial",
] as const;

export type LaporanJenisSlug = (typeof LAPORAN_JENIS_SLUGS)[number];

export function findKabupaten(kodeOrNama: string | null | undefined) {
  if (!kodeOrNama) return undefined;
  const raw = kodeOrNama.trim();
  return ACEH_KABUPATEN.find((k) => k.kode === raw || k.nama.toLowerCase() === raw.toLowerCase());
}

/** 2 digit kabupaten for KIB from 4-digit Kemendagri (1101 → 01, 1171 → 71). */
export function kabKodeDuaDigit(kodeKabupaten: string): string {
  const digits = kodeKabupaten.replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-2);
  if (digits.length === 2) return digits;
  throw new Error("kode_kabupaten harus 4 digit Kemendagri (contoh 1101)");
}

/** 15 digit pertama KIB (tanpa index). tarikh = YYYY-MM-DD. */
export function kibPrefix(input: {
  kodeKabupaten: string;
  kodeJenis: number;
  tarikh: string;
}): string {
  const ymd = input.tarikh.replace(/-/g, "");
  if (!/^\d{8}$/.test(ymd)) throw new Error("tarikh harus YYYY-MM-DD");
  const jenis = String(input.kodeJenis).padStart(3, "0");
  return `${KODE_PROVINSI_ACEH}${kabKodeDuaDigit(input.kodeKabupaten)}${jenis}${ymd}`;
}

export function formatKib(prefix15: string, index: number): string {
  if (!/^\d{15}$/.test(prefix15)) throw new Error("prefiks KIB harus 15 digit");
  if (!Number.isInteger(index) || index < 1 || index > 9) {
    throw new Error("index KIB 1–9");
  }
  return `${prefix15}${index}`;
}

export function parseKibIndex(kib: string): number {
  const d = kib.replace(/\s/g, "");
  if (!/^\d{16}$/.test(d)) throw new Error("KIB harus 16 digit");
  return Number(d.slice(-1));
}

export function nextKibIndex(existingKibs: readonly string[]): number {
  let max = 0;
  for (const kib of existingKibs) {
    const n = parseKibIndex(kib);
    if (n > max) max = n;
  }
  const next = max + 1;
  if (next > 9) throw new Error("index KIB harian melebihi 9");
  return next;
}

export function tarikhFromWaktu(isoOrLocal: string): string {
  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) throw new Error("waktu_kejadian tidak valid");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

export function emptyKorbanCell(): KorbanCell {
  return { L: 0, P: 0 };
}

export function emptyKorbanUmur(): KorbanUmur {
  return { anak: emptyKorbanCell(), dewasa: emptyKorbanCell(), lansia: emptyKorbanCell() };
}

export function emptyKorbanTerpilah(): KorbanTerpilah {
  return {
    meninggal: emptyKorbanUmur(),
    hilang: emptyKorbanUmur(),
    luka: emptyKorbanUmur(),
    menderita: emptyKorbanUmur(),
    mengungsi: emptyKorbanUmur(),
  };
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? Math.floor(x) : 0;
}

export function normalizeKorbanTerpilah(raw: unknown): KorbanTerpilah {
  const base = emptyKorbanTerpilah();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Record<string, unknown>;
  for (const kat of KATEGORI_KORBAN) {
    const block = src[kat];
    if (!block || typeof block !== "object") continue;
    const umurSrc = block as Record<string, unknown>;
    for (const umur of KELOMPOK_UMUR) {
      const cell = umurSrc[umur];
      if (!cell || typeof cell !== "object") continue;
      const c = cell as Record<string, unknown>;
      base[kat][umur] = { L: n(c.L), P: n(c.P) };
    }
  }
  return base;
}

export function sumKorbanKategori(matrix: KorbanTerpilah, kat: KategoriKorban): number {
  let total = 0;
  for (const umur of KELOMPOK_UMUR) {
    total += matrix[kat][umur].L + matrix[kat][umur].P;
  }
  return total;
}

export function totalsFromKorbanTerpilah(matrix: KorbanTerpilah): {
  meninggal: number;
  hilang: number;
  luka: number;
  menderita: number;
  mengungsi: number;
} {
  return {
    meninggal: sumKorbanKategori(matrix, "meninggal"),
    hilang: sumKorbanKategori(matrix, "hilang"),
    luka: sumKorbanKategori(matrix, "luka"),
    menderita: sumKorbanKategori(matrix, "menderita"),
    mengungsi: sumKorbanKategori(matrix, "mengungsi"),
  };
}

export type DampakAmbangInput = {
  meninggal: number;
  luka: number;
  mengungsi: number;
  menderita: number;
  rumahRusak: number;
  faskes: number;
  pendidikan: number;
  ibadah: number;
  kantor: number;
  pasar: number;
  lahanHa: number;
};

export function memenuhiAmbangBatas(input: {
  dampak?: DampakAmbangInput | null;
  statusDarurat: boolean;
  permintaanBantuanNasional: boolean;
}): boolean {
  if (input.statusDarurat || input.permintaanBantuanNasional) return true;
  const d = input.dampak;
  if (!d) return false;
  if (d.meninggal >= 1) return true;
  if (d.menderita + d.luka + d.mengungsi >= 50) return true;
  const fasilitas =
    d.rumahRusak + d.faskes + d.pendidikan + d.ibadah + d.kantor + d.pasar;
  if (fasilitas >= 5) return true;
  if (d.lahanHa >= 1) return true;
  return false;
}

export type DampakSnapshot = {
  tanggal: string;
  meninggal: number;
  hilang: number;
  luka_berat: number;
  luka_ringan: number;
  mengungsi: number;
  menderita: number;
  rumah_rb: number;
  rumah_rs: number;
  rumah_rr: number;
  rumah_terendam: number;
  kerugian_rumah_rp: number | null;
  faskes: number;
  pendidikan: number;
  ibadah: number;
  kantor: number;
  pasar: number;
  kerugian_pelayanan_rp: number | null;
  sapras: number;
  kerugian_sapras_rp: number | null;
  lahan_ha: number | null;
  toko: number;
  pabrik: number;
  kerugian_ekonomi_rp: number | null;
  korban_terpilah?: KorbanTerpilah | null;
};

function lukaTotal(row: DampakSnapshot): number {
  const fromFields = row.luka_berat + row.luka_ringan;
  if (row.korban_terpilah) {
    const fromMatrix = sumKorbanKategori(row.korban_terpilah, "luka");
    return Math.max(fromFields, fromMatrix);
  }
  return fromFields;
}

/** Meninggal/hilang = terakhir; luka/menderita/mengungsi = puncak; kerusakan = terakhir. */
export function rekapStatis(rows: readonly DampakSnapshot[]): Record<string, number | null> | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const last = sorted[sorted.length - 1];
  const puncakLuka = Math.max(...sorted.map(lukaTotal));
  const puncakMengungsi = Math.max(...sorted.map((r) => r.mengungsi));
  const puncakMenderita = Math.max(...sorted.map((r) => r.menderita));
  return {
    meninggal: last.meninggal,
    hilang: last.hilang,
    luka: puncakLuka,
    luka_berat: Math.max(...sorted.map((r) => r.luka_berat)),
    luka_ringan: Math.max(...sorted.map((r) => r.luka_ringan)),
    mengungsi: puncakMengungsi,
    menderita: puncakMenderita,
    rumah_rb: last.rumah_rb,
    rumah_rs: last.rumah_rs,
    rumah_rr: last.rumah_rr,
    rumah_terendam: last.rumah_terendam,
    kerugian_rumah_rp: last.kerugian_rumah_rp,
    faskes: last.faskes,
    pendidikan: last.pendidikan,
    ibadah: last.ibadah,
    kantor: last.kantor,
    pasar: last.pasar,
    kerugian_pelayanan_rp: last.kerugian_pelayanan_rp,
    sapras: last.sapras,
    kerugian_sapras_rp: last.kerugian_sapras_rp,
    lahan_ha: last.lahan_ha,
    toko: last.toko,
    pabrik: last.pabrik,
    kerugian_ekonomi_rp: last.kerugian_ekonomi_rp,
  };
}

export function dampakToAmbang(row: DampakSnapshot): DampakAmbangInput {
  const matrix = row.korban_terpilah;
  const totals = matrix ? totalsFromKorbanTerpilah(matrix) : null;
  const lahan =
    row.lahan_ha == null || Number.isNaN(Number(row.lahan_ha)) ? 0 : Number(row.lahan_ha);
  return {
    meninggal: totals ? Math.max(row.meninggal, totals.meninggal) : row.meninggal,
    luka: lukaTotal(row),
    mengungsi: totals ? Math.max(row.mengungsi, totals.mengungsi) : row.mengungsi,
    menderita: totals ? Math.max(row.menderita, totals.menderita) : row.menderita,
    rumahRusak: row.rumah_rb + row.rumah_rs + row.rumah_rr + row.rumah_terendam,
    faskes: row.faskes,
    pendidikan: row.pendidikan,
    ibadah: row.ibadah,
    kantor: row.kantor,
    pasar: row.pasar,
    lahanHa: lahan,
  };
}

export function mapLaporanSlugToJenis(slug: string): {
  kode: JenisBencanaKode;
  jenis: string;
  slugNama: string;
  nama: string;
} | null {
  const kode = LAPORAN_SLUG_TO_KODE[slug];
  if (!kode) return null;
  const entry = findJenisByKode(kode);
  if (!entry) return null;
  const first = entry.namaKejadian[0];
  return { kode, jenis: entry.jenis, slugNama: first.slug, nama: first.nama };
}

export function deskripsiPlaceholder(kodeJenis: number | null | undefined): string {
  if (kodeJenis === 101) return "Tinggi muka air, durasi genangan, sumber luapan…";
  if (kodeJenis === 107) return "Titik episentrum, magnitude, kedalaman…";
  if (kodeJenis === 108) return "Ketinggian run-up, waktu tiba gelombang…";
  if (kodeJenis === 109) return "Nama gunung api, jenis erupsi, arah sebaran abu…";
  if (kodeJenis === 104) return "Kecepatan angin, durasi, material terbang…";
  if (kodeJenis === 106) return "Luas terbakar, jenis lahan, sebaran asap…";
  return "Uraikan kejadian agar orang yang tidak di lokasi memahaminya.";
}

function unitSum(...vals: Array<number | null | undefined>): number {
  return vals.reduce<number>((acc, v) => acc + (Number(v) || 0), 0);
}

/** Isi kolom total dari matriks / rincian RB-RS-RR agar DIBI tetap baca field lama. */
export function rollupDampakFields(input: {
  korban_terpilah?: unknown;
  luka_berat?: number;
  luka_ringan?: number;
  meninggal?: number;
  hilang?: number;
  mengungsi?: number;
  menderita?: number;
  pendidikan_rb?: number;
  pendidikan_rs?: number;
  pendidikan_rr?: number;
  pendidikan_terendam?: number;
  ibadah_rb?: number;
  ibadah_rs?: number;
  ibadah_rr?: number;
  ibadah_terendam?: number;
  faskes_rb?: number;
  faskes_rs?: number;
  faskes_rr?: number;
  faskes_terendam?: number;
  kantor_rb?: number;
  kantor_rs?: number;
  kantor_rr?: number;
  kantor_terendam?: number;
  pasar_rb?: number;
  pasar_rs?: number;
  pasar_rr?: number;
  pasar_terendam?: number;
  toko_rb?: number;
  toko_rs?: number;
  toko_rr?: number;
  toko_terendam?: number;
  pabrik_rb?: number;
  pabrik_rs?: number;
  pabrik_rr?: number;
  pabrik_terendam?: number;
  sawah_ha?: number | null;
  lahan_ha?: number | null;
  kebun_ha?: number | null;
  hutan_ha?: number | null;
  kolam_ha?: number | null;
  jembatan_rb?: number;
  jembatan_rs?: number;
  jembatan_rr?: number;
  jembatan_terendam?: number;
}): {
  meninggal: number;
  hilang: number;
  mengungsi: number;
  menderita: number;
  pendidikan: number;
  ibadah: number;
  faskes: number;
  kantor: number;
  pasar: number;
  toko: number;
  pabrik: number;
  lahan_ha: number;
  sapras: number;
} {
  const matrix = normalizeKorbanTerpilah(input.korban_terpilah);
  const totals = totalsFromKorbanTerpilah(matrix);
  const matrixUsed = KATEGORI_KORBAN.some((k) => sumKorbanKategori(matrix, k) > 0);
  return {
    meninggal: matrixUsed ? totals.meninggal : n(input.meninggal),
    hilang: matrixUsed ? totals.hilang : n(input.hilang),
    mengungsi: matrixUsed ? totals.mengungsi : n(input.mengungsi),
    menderita: matrixUsed ? totals.menderita : n(input.menderita),
    pendidikan: unitSum(
      input.pendidikan_rb,
      input.pendidikan_rs,
      input.pendidikan_rr,
      input.pendidikan_terendam
    ),
    ibadah: unitSum(input.ibadah_rb, input.ibadah_rs, input.ibadah_rr, input.ibadah_terendam),
    faskes: unitSum(input.faskes_rb, input.faskes_rs, input.faskes_rr, input.faskes_terendam),
    kantor: unitSum(input.kantor_rb, input.kantor_rs, input.kantor_rr, input.kantor_terendam),
    pasar: unitSum(input.pasar_rb, input.pasar_rs, input.pasar_rr, input.pasar_terendam),
    toko: unitSum(input.toko_rb, input.toko_rs, input.toko_rr, input.toko_terendam),
    pabrik: unitSum(input.pabrik_rb, input.pabrik_rs, input.pabrik_rr, input.pabrik_terendam),
    lahan_ha: unitSum(input.sawah_ha, input.lahan_ha, input.kebun_ha, input.hutan_ha, input.kolam_ha),
    sapras: unitSum(input.jembatan_rb, input.jembatan_rs, input.jembatan_rr, input.jembatan_terendam),
  };
}
