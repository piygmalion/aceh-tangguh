/**
 * Juklak BNPB No. 7 Tahun 2023 — Standar Data Kejadian dan Dampak Bencana.
 * KIB, ambang batas, rekap dinamis/statis, katalog wilayah Aceh.
 */

import { findJenisByKode, type JenisBencanaKode } from "@/lib/sik/jenis-bencana";

export const KODE_PROVINSI_ACEH = "11";

export const FASE_DATA = ["dinamis", "diajukan", "statis"] as const;
export type FaseData = (typeof FASE_DATA)[number];

export const KIB_SUMBER = ["lokasi", "episentrum", "laut"] as const;
export type KibSumber = (typeof KIB_SUMBER)[number];

export const KERUGIAN_RINCI_KEYS = [
  "sawah",
  "lahan",
  "kebun",
  "hutan",
  "kolam",
  "toko",
  "pabrik",
  "air",
  "listrik",
  "telekom",
  "irigasi",
  "jalan",
  "jembatan",
  "transportasi",
  "spbu",
  "pendidikan",
  "ibadah",
  "faskes",
  "kantor",
  "pasar",
] as const;
export type KerugianRinciKey = (typeof KERUGIAN_RINCI_KEYS)[number];
export type KerugianRinci = Record<KerugianRinciKey, number | null>;

const KERUGIAN_EKONOMI: readonly KerugianRinciKey[] = [
  "sawah",
  "lahan",
  "kebun",
  "hutan",
  "kolam",
  "toko",
  "pabrik",
];
const KERUGIAN_SAPRAS: readonly KerugianRinciKey[] = [
  "air",
  "listrik",
  "telekom",
  "irigasi",
  "jalan",
  "jembatan",
  "transportasi",
  "spbu",
];
const KERUGIAN_PELAYANAN: readonly KerugianRinciKey[] = [
  "pendidikan",
  "ibadah",
  "faskes",
  "kantor",
  "pasar",
];

export const PENGUNGSI_BAND = ["bayi", "balita", "anak", "remaja", "dewasa", "lansia"] as const;
export type PengungsiBand = (typeof PENGUNGSI_BAND)[number];
export type PengungsiJiwa = Record<PengungsiBand, KorbanCell>;

export const RENTAN_PENGUNGSI_KEYS = [
  "disabilitas_L",
  "disabilitas_P",
  "hamil_t1",
  "hamil_t2",
  "hamil_t3",
  "menyusui",
  "kk_perempuan",
  "anak_terpisah",
  "anak_kk",
  "perempuan_dini",
  "penyakit_khusus",
] as const;
export type RentanPengungsiKey = (typeof RENTAN_PENGUNGSI_KEYS)[number];
export type RentanPengungsi = Record<RentanPengungsiKey, number>;

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

export function emptyKerugianRinci(): KerugianRinci {
  return {
    sawah: null,
    lahan: null,
    kebun: null,
    hutan: null,
    kolam: null,
    toko: null,
    pabrik: null,
    air: null,
    listrik: null,
    telekom: null,
    irigasi: null,
    jalan: null,
    jembatan: null,
    transportasi: null,
    spbu: null,
    pendidikan: null,
    ibadah: null,
    faskes: null,
    kantor: null,
    pasar: null,
  };
}

export function normalizeKerugianRinci(raw: unknown): KerugianRinci {
  const base = emptyKerugianRinci();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Record<string, unknown>;
  for (const key of KERUGIAN_RINCI_KEYS) {
    const x = Number(src[key]);
    base[key] = Number.isFinite(x) && x > 0 ? x : null;
  }
  return base;
}

function sumKerugianKeys(rinci: KerugianRinci, keys: readonly KerugianRinciKey[]): number {
  return keys.reduce((acc, key) => acc + (Number(rinci[key]) || 0), 0);
}

