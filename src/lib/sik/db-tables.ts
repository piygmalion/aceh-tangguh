import type { Json } from "@/lib/supabase/json";

type Rel = [];

type Table<Row, Insert extends Record<string, unknown>, Update extends Record<string, unknown>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Rel;
};

export type KejadianOperasiRow = {
  id: string;
  nomor: string;
  kode_jenis: number | null;
  jenis_bencana: string;
  nama_kejadian: string;
  slug_nama: string | null;
  waktu_kejadian: string;
  penyebab: string | null;
  kronologi: string | null;
  deskripsi: string | null;
  cakupan: string | null;
  kabupaten: string | null;
  kode_kabupaten: string | null;
  kecamatan: string | null;
  desa_ringkas: string | null;
  latitude: number | null;
  longitude: number | null;
  cuaca: string | null;
  sumber_informasi: string | null;
  status_darurat: boolean;
  nomor_sk: string | null;
  sebaran_dampak: string | null;
  himbauan: string | null;
  personil_terlibat: string | null;
  is_bencana: boolean;
  status: string;
  laporan_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type KejadianLokasiRow = {
  id: string;
  kejadian_id: string;
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  kode_desa_kelurahan: string | null;
  alamat: string | null;
  deskripsi: string | null;
  latitude: number | null;
  longitude: number | null;
  foto_url: string | null;
  created_at: string;
  updated_at: string;
};

export type KejadianDampakRow = {
  id: string;
  kejadian_id: string;
  tanggal: string;
  meninggal: number;
  luka_berat: number;
  luka_ringan: number;
  hilang: number;
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
  catatan: string | null;
  created_by: string | null;
  created_at: string;
};

/** Staff CRUD rows: UUID is DB-generated, so Insert does not require `id`. */
export type LooseRow = {
  id: string;
  [key: string]: Json | undefined;
};

export type LooseInsert = {
  id?: string;
  [key: string]: Json | undefined;
};

type LooseTable = Table<LooseRow, LooseInsert, LooseInsert>;

export type SikTables = {
  jenis_bencana: Table<
    { kode: number; klasifikasi: string; nama: string; label_peta: string; sort_order: number; updated_at: string },
    { kode: number; klasifikasi: string; nama: string; label_peta: string; sort_order?: number; updated_at?: string },
    Partial<{ kode: number; klasifikasi: string; nama: string; label_peta: string; sort_order: number; updated_at: string }>
  >;
  nama_kejadian: Table<
    { slug: string; kode_jenis: number; nama: string; updated_at: string },
    { slug: string; kode_jenis: number; nama: string; updated_at?: string },
    Partial<{ slug: string; kode_jenis: number; nama: string; updated_at: string }>
  >;
  instansi: LooseTable;
  tempat_pengungsian: LooseTable;
  kejadian_operasi: Table<
    KejadianOperasiRow,
    Partial<KejadianOperasiRow> & { jenis_bencana: string; nama_kejadian: string; waktu_kejadian: string },
    Partial<KejadianOperasiRow>
  >;
  kejadian_lokasi: Table<
    KejadianLokasiRow,
    Partial<KejadianLokasiRow> & { kejadian_id: string },
    Partial<KejadianLokasiRow>
  >;
  kejadian_dampak: Table<
    KejadianDampakRow,
    Partial<KejadianDampakRow> & { kejadian_id: string },
    Partial<KejadianDampakRow>
  >;
  kejadian_korban: LooseTable;
  pengungsi_terpilah: LooseTable;
  kerusakan_aset: LooseTable;
  personil: LooseTable;
  peralatan: LooseTable;
  kebutuhan_dasar: LooseTable;
  distribusi_personil: LooseTable;
  distribusi_peralatan: LooseTable;
  distribusi_kebutuhan: LooseTable;
  pkd_komponen: LooseTable;
  pkd_indikator: LooseTable;
  pkd_pertanyaan: LooseTable;
  pkd_tahun: LooseTable;
  pkd_tugas: LooseTable;
  pkd_jawaban: LooseTable;
  rehab_kebutuhan: LooseTable;
  rehab_monitoring: LooseTable;
  rehab_penerima: LooseTable;
  nomor_penting: LooseTable;
  pelatihan: LooseTable;
  permintaan_pelatihan: LooseTable;
  mitra_halaman: Table<
    { slug: string; judul: string; isi_markdown: string; updated_at: string },
    { slug: string; judul: string; isi_markdown?: string; updated_at?: string },
    Partial<{ slug: string; judul: string; isi_markdown: string; updated_at: string }>
  >;
  disabilitas_agregat: LooseTable;
};
