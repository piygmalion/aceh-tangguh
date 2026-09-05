/**
 * Penilaian Ketangguhan Desa — Perka BNPB No. 1/2012
 * (SiAGA NTB Edisi 2, Bab XIII).
 *
 * 5 komponen, 32 indikator, 4 pertanyaan Ya/Tidak per indikator (128).
 * Bobot komponen: 30 / 25 / 25 / 10 / 10.
 */

export const PKD_LEVELS = ["pratama", "madya", "utama"] as const;
export type PkdLevel = (typeof PKD_LEVELS)[number] | "belum";

export type PkdIndikatorDef = {
  nomor: number;
  nama: string;
  bobotKepentingan: number;
  bobotKomponenPerIndikator: number;
};

export type PkdKomponenDef = {
  nomor: 1 | 2 | 3 | 4 | 5;
  nama: string;
  bobotKomponen: number;
  indikator: PkdIndikatorDef[];
};

export const PKD_KATALOG: readonly PkdKomponenDef[] = [
  {
    nomor: 1,
    nama: "Layanan dasar",
    bobotKomponen: 0.3,
    indikator: [
      { nomor: 1, nama: "Penyelenggaraan layanan pendidikan", bobotKepentingan: 0.09, bobotKomponenPerIndikator: 0.02 },
      { nomor: 2, nama: "Penyelenggaraan layanan kesehatan", bobotKepentingan: 0.09, bobotKomponenPerIndikator: 0.02 },
      { nomor: 3, nama: "Sarana dan prasarana transportasi", bobotKepentingan: 0.06, bobotKomponenPerIndikator: 0.02 },
      { nomor: 4, nama: "Penyediaan air bersih", bobotKepentingan: 0.09, bobotKomponenPerIndikator: 0.02 },
      { nomor: 5, nama: "Program dan kegiatan pangan & gizi", bobotKepentingan: 0.07, bobotKomponenPerIndikator: 0.02 },
      { nomor: 6, nama: "Pemberdayaan UMKM dan BUMDes", bobotKepentingan: 0.06, bobotKomponenPerIndikator: 0.02 },
      { nomor: 7, nama: "Sarana dan prasarana komunikasi/informasi", bobotKepentingan: 0.07, bobotKomponenPerIndikator: 0.02 },
      { nomor: 8, nama: "Pelayanan administrasi dan kependudukan", bobotKepentingan: 0.06, bobotKomponenPerIndikator: 0.02 },
      { nomor: 9, nama: "Perlindungan dan pengelolaan lingkungan hidup", bobotKepentingan: 0.08, bobotKomponenPerIndikator: 0.02 },
      { nomor: 10, nama: "Peraturan dan kegiatan keagamaan", bobotKepentingan: 0.06, bobotKomponenPerIndikator: 0.02 },
      { nomor: 11, nama: "Peraturan dan kegiatan kebudayaan", bobotKepentingan: 0.05, bobotKomponenPerIndikator: 0.02 },
      { nomor: 12, nama: "Perlindungan keamanan", bobotKepentingan: 0.07, bobotKomponenPerIndikator: 0.02 },
      { nomor: 13, nama: "Pemberdayaan perempuan dan perlindungan anak", bobotKepentingan: 0.08, bobotKomponenPerIndikator: 0.02 },
      { nomor: 14, nama: "Layanan khusus (difabel)", bobotKepentingan: 0.08, bobotKomponenPerIndikator: 0.02 },
    ],
  },
  {
    nomor: 2,
    nama: "Peraturan dan kebijakan penanggulangan bencana",
    bobotKomponen: 0.25,
    indikator: [
      { nomor: 15, nama: "Pengkajian risiko bencana", bobotKepentingan: 0.22, bobotKomponenPerIndikator: 0.05 },
      { nomor: 16, nama: "Rencana penanggulangan bencana", bobotKepentingan: 0.21, bobotKomponenPerIndikator: 0.05 },
      { nomor: 17, nama: "Pelatihan penanggulangan bencana", bobotKepentingan: 0.21, bobotKomponenPerIndikator: 0.05 },
      { nomor: 18, nama: "Kelembagaan penanggulangan bencana", bobotKepentingan: 0.2, bobotKomponenPerIndikator: 0.05 },
      { nomor: 19, nama: "Bantuan/kerja sama kegiatan PB", bobotKepentingan: 0.16, bobotKomponenPerIndikator: 0.05 },
    ],
  },
  {
    nomor: 3,
    nama: "Pencegahan dan mitigasi",
    bobotKomponen: 0.25,
    indikator: [
      { nomor: 20, nama: "Pencegahan bencana", bobotKepentingan: 0.33, bobotKomponenPerIndikator: 0.08 },
      { nomor: 21, nama: "Mitigasi bencana", bobotKepentingan: 0.33, bobotKomponenPerIndikator: 0.08 },
      { nomor: 22, nama: "Sosialisasi pengetahuan kebencanaan", bobotKepentingan: 0.33, bobotKomponenPerIndikator: 0.08 },
    ],
  },
  {
    nomor: 4,
    nama: "Kesiapsiagaan",
    bobotKomponen: 0.1,
    indikator: [
      { nomor: 23, nama: "Peringatan bahaya", bobotKepentingan: 0.17, bobotKomponenPerIndikator: 0.02 },
      { nomor: 24, nama: "Penyebarluasan peringatan bahaya", bobotKepentingan: 0.16, bobotKomponenPerIndikator: 0.02 },
      { nomor: 25, nama: "Rencana evakuasi", bobotKepentingan: 0.17, bobotKomponenPerIndikator: 0.02 },
      { nomor: 26, nama: "Jalur evakuasi", bobotKepentingan: 0.17, bobotKomponenPerIndikator: 0.02 },
      { nomor: 27, nama: "Tempat pengungsian", bobotKepentingan: 0.16, bobotKomponenPerIndikator: 0.02 },
      { nomor: 28, nama: "Uji kesiapsiagaan / simulasi", bobotKepentingan: 0.16, bobotKomponenPerIndikator: 0.02 },
    ],
  },
  {
    nomor: 5,
    nama: "Pemulihan",
    bobotKomponen: 0.1,
    indikator: [
      { nomor: 29, nama: "Penilaian pasca bencana secara mandiri", bobotKepentingan: 0.25, bobotKomponenPerIndikator: 0.03 },
      { nomor: 30, nama: "Pemulihan dini mandiri", bobotKepentingan: 0.25, bobotKomponenPerIndikator: 0.03 },
      { nomor: 31, nama: "Pengelolaan bantuan mandiri yang transparan", bobotKepentingan: 0.25, bobotKomponenPerIndikator: 0.03 },
      { nomor: 32, nama: "Membangun kembali dengan lebih baik", bobotKepentingan: 0.25, bobotKomponenPerIndikator: 0.03 },
    ],
  },
];