export function rollupKerugian(rinci: KerugianRinci): {
  kerugian_ekonomi_rp: number;
  kerugian_sapras_rp: number;
  kerugian_pelayanan_rp: number;
} {
  return {
    kerugian_ekonomi_rp: sumKerugianKeys(rinci, KERUGIAN_EKONOMI),
    kerugian_sapras_rp: sumKerugianKeys(rinci, KERUGIAN_SAPRAS),
    kerugian_pelayanan_rp: sumKerugianKeys(rinci, KERUGIAN_PELAYANAN),
  };
}

export function emptyPengungsiJiwa(): PengungsiJiwa {
  return {
    bayi: emptyKorbanCell(),
    balita: emptyKorbanCell(),
    anak: emptyKorbanCell(),
    remaja: emptyKorbanCell(),
    dewasa: emptyKorbanCell(),
    lansia: emptyKorbanCell(),
  };
}

export function normalizePengungsiJiwa(raw: unknown): PengungsiJiwa {
  const base = emptyPengungsiJiwa();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Record<string, unknown>;
  for (const band of PENGUNGSI_BAND) {
    const cell = src[band];
    if (!cell || typeof cell !== "object") continue;
    const c = cell as Record<string, unknown>;
    base[band] = { L: n(c.L), P: n(c.P) };
  }
  return base;
}

export function emptyRentanPengungsi(): RentanPengungsi {
  return {
    disabilitas_L: 0,
    disabilitas_P: 0,
    hamil_t1: 0,
    hamil_t2: 0,
    hamil_t3: 0,
    menyusui: 0,
    kk_perempuan: 0,
    anak_terpisah: 0,
    anak_kk: 0,
    perempuan_dini: 0,
    penyakit_khusus: 0,
  };
}

export function normalizeRentanPengungsi(raw: unknown): RentanPengungsi {
  const base = emptyRentanPengungsi();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Record<string, unknown>;
  for (const key of RENTAN_PENGUNGSI_KEYS) {
    base[key] = n(src[key]);
  }
  return base;
}

/** Juklak 9 band → matriks mengungsi Juklak 7 (anak = bayi+balita+anak+remaja). */
export function rollupPengungsiKeJuklak7(jiwa: PengungsiJiwa): KorbanUmur {
  return {
    anak: {
      L: jiwa.bayi.L + jiwa.balita.L + jiwa.anak.L + jiwa.remaja.L,
      P: jiwa.bayi.P + jiwa.balita.P + jiwa.anak.P + jiwa.remaja.P,
    },
    dewasa: { ...jiwa.dewasa },
    lansia: { ...jiwa.lansia },
  };
}

export function sumPengungsiJiwa(items: readonly PengungsiJiwa[]): PengungsiJiwa {
  const acc = emptyPengungsiJiwa();
  for (const jiwa of items) {
    for (const band of PENGUNGSI_BAND) {
      acc[band].L += jiwa[band].L;
      acc[band].P += jiwa[band].P;
    }
  }
  return acc;
}

export function roundCoord6(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Number(Number(n).toFixed(6));
}

export const KERUGIAN_RINCI_LABEL: Record<KerugianRinciKey, string> = {
  sawah: "Sawah",
  lahan: "Lahan",
  kebun: "Kebun",
  hutan: "Hutan",
  kolam: "Kolam",
  toko: "Kios/toko",
  pabrik: "Pabrik",
  air: "Jaringan air",
  listrik: "Jaringan listrik",
  telekom: "Telekomunikasi",
  irigasi: "Irigasi",
  jalan: "Jalan",
  jembatan: "Jembatan",
  transportasi: "Transportasi",
  spbu: "SPBU",
  pendidikan: "Pendidikan",
  ibadah: "Ibadat",
  faskes: "Faskes",
  kantor: "Kantor",
  pasar: "Pasar",
};

export const PENGUNGSI_BAND_LABEL: Record<PengungsiBand, string> = {
  bayi: "Bayi <1",
  balita: "Balita <5",
  anak: "Anak 6–12",
  remaja: "Remaja 13–17",
  dewasa: "Dewasa 18–59",
  lansia: "Lansia 60+",
};

