export const DIBI_DASHBOARD_URL =
  "https://dibi.bnpb.go.id/superset/dashboard/2/";

export const DIBI_PROVINSI = "Aceh";

export const DIBI_KATEGORI_BENCANA = [
  "Banjir",
  "Longsor",
  "Cuaca ekstrem",
  "Gelombang pasang / Abrasi",
  "Erupsi gunung api",
  "Gempabumi",
  "Kekeringan",
  "Kebakaran hutan dan lahan",
  "Tsunami",
] as const;

export type DibiSource = "dibi" | "fixture";

export type DibiMetrics = {
  kejadian: number;
  meninggal: number;
  hilang: number;
  luka_sakit: number;
  menderita_mengungsi: number;
  rumah_rusak_berat: number;
  rumah_rusak_sedang: number;
  rumah_rusak_ringan: number;
  rumah_terendam: number;
  estimasi_kerugian_rumah: number;
};

export type DibiKategoriRow = DibiMetrics & {
  kategori_bencana: string;
};

export type DibiKabupatenRow = DibiMetrics & {
  kabupaten: string;
};

export type DibiTahunRow = DibiMetrics & {
  tahun: number;
};

export type DibiAcehPayload = {
  metadata: {
    judul: string;
    provinsi: string;
    source_name: string;
    source_url: string;
    dashboard_id: number;
    dataset: string;
    year_from: number;
    year_to: number;
    fetched_at: string;
    filters: {
      provinsi: string[];
      is_bencana: boolean[];
      kategori_bencana: string[];
    };
  };
  totals: DibiMetrics;
  by_kategori: DibiKategoriRow[];
  by_kabupaten: DibiKabupatenRow[];
  by_tahun: DibiTahunRow[];
};

export type DibiAcehResponse = DibiAcehPayload & {
  source: DibiSource;
};

export const EMPTY_DIBI_METRICS: DibiMetrics = {
  kejadian: 0,
  meninggal: 0,
  hilang: 0,
  luka_sakit: 0,
  menderita_mengungsi: 0,
  rumah_rusak_berat: 0,
  rumah_rusak_sedang: 0,
  rumah_rusak_ringan: 0,
  rumah_terendam: 0,
  estimasi_kerugian_rumah: 0,
};

export function rumahRusakTotal(m: DibiMetrics): number {
  return m.rumah_rusak_berat + m.rumah_rusak_sedang + m.rumah_rusak_ringan;
}

export function jiwaTerdampak(m: DibiMetrics): number {
  return m.menderita_mengungsi + m.luka_sakit;
}

export function meninggalHilang(m: DibiMetrics): number {
  return m.meninggal + m.hilang;
}
