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