export const RENTAN_PENGUNGSI_LABEL: Record<RentanPengungsiKey, string> = {
  disabilitas_L: "Disabilitas L",
  disabilitas_P: "Disabilitas P",
  hamil_t1: "Ibu hamil T1",
  hamil_t2: "Ibu hamil T2",
  hamil_t3: "Ibu hamil T3",
  menyusui: "Menyusui",
  kk_perempuan: "KK perempuan",
  anak_terpisah: "Anak terpisah",
  anak_kk: "Anak kepala keluarga",
  perempuan_dini: "Perkawinan anak",
  penyakit_khusus: "Penyakit khusus",
};

/** Catatan Lampiran I: definisi tingkat kerusakan bangunan. */
export const DEFINISI_KERUSAKAN = {
  rb: "RB — roboh atau struktur utama rusak sehingga tidak layak huni/pakai.",
  rs: "RS — struktur masih berdiri, kerusakan komponen signifikan.",
  rr: "RR — kerusakan non-struktural, masih dapat dipakai dengan perbaikan ringan.",
  terendam: "Terendam — tergenang air tanpa meruntuhkan struktur.",
} as const;

export function coerceRekapStatis(raw: unknown): RekapStatis | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!("meninggal" in r) && !("korban_terpilah" in r)) return null;
  return rekapStatis([
    {
      tanggal: typeof r.tanggal === "string" ? r.tanggal : "1970-01-01",
      meninggal: n(r.meninggal),
      hilang: n(r.hilang),
      luka_berat: n(r.luka_berat),
      luka_ringan: n(r.luka_ringan),
      mengungsi: n(r.mengungsi),
      menderita: n(r.menderita),
      rumah_rb: n(r.rumah_rb),
      rumah_rs: n(r.rumah_rs),
      rumah_rr: n(r.rumah_rr),
      rumah_terendam: n(r.rumah_terendam),
      kerugian_rumah_rp: numOrNull(r.kerugian_rumah_rp),
      faskes: n(r.faskes),
      pendidikan: n(r.pendidikan),
      ibadah: n(r.ibadah),
      kantor: n(r.kantor),
      pasar: n(r.pasar),
      kerugian_pelayanan_rp: numOrNull(r.kerugian_pelayanan_rp),
      sapras: n(r.sapras),
      kerugian_sapras_rp: numOrNull(r.kerugian_sapras_rp),
      lahan_ha: numOrNull(r.lahan_ha),
      toko: n(r.toko),
      pabrik: n(r.pabrik),
      kerugian_ekonomi_rp: numOrNull(r.kerugian_ekonomi_rp),
      korban_terpilah: normalizeKorbanTerpilah(r.korban_terpilah),
      kerugian_rinci: normalizeKerugianRinci(r.kerugian_rinci),
      kebutuhan_dana_juta: numOrNull(r.kebutuhan_dana_juta),
      kebutuhan_sdm: strOrNull(r.kebutuhan_sdm),
      kebutuhan_sapras: strOrNull(r.kebutuhan_sapras),
      kebutuhan_logistik: strOrNull(r.kebutuhan_logistik),
      kebutuhan_peralatan: strOrNull(r.kebutuhan_peralatan),
      aset_kedaruratan: strOrNull(r.aset_kedaruratan),
      kondisi_mutakhir: strOrNull(r.kondisi_mutakhir),
      upaya_penanganan: strOrNull(r.upaya_penanganan),
      sawah_ha: numOrNull(r.sawah_ha),
      kebun_ha: numOrNull(r.kebun_ha),
      hutan_ha: numOrNull(r.hutan_ha),
      kolam_ha: numOrNull(r.kolam_ha),
      pendidikan_rb: n(r.pendidikan_rb),
      pendidikan_rs: n(r.pendidikan_rs),
      pendidikan_rr: n(r.pendidikan_rr),
      pendidikan_terendam: n(r.pendidikan_terendam),
      ibadah_rb: n(r.ibadah_rb),
      ibadah_rs: n(r.ibadah_rs),
      ibadah_rr: n(r.ibadah_rr),
      ibadah_terendam: n(r.ibadah_terendam),
      faskes_rb: n(r.faskes_rb),
      faskes_rs: n(r.faskes_rs),
      faskes_rr: n(r.faskes_rr),
      faskes_terendam: n(r.faskes_terendam),
      kantor_rb: n(r.kantor_rb),
      kantor_rs: n(r.kantor_rs),
      kantor_rr: n(r.kantor_rr),
      kantor_terendam: n(r.kantor_terendam),
      pasar_rb: n(r.pasar_rb),
      pasar_rs: n(r.pasar_rs),
      pasar_rr: n(r.pasar_rr),
      pasar_terendam: n(r.pasar_terendam),
      toko_rb: n(r.toko_rb),
      toko_rs: n(r.toko_rs),
      toko_rr: n(r.toko_rr),
      toko_terendam: n(r.toko_terendam),
      pabrik_rb: n(r.pabrik_rb),
      pabrik_rs: n(r.pabrik_rs),
      pabrik_rr: n(r.pabrik_rr),
      pabrik_terendam: n(r.pabrik_terendam),
      jembatan_rb: n(r.jembatan_rb),
      jembatan_rs: n(r.jembatan_rs),
      jembatan_rr: n(r.jembatan_rr),
      jembatan_terendam: n(r.jembatan_terendam),
      jalan_km: numOrNull(r.jalan_km),
      air_jaringan: strOrNull(r.air_jaringan),
      listrik_jaringan: strOrNull(r.listrik_jaringan),
      telekom_jaringan: strOrNull(r.telekom_jaringan),
      irigasi_jaringan: strOrNull(r.irigasi_jaringan),
      transportasi_jaringan: strOrNull(r.transportasi_jaringan),
      spbu_jaringan: strOrNull(r.spbu_jaringan),
    },
  ]);
}