export const PKD_INDIKATOR_COUNT = 32;
export const PKD_PERTANYAAN_PER_INDIKATOR = 4;

/** Ya = 1, Tidak = 0. Nilai respon = jumlah Ya + 1 (rentang 1–5). */
export function nilaiRespon(yaCount: number): number {
  const clamped = Math.max(0, Math.min(PKD_PERTANYAAN_PER_INDIKATOR, yaCount));
  return clamped + 1;
}

export function destanaLevelFromIndex(indeks: number): Exclude<PkdLevel, "belum"> {
  if (indeks > 83.33) return "utama";
  if (indeks >= 68.33) return "madya";
  return "pratama";
}

export function destanaLevelLabel(level: PkdLevel): string {
  if (level === "utama") return "Tangguh Utama";
  if (level === "madya") return "Tangguh Madya";
  if (level === "pratama") return "Tangguh Pratama";
  return "Belum dinilai";
}

/**
 * Indeks ketangguhan 0–100.
 * Nilai indikator NI = nilaiRespon * bobotKepentingan.
 * Indeks komponen Ik ≈ rata-rata NI dinormalisasi; NK = Ik * bobot komponen.
 * Implementasi praktis: rata-rata tertimbang nilai respon (1–5) per komponen
 * dinormalisasi ke 0–100, lalu dijumlah menurut bobot komponen.
 */
export function hitungIndeksKetangguhan(
  yaPerIndikator: ReadonlyMap<number, number>
): { indeks: number; level: Exclude<PkdLevel, "belum">; perKomponen: number[] } {
  const perKomponen: number[] = [];
  let total = 0;
  for (const kom of PKD_KATALOG) {
    let sum = 0;
    let weight = 0;
    for (const ind of kom.indikator) {
      const ya = yaPerIndikator.get(ind.nomor) ?? 0;
      const respon = nilaiRespon(ya);
      const w = ind.bobotKepentingan || 1 / kom.indikator.length;
      sum += (respon / 5) * 100 * w;
      weight += w;
    }
    const ik = weight > 0 ? sum / weight : 0;
    perKomponen.push(ik);
    total += ik * kom.bobotKomponen;
  }
  const indeks = Math.round(total * 100) / 100;
  return { indeks, level: destanaLevelFromIndex(indeks), perKomponen };
}

export const PKD_REKOMENDASI_GENERIK: Record<0 | 1 | 2 | 3 | 4, string[]> = {
  0: [
    "Menghadirkan/mengadakan layanan dimaksud",
    "Memfungsikan layanan indikator dimaksud",
    "Memberikan dukungan penganggaran yang bersumber dari APBDes",
    "Membangun kemitraan untuk pengembangan program dimaksud",
    "Mempertahankan kualitas layanan dan memastikan keberlanjutan manfaat",
  ],
  1: [
    "Memfungsikan indikator dimaksud",
    "Memberikan dukungan penganggaran yang bersumber dari APBDes",
    "Membangun kemitraan untuk pengembangan program dimaksud",
    "Memperhatikan kualitas layanan dan memastikan keberlanjutan manfaat",
  ],
  2: [
    "Memberikan dukungan penganggaran yang bersumber dari APBDes",
    "Membangun kemitraan untuk pengembangan program dimaksud",
    "Mempertahankan kualitas layanan dan memastikan keberlanjutan manfaat",
  ],
  3: [
    "Membangun kemitraan untuk pengembangan program dimaksud",
    "Mempertahankan kualitas layanan dan memastikan keberlanjutan manfaat",
  ],
  4: ["Mempertahankan kualitas layanan dan memastikan keberlanjutan manfaat"],
};
