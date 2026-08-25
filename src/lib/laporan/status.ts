export type LaporanTipe = "kejadian" | "penanganan";

export const LAPORAN_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "needs_info",
  "archived",
] as const;

export type LaporanStatus = (typeof LAPORAN_STATUSES)[number];

export function isLaporanStatus(value: string): value is LaporanStatus {
  return (LAPORAN_STATUSES as readonly string[]).includes(value);
}

/** Anon PostgREST select list — never include jawaban_json / pelapor_id. */
export const KEJADIAN_PUBLIC_COLUMNS =
  "id, nomor_laporan, jenis_bencana, latitude, longitude, kabupaten_kota, kecamatan, desa, skor_urgensi, submitted_at";

export const PENANGANAN_PUBLIC_COLUMNS =
  "id, nomor_laporan, jenis_bencana, tipe_laporan, fase_penanganan, status_kebutuhan_sisa, tanggal_penanganan, deskripsi_penanganan, latitude, longitude, kabupaten_kota, kecamatan, desa, submitted_at";

export type PublicPetaKejadian = {
  id: string;
  nomor_laporan: string;
  jenis_bencana: string;
  latitude: number;
  longitude: number;
  kabupaten_kota: string;
  kecamatan: string | null;
  desa: string | null;
  skor_urgensi: number;
  submitted_at: string;
  laporan_tipe: "kejadian";
};

export type PublicPetaPenanganan = {
  id: string;
  nomor_laporan: string;
  jenis_bencana: string;
  tipe_laporan: string;
  fase_penanganan: string | null;
  status_kebutuhan_sisa: string | null;
  tanggal_penanganan: string;
  deskripsi_penanganan: string;
  latitude: number;
  longitude: number;
  kabupaten_kota: string;
  kecamatan: string | null;
  desa: string | null;
  submitted_at: string;
  laporan_tipe: "penanganan";
};
