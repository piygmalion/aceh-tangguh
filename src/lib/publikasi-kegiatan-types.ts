export const KEGIATAN_SLIDESHOW_LIMIT = 15;
export const KEGIATAN_INTERVAL_DETIK = 10;
export const KEGIATAN_SUMBER_URL = "https://bpba.acehprov.go.id";

export type PublikasiKegiatanPhoto = {
  urutan: number;
  peran: string;
  url: string;
  url_thumbnail?: string;
};

export type PublikasiKegiatanItem = {
  id: string;
  slug: string;
  judul: string;
  ringkasan: string;
  tanggal_publikasi: string;
  penulis: string;
  kategori: string;
  jenis_kegiatan: string;
  jenis_bencana: string | null;
  fase: string | null;
  lokasi_teks: string;
  url: string;
  foto_sampul_url: string | null;
  foto_sampul_thumbnail_url: string | null;
  jumlah_foto: number;
  kabupaten: string[];
  photos: PublikasiKegiatanPhoto[];
  sumber: string;
};

export type PublikasiKegiatanMetadata = {
  judul: string;
  sumber: string;
  total: number;
  ditampilkan: number;
  interval_detik: number;
};

export type PublikasiKegiatanFixture = {
  metadata: PublikasiKegiatanMetadata;
  kegiatan: PublikasiKegiatanItem[];
  slideshow: PublikasiKegiatanItem[];
};

export type PublikasiKegiatanListResponse = {
  metadata: PublikasiKegiatanMetadata;
  kegiatan: PublikasiKegiatanItem[];
  total: number;
  source: "supabase" | "fixture";
};