function numOrNull(v: unknown): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
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
  kerugian_rinci?: KerugianRinci | null;
  kebutuhan_dana_juta?: number | null;
  kebutuhan_sdm?: string | null;
  kebutuhan_sapras?: string | null;
  kebutuhan_logistik?: string | null;
  kebutuhan_peralatan?: string | null;
  aset_kedaruratan?: string | null;
  kondisi_mutakhir?: string | null;
  upaya_penanganan?: string | null;
  sawah_ha?: number | null;
  kebun_ha?: number | null;
  hutan_ha?: number | null;
  kolam_ha?: number | null;
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
  jembatan_rb?: number;
  jembatan_rs?: number;
  jembatan_rr?: number;
  jembatan_terendam?: number;
  jalan_km?: number | null;
  air_jaringan?: string | null;
  listrik_jaringan?: string | null;
  telekom_jaringan?: string | null;
  irigasi_jaringan?: string | null;
  transportasi_jaringan?: string | null;
  spbu_jaringan?: string | null;
};

export type RekapStatis = {
  meninggal: number;
  hilang: number;
  luka: number;
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
  sawah_ha: number | null;
  kebun_ha: number | null;
  hutan_ha: number | null;
  kolam_ha: number | null;
  pendidikan_rb: number;
  pendidikan_rs: number;
  pendidikan_rr: number;
  pendidikan_terendam: number;
  ibadah_rb: number;
  ibadah_rs: number;
  ibadah_rr: number;
  ibadah_terendam: number;
  faskes_rb: number;
  faskes_rs: number;
  faskes_rr: number;
  faskes_terendam: number;
  kantor_rb: number;
  kantor_rs: number;
  kantor_rr: number;
  kantor_terendam: number;
  pasar_rb: number;
  pasar_rs: number;
  pasar_rr: number;
  pasar_terendam: number;
  toko_rb: number;
  toko_rs: number;
  toko_rr: number;
  toko_terendam: number;
  pabrik_rb: number;
  pabrik_rs: number;
  pabrik_rr: number;
  pabrik_terendam: number;
  jembatan_rb: number;
  jembatan_rs: number;
  jembatan_rr: number;
  jembatan_terendam: number;
  jalan_km: number | null;
  air_jaringan: string | null;
  listrik_jaringan: string | null;
  telekom_jaringan: string | null;
  irigasi_jaringan: string | null;
  transportasi_jaringan: string | null;
  spbu_jaringan: string | null;
  korban_terpilah: KorbanTerpilah;
  kerugian_rinci: KerugianRinci;
  kebutuhan_dana_juta: number | null;
  kebutuhan_sdm: string | null;
  kebutuhan_sapras: string | null;
  kebutuhan_logistik: string | null;
  kebutuhan_peralatan: string | null;
  aset_kedaruratan: string | null;
  kondisi_mutakhir: string | null;
  upaya_penanganan: string | null;
};

