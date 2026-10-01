export type AnggaranBucket = {
  kegiatan: number;
  anggaran_rp: number;
};

export type AnggaranMetadata = {
  judul: string;
  tahun_anggaran: number;
  sumber: string;
  file_sumber?: string;
  terakhir_diperbarui?: string;
  total_kegiatan: number;
  total_item_anggaran: number;
  total_anggaran_rp: number;
  konteks_risiko: {
    irb_provinsi: number;
    kelas_risiko: string;
    kab_prioritas_tinggi: string[];
  };
};

export type PerbandinganYoY = {
  total_anggaran_2025_rp: number;
  total_anggaran_2026_rp: number;
  selisih_rp: number;
  persentase_perubahan: number;
  kegiatan_2025: number;
  kegiatan_2026: number;
  kegiatan_sama?: Array<{
    nama_kegiatan: string;
    anggaran_2025_rp: number;
    anggaran_2026_rp: number;
    selisih_rp: number;
    perubahan_pct: number;
  }>;
};

export type AnalisisAnggaran = {
  metadata: AnggaranMetadata;
  per_fase: Record<string, AnggaranBucket>;
  per_skpd: Record<string, AnggaranBucket>;
  per_kategori: Record<string, AnggaranBucket>;
  per_program?: Record<string, AnggaranBucket>;
  perbandingan_2025_2026: PerbandinganYoY;
  total_anggaran_rp: number;
  total_kegiatan: number;
  total_item_anggaran: number;
};

export type KegiatanAnggaran = {
  id: string;
  nama_kegiatan: string;
  fase_penanganan: string;
  kategori_kegiatan: string;
  program: string;
  kegiatan_apba: string;
  penanggung_jawab: string[];
  skpd: string[];
  kode_rekening: string[];
  uraian_anggaran: string[];
  jumlah_anggaran_rp: number;
  jumlah_item_anggaran: number;
  tahun_anggaran: number;
};

export type KegiatanFixture = {
  metadata: AnggaranMetadata;
  analisis?: {
    per_fase?: Record<string, AnggaranBucket>;
    per_skpd?: Record<string, AnggaranBucket>;
    per_kategori?: Record<string, AnggaranBucket>;
    per_program?: Record<string, AnggaranBucket>;
  };
  kegiatan: KegiatanAnggaran[];
};

export type AnggaranApiResponse = {
  analisis: AnalisisAnggaran;
  kegiatan: KegiatanAnggaran[];
  source: "supabase" | "fixture";
  /** Why the staff fixture was served instead of Supabase rows (fixture only). */
  fallbackReason?: "no-client" | "error" | "empty";
};

export type BreakdownView = "fase" | "skpd" | "kategori";
