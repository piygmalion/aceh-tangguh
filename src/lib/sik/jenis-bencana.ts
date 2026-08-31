/**
 * Katalog jenis & nama kejadian — Juklak Standar Data Kejadian dan Dampak
 * Bencana BNPB No. 7 Tahun 2023 (SiAGA NTB Edisi 2, Bab 9.3).
 *
 * Dipakai wizard SIK. Label peta lama (`DISASTER_JENIS`) tetap; mapping
 * `toDisasterJenisLabel` menjembatani keduanya.
 */

export type KlasifikasiBencana = "alam" | "non_alam" | "sosial";

export type JenisBencanaKode = 101 | 102 | 103 | 104 | 105 | 106 | 107 | 108 | 109 | 201 | 202 | 203 | 301;

export type NamaKejadianEntry = {
  nama: string;
  slug: string;
};

export type JenisBencanaEntry = {
  kode: JenisBencanaKode;
  klasifikasi: KlasifikasiBencana;
  jenis: string;
  /** Label yang sudah dipakai layer peta / DIBI jika ada. */
  labelPeta: string;
  namaKejadian: NamaKejadianEntry[];
};

export const JENIS_BENCANA_JUKLAK: readonly JenisBencanaEntry[] = [
  {
    kode: 101,
    klasifikasi: "alam",
    jenis: "Banjir",
    labelPeta: "Banjir",
    namaKejadian: [
      { nama: "Banjir rob", slug: "banjir-rob" },
      { nama: "Banjir bandang", slug: "banjir-bandang" },
      { nama: "Banjir dan tanah longsor", slug: "banjir-dan-tanah-longsor" },
      { nama: "Banjir drainase & selokan", slug: "banjir-drainase" },
      { nama: "Banjir waduk", slug: "banjir-waduk" },
      { nama: "Banjir genangan", slug: "banjir-genangan" },
      { nama: "Tanggul jebol", slug: "tanggul-jebol" },
    ],
  },
  {
    kode: 102,
    klasifikasi: "alam",
    jenis: "Tanah longsor",
    labelPeta: "Longsor",
    namaKejadian: [
      { nama: "Longsor", slug: "longsor" },
      { nama: "Gerakan tanah", slug: "gerakan-tanah" },
    ],
  },
  {
    kode: 103,
    klasifikasi: "alam",
    jenis: "Gelombang pasang dan abrasi",
    labelPeta: "Abrasi",
    namaKejadian: [
      { nama: "Gelombang pasang", slug: "gelombang-pasang" },
      { nama: "Abrasi pantai", slug: "abrasi-pantai" },
    ],
  },
  {
    kode: 104,
    klasifikasi: "alam",
    jenis: "Cuaca ekstrem",
    labelPeta: "Angin Puting Beliung",
    namaKejadian: [
      { nama: "Puting beliung", slug: "puting-beliung" },
      { nama: "Angin kencang", slug: "angin-kencang" },
      { nama: "Angin topan", slug: "angin-topan" },
      { nama: "Hujan es", slug: "hujan-es" },
      { nama: "Siklon tropis", slug: "siklon-tropis" },
      { nama: "Suhu udara ekstrem", slug: "suhu-udara-ekstrem" },
    ],
  },
  {
    kode: 105,
    klasifikasi: "alam",
    jenis: "Kekeringan",
    labelPeta: "Kekeringan",
    namaKejadian: [
      { nama: "Kekeringan meteorologis", slug: "kekeringan-meteorologis" },
      { nama: "Kekeringan hidrologis", slug: "kekeringan-hidrologis" },
      { nama: "Kekeringan pertanian", slug: "kekeringan-pertanian" },
    ],
  },
  {
    kode: 106,
    klasifikasi: "alam",
    jenis: "Kebakaran hutan dan lahan",
    labelPeta: "Kebakaran Hutan dan Lahan",
    namaKejadian: [
      { nama: "Kebakaran hutan", slug: "kebakaran-hutan" },
      { nama: "Kebakaran lahan", slug: "kebakaran-lahan" },
      { nama: "Kebakaran lahan gambut", slug: "kebakaran-lahan-gambut" },
    ],
  },
  {
    kode: 107,
    klasifikasi: "alam",
    jenis: "Gempa bumi",
    labelPeta: "Gempa Bumi",
    namaKejadian: [
      { nama: "Gempa tektonik", slug: "gempa-tektonik" },
      { nama: "Gempa vulkanik", slug: "gempa-vulkanik" },
      { nama: "Gempa bumi runtuhan", slug: "gempa-runtuhan" },
    ],
  },
  {
    kode: 108,
    klasifikasi: "alam",
    jenis: "Tsunami",
    labelPeta: "Lainnya",
    namaKejadian: [
      { nama: "Tsunami seismogenik", slug: "tsunami-seismogenik" },
      { nama: "Tsunami nonseismik", slug: "tsunami-nonseismik" },
      { nama: "Tsunami lokal", slug: "tsunami-lokal" },
      { nama: "Tsunami regional", slug: "tsunami-regional" },
      { nama: "Tsunami jarak", slug: "tsunami-jarak" },
      { nama: "Tsunami meteorologi", slug: "tsunami-meteorologi" },
      { nama: "Mikrotsunami", slug: "mikrotsunami" },
    ],
  },
  {
    kode: 109,
    klasifikasi: "alam",
    jenis: "Erupsi gunung api",
    labelPeta: "Lainnya",
    namaKejadian: [
      { nama: "Awan panas guguran", slug: "awan-panas-guguran" },
      { nama: "Awan panas", slug: "awan-panas" },
      { nama: "Banjir lahar", slug: "banjir-lahar" },
      { nama: "Hujan abu vulkanik", slug: "hujan-abu-vulkanik" },
      { nama: "Gas vulkanik beracun", slug: "gas-vulkanik" },
    ],
  },
  {
    kode: 201,
    klasifikasi: "non_alam",
    jenis: "Epidemi dan wabah penyakit",
    labelPeta: "Lainnya",
    namaKejadian: [
      { nama: "Wabah penyakit", slug: "wabah-penyakit" },
      { nama: "Epidemi", slug: "epidemi" },
    ],
  },
  {
    kode: 202,
    klasifikasi: "non_alam",
    jenis: "Kebakaran gedung dan permukiman",
    labelPeta: "Kebakaran Pemukiman",
    namaKejadian: [
      { nama: "Kebakaran gedung dan permukiman", slug: "kebakaran-gedung-permukiman" },
    ],
  },
  {
    kode: 203,
    klasifikasi: "non_alam",
    jenis: "Gagal teknologi",
    labelPeta: "Lainnya",
    namaKejadian: [
      { nama: "Kegagalan industri", slug: "kegagalan-industri" },
      { nama: "Kecelakaan industri", slug: "kecelakaan-industri" },
    ],
  },
  {
    kode: 301,
    klasifikasi: "sosial",
    jenis: "Konflik sosial",
    labelPeta: "Lainnya",
    namaKejadian: [
      { nama: "Konflik sosial", slug: "konflik-sosial" },
      { nama: "Teror", slug: "teror" },
      { nama: "Kerusuhan sosial", slug: "kerusuhan-sosial" },
    ],
  },
] as const;

