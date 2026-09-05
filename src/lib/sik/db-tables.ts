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
  kode_kecamatan: string | null;
  kode_desa_kelurahan: string | null;
  kode_kabupaten_kib: string | null;
  kib_sumber: string;
  kib_catatan: string | null;
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
  kib: string | null;
  tarikh: string | null;
  kode_provinsi: string;
  kib_index: number | null;
  kondisi_mutakhir: string | null;
  upaya_penanganan: string | null;
  permintaan_bantuan_nasional: boolean;
  fase_data: string;
  rekap_statis: Json | null;
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
  kode_kecamatan: string | null;
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
  kerugian_rinci: Json;
  catatan: string | null;
  korban_terpilah: Json;
  kondisi_mutakhir: string | null;
  upaya_penanganan: string | null;
  dokumentasi_url: string | null;
  kebutuhan_dana_juta: number | null;
  kebutuhan_sdm: string | null;
  kebutuhan_sapras: string | null;
  kebutuhan_logistik: string | null;
  kebutuhan_peralatan: string | null;
  aset_kedaruratan: string | null;
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
  sawah_ha: number | null;
  kebun_ha: number | null;
  hutan_ha: number | null;
  kolam_ha: number | null;
  toko_rb: number;
  toko_rs: number;
  toko_rr: number;
  toko_terendam: number;
  pabrik_rb: number;
  pabrik_rs: number;
  pabrik_rr: number;
  pabrik_terendam: number;
  air_jaringan: string | null;
  listrik_jaringan: string | null;
  telekom_jaringan: string | null;
  irigasi_jaringan: string | null;
  jalan_km: number | null;
  jembatan_rb: number;
  jembatan_rs: number;
  jembatan_rr: number;
  jembatan_terendam: number;
  transportasi_jaringan: string | null;
  spbu_jaringan: string | null;
  created_by: string | null;
  created_at: string;
};

export type PengungsianKajiRow = {
  id: string;
  kejadian_id: string;
  tempat_pengungsian_id: string;
  tanggal: string;
  jumlah_kk: number;
  jiwa: Json;
  rentan: Json;
  air_sanitasi: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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


export type OverlayCalonSource = "bmkg" | "magma" | "sipongi" | "tatonas";
export type OverlayCalonStatus = "draf" | "ditolak" | "diterima";
export type OverlayCalonTautan = "utuh" | "putus";
export type OverlayCalonAsal = "otomatis" | "manual";

export type OverlayCalonKejadianRow = {
  id: string;
  source: OverlayCalonSource;
  layer_key: string;
  external_id: string;
  overlay_feature_id: string | null;
  status: OverlayCalonStatus;
  tautan_status: OverlayCalonTautan;
  kejadian_id: string | null;
  nama_sinyal: string;
  waktu_sinyal: string | null;
  kabupaten: string | null;
  kode_kabupaten: string | null;
  latitude: number;
  longitude: number;
  usulan_kode_jenis: number | null;
  usulan_jenis_bencana: string | null;
  sumber_label: string;
  penyebab_ringkas: string | null;
  properties_snapshot: Json;
  asal_buat: OverlayCalonAsal;
  created_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  ditolak_alasan: string | null;
  created_at: string;
  updated_at: string;
};

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
  pengungsian_kaji: Table<
    PengungsianKajiRow,
    Partial<PengungsianKajiRow> & { kejadian_id: string; tempat_pengungsian_id: string },
    Partial<PengungsianKajiRow>
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
  overlay_calon_kejadian: Table<
    OverlayCalonKejadianRow,
    Partial<OverlayCalonKejadianRow> & {
      source: OverlayCalonSource;
      layer_key: string;
      external_id: string;
      nama_sinyal: string;
      latitude: number;
      longitude: number;
      sumber_label: string;
      asal_buat: OverlayCalonAsal;
    },
    Partial<OverlayCalonKejadianRow>
  >;
  disabilitas_agregat: LooseTable;
};
