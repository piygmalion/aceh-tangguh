export type KejadianLokasi = {
  lokasi?: string;
  desa?: string;
  kecamatan?: string;
  kabupaten?: string;
  kabupaten_kota?: string;
  provinsi?: string;
  teks_lengkap?: string;
  dusun?: string;
};

export type KejadianFoto = {
  url?: string;
  keterangan?: string;
};

export type KejadianArahPeta = {
  latitude?: number | null;
  longitude?: number | null;
  url_google_maps?: string;
  sumber_koordinat?: string;
  kabupaten_referensi?: string;
};

export type KejadianJumlahKorban = {
  luka_ringan?: number;
  luka_berat?: number;
  meninggal?: number;
  hilang?: number;
};

export type KejadianPenanganan = {
  langkah?: string;
  status_proses?: string;
};

export type KejadianRow = {
  id: string;
  lokasi: KejadianLokasi;
  hari_tanggal: string;
  jam?: string;
  penyebab?: string;
  jenis_bencana: string;
  kerusakan_dan_korban?: Record<string, unknown>;
  jumlah_korban?: KejadianJumlahKorban;
  kronologi?: string;
  kendala_kebutuhan_mendesak?: string;
  foto?: KejadianFoto;
  penanganan?: KejadianPenanganan;
  arah_di_peta?: KejadianArahPeta;
  sumber_data?: string[] | string;
  estimasi_kerugian_rp?: number | null;
  jiwa_terdampak?: number | null;
  kk_terdampak?: number | null;
  pengungsi?: number | null;
  lokasi_detail?: KejadianLokasi[];
};

export type KejadianFixture = {
  metadata: Record<string, unknown>;
  kejadian: KejadianRow[];
};

export type KejadianQuery = {
  q?: string;
  jenis?: string;
  kabupaten?: string;
  kecamatan?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type KejadianFacets = {
  jenis: string[];
  kabupaten: string[];
  kecamatan: string[];
  kecamatanByKabupaten: Record<string, string[]>;
  status: string[];
};

export type KejadianListResult = {
  items: KejadianRow[];
  total: number;
  page: number;
  pageSize: number;
  facets: KejadianFacets;
  meta: Record<string, unknown>;
  source?: "supabase" | "fixture";
};