const SLUG_TO_ENTRY = new Map<string, { jenis: JenisBencanaEntry; nama: NamaKejadianEntry }>();
for (const jenis of JENIS_BENCANA_JUKLAK) {
  for (const nama of jenis.namaKejadian) {
    SLUG_TO_ENTRY.set(nama.slug, { jenis, nama });
  }
}

export function findJenisByKode(kode: number): JenisBencanaEntry | undefined {
  return JENIS_BENCANA_JUKLAK.find((j) => j.kode === kode);
}

export function findNamaBySlug(slug: string): {
  jenis: JenisBencanaEntry;
  nama: NamaKejadianEntry;
} | undefined {
  return SLUG_TO_ENTRY.get(slug);
}

/** Map SIK jenis/nama to the existing map-legend `DISASTER_JENIS` string. */
export function toDisasterJenisLabel(input: {
  kodeJenis?: number | null;
  jenis?: string | null;
  namaKejadian?: string | null;
}): string {
  if (input.kodeJenis != null) {
    const found = findJenisByKode(input.kodeJenis);
    if (found) {
      if (found.kode === 101 && /bandang/i.test(input.namaKejadian ?? "")) {
        return "Banjir Bandang";
      }
      if (found.kode === 101 && /longsor/i.test(input.namaKejadian ?? "")) {
        return "Banjir Bandang dan Tanah Longsor";
      }
      return found.labelPeta;
    }
  }
  const jenis = (input.jenis ?? "").toLowerCase();
  if (jenis.includes("banjir")) return "Banjir";
  if (jenis.includes("longsor")) return "Longsor";
  if (jenis.includes("abrasi") || jenis.includes("gelombang")) return "Abrasi";
  if (jenis.includes("puting") || jenis.includes("cuaca")) return "Angin Puting Beliung";
  if (jenis.includes("kering")) return "Kekeringan";
  if (jenis.includes("hutan")) return "Kebakaran Hutan dan Lahan";
  if (jenis.includes("gempa")) return "Gempa Bumi";
  if (jenis.includes("permukiman") || jenis.includes("pemukiman") || jenis.includes("gedung")) {
    return "Kebakaran Pemukiman";
  }
  if (jenis.includes("bakar")) return "Kebakaran";
  return "Lainnya";
}

export function klasifikasiLabel(k: KlasifikasiBencana): string {
  if (k === "alam") return "Bencana alam";
  if (k === "non_alam") return "Bencana non-alam";
  return "Bencana sosial";
}