function lukaTotal(row: DampakSnapshot): number {
  const fromFields = row.luka_berat + row.luka_ringan;
  if (row.korban_terpilah) {
    const fromMatrix = sumKorbanKategori(row.korban_terpilah, "luka");
    return Math.max(fromFields, fromMatrix);
  }
  return fromFields;
}

function matrixOf(row: DampakSnapshot): KorbanTerpilah {
  return row.korban_terpilah
    ? normalizeKorbanTerpilah(row.korban_terpilah)
    : emptyKorbanTerpilah();
}

function peakBy(rows: readonly DampakSnapshot[], score: (r: DampakSnapshot) => number): DampakSnapshot {
  return rows.reduce((best, row) => (score(row) >= score(best) ? row : best));
}

function joinUnik(values: Array<string | null | undefined>): string | null {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const text = raw?.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out.length ? out.join("\n") : null;
}

/** Meninggal/hilang = terakhir; luka/menderita/mengungsi = puncak; kerusakan = terakhir. */
export function rekapStatis(rows: readonly DampakSnapshot[]): RekapStatis | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const last = sorted[sorted.length - 1];
  const puncakLuka = Math.max(...sorted.map(lukaTotal));
  const puncakMengungsi = Math.max(...sorted.map((r) => r.mengungsi));
  const puncakMenderita = Math.max(...sorted.map((r) => r.menderita));
  const lastMatrix = matrixOf(last);
  const peakLukaRow = peakBy(sorted, lukaTotal);
  const peakMengungsiRow = peakBy(sorted, (r) => r.mengungsi);
  const peakMenderitaRow = peakBy(sorted, (r) => r.menderita);
  const rinci = normalizeKerugianRinci(last.kerugian_rinci);
  const rolledKerugian = rollupKerugian(rinci);
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
    kerugian_pelayanan_rp: last.kerugian_pelayanan_rp ?? rolledKerugian.kerugian_pelayanan_rp,
    sapras: last.sapras,
    kerugian_sapras_rp: last.kerugian_sapras_rp ?? rolledKerugian.kerugian_sapras_rp,
    lahan_ha: last.lahan_ha,
    toko: last.toko,
    pabrik: last.pabrik,
    kerugian_ekonomi_rp: last.kerugian_ekonomi_rp ?? rolledKerugian.kerugian_ekonomi_rp,
    sawah_ha: last.sawah_ha ?? null,
    kebun_ha: last.kebun_ha ?? null,
    hutan_ha: last.hutan_ha ?? null,
    kolam_ha: last.kolam_ha ?? null,
    pendidikan_rb: last.pendidikan_rb ?? 0,
    pendidikan_rs: last.pendidikan_rs ?? 0,
    pendidikan_rr: last.pendidikan_rr ?? 0,
    pendidikan_terendam: last.pendidikan_terendam ?? 0,
    ibadah_rb: last.ibadah_rb ?? 0,
    ibadah_rs: last.ibadah_rs ?? 0,
    ibadah_rr: last.ibadah_rr ?? 0,
    ibadah_terendam: last.ibadah_terendam ?? 0,
    faskes_rb: last.faskes_rb ?? 0,
    faskes_rs: last.faskes_rs ?? 0,
    faskes_rr: last.faskes_rr ?? 0,
    faskes_terendam: last.faskes_terendam ?? 0,
    kantor_rb: last.kantor_rb ?? 0,
    kantor_rs: last.kantor_rs ?? 0,
    kantor_rr: last.kantor_rr ?? 0,
    kantor_terendam: last.kantor_terendam ?? 0,
    pasar_rb: last.pasar_rb ?? 0,
    pasar_rs: last.pasar_rs ?? 0,
    pasar_rr: last.pasar_rr ?? 0,
    pasar_terendam: last.pasar_terendam ?? 0,
    toko_rb: last.toko_rb ?? 0,
    toko_rs: last.toko_rs ?? 0,
    toko_rr: last.toko_rr ?? 0,
    toko_terendam: last.toko_terendam ?? 0,
    pabrik_rb: last.pabrik_rb ?? 0,
    pabrik_rs: last.pabrik_rs ?? 0,
    pabrik_rr: last.pabrik_rr ?? 0,
    pabrik_terendam: last.pabrik_terendam ?? 0,
    jembatan_rb: last.jembatan_rb ?? 0,
    jembatan_rs: last.jembatan_rs ?? 0,
    jembatan_rr: last.jembatan_rr ?? 0,
    jembatan_terendam: last.jembatan_terendam ?? 0,
    jalan_km: last.jalan_km ?? null,
    air_jaringan: last.air_jaringan ?? null,
    listrik_jaringan: last.listrik_jaringan ?? null,
    telekom_jaringan: last.telekom_jaringan ?? null,
    irigasi_jaringan: last.irigasi_jaringan ?? null,
    transportasi_jaringan: last.transportasi_jaringan ?? null,
    spbu_jaringan: last.spbu_jaringan ?? null,
    korban_terpilah: {
      meninggal: lastMatrix.meninggal,
      hilang: lastMatrix.hilang,
      luka: matrixOf(peakLukaRow).luka,
      menderita: matrixOf(peakMenderitaRow).menderita,
      mengungsi: matrixOf(peakMengungsiRow).mengungsi,
    },
    kerugian_rinci: rinci,
    kebutuhan_dana_juta: last.kebutuhan_dana_juta ?? null,
    kebutuhan_sdm: last.kebutuhan_sdm ?? null,
    kebutuhan_sapras: last.kebutuhan_sapras ?? null,
    kebutuhan_logistik: last.kebutuhan_logistik ?? null,
    kebutuhan_peralatan: last.kebutuhan_peralatan ?? null,
    aset_kedaruratan: last.aset_kedaruratan ?? null,
    kondisi_mutakhir: last.kondisi_mutakhir ?? null,
    upaya_penanganan: joinUnik(sorted.map((r) => r.upaya_penanganan)),
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
  kerugian_rinci?: unknown;
  kerugian_ekonomi_rp?: number | null;
  kerugian_sapras_rp?: number | null;
  kerugian_pelayanan_rp?: number | null;
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
  kerugian_rinci: KerugianRinci;
  kerugian_ekonomi_rp: number | null;
  kerugian_sapras_rp: number | null;
  kerugian_pelayanan_rp: number | null;
} {
  const matrix = normalizeKorbanTerpilah(input.korban_terpilah);
  const totals = totalsFromKorbanTerpilah(matrix);
  const matrixUsed = KATEGORI_KORBAN.some((k) => sumKorbanKategori(matrix, k) > 0);
  const rinci = normalizeKerugianRinci(input.kerugian_rinci);
  const kerugian = rollupKerugian(rinci);
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
    kerugian_rinci: rinci,
    kerugian_ekonomi_rp: kerugian.kerugian_ekonomi_rp || input.kerugian_ekonomi_rp || null,
    kerugian_sapras_rp: kerugian.kerugian_sapras_rp || input.kerugian_sapras_rp || null,
    kerugian_pelayanan_rp: kerugian.kerugian_pelayanan_rp || input.kerugian_pelayanan_rp || null,
  };
}
