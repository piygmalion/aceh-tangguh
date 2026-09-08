import type { Database } from "@/lib/supabase/types";

export type AdminTableKey =
  | "reports"
  | "laporan_kejadian"
  | "laporan_penanganan"
  | "kejadian_bencana"
  | "publikasi"
  | "publikasi_kegiatan"
  | "marker_features"
  | "anggaran_kegiatan"
  | "profil_desa"
  | "map_layers"
  | "krb_jenis_bahaya"
  | "krb_kabupaten"
  | "krb_wilayah"
  | "krb_kawasan"
  | "krb_dokumen";

export type ColumnType = "text" | "number" | "boolean" | "select" | "json" | "datetime";

export type AdminColumn = {
  key: string;
  label: string;
  type: ColumnType;
  editable: boolean;
  options?: string[];
};

export type AdminTableConfig = {
  key: AdminTableKey;
  label: string;
  pk: string;
  defaultSort: { column: string; ascending: boolean };
  searchable: string[];
  columns: AdminColumn[];
  allowInsert: boolean;
  allowDelete: boolean;
  note?: string;
};

export const ADMIN_TABLE_KEYS: AdminTableKey[] = [
  "reports",
  "laporan_kejadian",
  "laporan_penanganan",
  "kejadian_bencana",
  "publikasi",
  "publikasi_kegiatan",
  "marker_features",
  "anggaran_kegiatan",
  "profil_desa",
  "map_layers",
  "krb_jenis_bahaya",
  "krb_kabupaten",
  "krb_wilayah",
  "krb_kawasan",
  "krb_dokumen",
];

const LAPORAN_STATUS_OPTIONS = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "needs_info",
  "archived",
];

export const ADMIN_TABLES: Record<AdminTableKey, AdminTableConfig> = {
  reports: {
    key: "reports",
    label: "Laporan warga (legacy reports)",
    note: "Alur lama. Titik Partisipasi di peta memakai laporan_kejadian / laporan_penanganan.",
    pk: "id",
    defaultSort: { column: "created_at", ascending: false },
    searchable: ["description", "place_name", "topic"],
    allowInsert: false,
    allowDelete: false,
    columns: [
      { key: "id", label: "ID", type: "text", editable: false },
      {
        key: "status",
        label: "Status",
        type: "select",
        editable: true,
        options: ["queued", "published", "rejected"],
      },
      {
        key: "topic",
        label: "Topik",
        type: "select",
        editable: true,
        options: [
          "banjir",
          "longsor",
          "hunian",
          "perlindungan",
          "logistik",
          "kesehatan",
          "lainnya",
        ],
      },
      { key: "description", label: "Deskripsi", type: "text", editable: true },
      { key: "place_name", label: "Lokasi", type: "text", editable: true },
      { key: "longitude", label: "Longitude", type: "number", editable: true },
      { key: "latitude", label: "Latitude", type: "number", editable: true },
      {
        key: "consent_map_display",
        label: "Consent peta",
        type: "boolean",
        editable: false,
      },
      { key: "created_at", label: "Dibuat", type: "datetime", editable: false },
    ],
  },
  laporan_kejadian: {
    key: "laporan_kejadian",
    label: "Laporan kejadian",
    pk: "id",
    defaultSort: { column: "submitted_at", ascending: false },
    searchable: ["nomor_laporan", "jenis_bencana", "kabupaten_kota", "status"],
    allowInsert: false,
    allowDelete: false,
    note: "Set status=approved dan tampil_di_peta=true agar titik muncul di layer laporanKejadian.",
    columns: [
      { key: "id", label: "ID", type: "text", editable: false },
      { key: "nomor_laporan", label: "Nomor", type: "text", editable: false },
      { key: "jenis_bencana", label: "Jenis", type: "text", editable: false },
      {
        key: "status",
        label: "Status",
        type: "select",
        editable: true,
        options: LAPORAN_STATUS_OPTIONS,
      },
      { key: "tampil_di_peta", label: "Tampil di peta", type: "boolean", editable: true },
      { key: "latitude", label: "Latitude", type: "number", editable: false },
      { key: "longitude", label: "Longitude", type: "number", editable: false },
      { key: "kabupaten_kota", label: "Kabupaten", type: "text", editable: false },
      { key: "skor_urgensi", label: "Urgensi", type: "number", editable: false },
      { key: "submitted_at", label: "Dikirim", type: "datetime", editable: false },
    ],
  },
  laporan_penanganan: {
    key: "laporan_penanganan",
    label: "Laporan penanganan",
    pk: "id",
    defaultSort: { column: "submitted_at", ascending: false },
    searchable: ["nomor_laporan", "jenis_bencana", "kabupaten_kota", "status"],
    allowInsert: false,
    allowDelete: false,
    note: "Set status=approved dan tampil_di_peta=true agar titik muncul di layer laporanPenanganan.",
    columns: [
      { key: "id", label: "ID", type: "text", editable: false },
      { key: "nomor_laporan", label: "Nomor", type: "text", editable: false },
      { key: "jenis_bencana", label: "Jenis", type: "text", editable: false },
      { key: "tipe_laporan", label: "Tipe", type: "text", editable: false },
      {
        key: "status",
        label: "Status",
        type: "select",
        editable: true,
        options: LAPORAN_STATUS_OPTIONS,
      },
      { key: "tampil_di_peta", label: "Tampil di peta", type: "boolean", editable: true },
      { key: "latitude", label: "Latitude", type: "number", editable: false },
      { key: "longitude", label: "Longitude", type: "number", editable: false },
      { key: "kabupaten_kota", label: "Kabupaten", type: "text", editable: false },
      { key: "tanggal_penanganan", label: "Tanggal", type: "text", editable: false },
      { key: "submitted_at", label: "Dikirim", type: "datetime", editable: false },
    ],
  },
  kejadian_bencana: {
    key: "kejadian_bencana",
    label: "Kejadian bencana",
    pk: "id",
    defaultSort: { column: "hari_tanggal", ascending: false },
    searchable: ["id", "jenis_bencana", "kabupaten", "kecamatan", "desa"],
    allowInsert: true,
    allowDelete: false,
    columns: [
      { key: "id", label: "ID", type: "text", editable: false },
      { key: "jenis_bencana", label: "Jenis", type: "text", editable: true },
      { key: "hari_tanggal", label: "Tanggal", type: "text", editable: true },
      { key: "kabupaten", label: "Kabupaten", type: "text", editable: true },
      { key: "kecamatan", label: "Kecamatan", type: "text", editable: true },
      { key: "desa", label: "Desa", type: "text", editable: true },
      { key: "longitude", label: "Longitude", type: "number", editable: true },
      { key: "latitude", label: "Latitude", type: "number", editable: true },
      { key: "payload", label: "Payload", type: "json", editable: true },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
  publikasi: {
    key: "publikasi",
    label: "Publikasi Analisis",
    pk: "slug",
    defaultSort: { column: "published_at", ascending: false },
    searchable: ["slug", "title", "description"],
    allowInsert: true,
    allowDelete: false,
    note: "9 artikel Tanggapi BTT. Kegiatan BPBA ada di Publikasi Kegiatan.",
    columns: [
      { key: "slug", label: "Slug", type: "text", editable: false },
      { key: "title", label: "Judul", type: "text", editable: true },
      { key: "description", label: "Deskripsi", type: "text", editable: true },
      { key: "published_at", label: "Terbit", type: "datetime", editable: true },
      { key: "tags", label: "Tag", type: "json", editable: true },
      { key: "payload", label: "Payload", type: "json", editable: true },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
  publikasi_kegiatan: {
    key: "publikasi_kegiatan",
    label: "Publikasi Kegiatan",
    pk: "id",
    defaultSort: { column: "tanggal_publikasi", ascending: false },
    searchable: [
      "id",
      "judul",
      "ringkasan",
      "lokasi_teks",
      "penulis",
      "jenis_kegiatan",
      "jenis_bencana",
    ],
    allowInsert: false,
    allowDelete: false,
    note: "186 berita kegiatan BPBA. Halaman publik hanya menampilkan 15 terbaru.",
    columns: [
      { key: "id", label: "ID", type: "text", editable: false },
      { key: "slug", label: "Slug", type: "text", editable: false },
      { key: "judul", label: "Judul", type: "text", editable: true },
      { key: "ringkasan", label: "Ringkasan", type: "text", editable: true },
      { key: "tanggal_publikasi", label: "Terbit", type: "datetime", editable: false },
      { key: "penulis", label: "Penulis", type: "text", editable: true },
      { key: "kategori", label: "Kategori", type: "text", editable: false },
      { key: "jenis_kegiatan", label: "Jenis kegiatan", type: "text", editable: false },
      { key: "jenis_bencana", label: "Jenis bencana", type: "text", editable: false },
      { key: "fase", label: "Fase", type: "text", editable: false },
      { key: "lokasi_teks", label: "Lokasi", type: "text", editable: true },
      { key: "url", label: "URL", type: "text", editable: true },
      { key: "foto_sampul_url", label: "Foto sampul", type: "text", editable: true },
      {
        key: "foto_sampul_thumbnail_url",
        label: "Thumbnail",
        type: "text",
        editable: true,
      },
      { key: "jumlah_foto", label: "Jumlah foto", type: "number", editable: false },
      { key: "kabupaten", label: "Kabupaten", type: "json", editable: false },
      { key: "photos", label: "Foto", type: "json", editable: false },
      { key: "sumber", label: "Sumber", type: "text", editable: false },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
  marker_features: {
    key: "marker_features",
    label: "Marker features",
    pk: "id",
    defaultSort: { column: "updated_at", ascending: false },
    searchable: ["id", "layer", "title", "status", "kabupaten"],
    allowInsert: false,
    allowDelete: false,
    note: "Ringkasan titik peta — properties JSON dapat diedit terbatas.",
    columns: [
      { key: "id", label: "ID", type: "text", editable: false },
      { key: "layer", label: "Layer", type: "text", editable: true },
      { key: "title", label: "Judul", type: "text", editable: true },
      { key: "status", label: "Status", type: "text", editable: true },
      { key: "kabupaten", label: "Kabupaten", type: "text", editable: true },
      { key: "longitude", label: "Longitude", type: "number", editable: true },
      { key: "latitude", label: "Latitude", type: "number", editable: true },
      { key: "properties", label: "Properties", type: "json", editable: true },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
  anggaran_kegiatan: {
    key: "anggaran_kegiatan",
    label: "Anggaran kegiatan",
    pk: "id",
    defaultSort: { column: "tahun", ascending: false },
    searchable: ["id", "nama", "skpd", "fase", "kategori"],
    allowInsert: false,
    allowDelete: false,
    columns: [
      { key: "id", label: "ID", type: "text", editable: false },
      { key: "tahun", label: "Tahun", type: "number", editable: true },
      { key: "nama", label: "Nama", type: "text", editable: true },
      { key: "skpd", label: "SKPD", type: "text", editable: true },
      { key: "fase", label: "Fase", type: "text", editable: true },
      { key: "kategori", label: "Kategori", type: "text", editable: true },
      { key: "total_rp", label: "Total (Rp)", type: "number", editable: true },
      { key: "payload", label: "Payload", type: "json", editable: true },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
  profil_desa: {
    key: "profil_desa",
    label: "Profil desa",
    pk: "id",
    defaultSort: { column: "kabupaten", ascending: true },
    searchable: ["id", "nama", "kabupaten", "kecamatan", "kode_desa_kelurahan"],
    allowInsert: false,
    allowDelete: false,
    note: "Edit terbatas pada kolom agregat; payload tidak dibuka di sini.",
    columns: [
      { key: "id", label: "ID", type: "text", editable: false },
      { key: "nama", label: "Nama", type: "text", editable: true },
      { key: "kabupaten", label: "Kabupaten", type: "text", editable: false },
      { key: "kecamatan", label: "Kecamatan", type: "text", editable: false },
      { key: "kode_desa_kelurahan", label: "Kode desa", type: "text", editable: false },
      { key: "kondisi_kode", label: "Kondisi", type: "text", editable: true },
      { key: "kk", label: "KK", type: "number", editable: true },
      { key: "populasi", label: "Populasi", type: "number", editable: true },
      { key: "kk_laki_laki", label: "KK laki-laki", type: "number", editable: true },
      { key: "kk_perempuan", label: "KK perempuan", type: "number", editable: true },
      { key: "bayi_0_1", label: "Bayi 0–1", type: "number", editable: true },
      { key: "balita_1_4", label: "Balita 1–4", type: "number", editable: true },
      { key: "anak_5_12", label: "Anak 5–12", type: "number", editable: true },
      { key: "remaja_13_17", label: "Remaja 13–17", type: "number", editable: true },
      { key: "dewasa_18_59", label: "Dewasa 18–59", type: "number", editable: true },
      { key: "lansia_60_plus", label: "Lansia >60", type: "number", editable: true },
      {
        key: "penyandang_disabilitas",
        label: "Disabilitas",
        type: "number",
        editable: true,
      },
      { key: "kk_terdampak", label: "KK terdampak", type: "number", editable: true },
      {
        key: "populasi_terdampak",
        label: "Populasi terdampak",
        type: "number",
        editable: true,
      },
      { key: "korban_meninggal", label: "Meninggal", type: "number", editable: true },
      { key: "korban_hilang", label: "Hilang", type: "number", editable: true },
      { key: "rumah_rr", label: "RR", type: "number", editable: true },
      { key: "rumah_rs", label: "RS", type: "number", editable: true },
      { key: "rumah_rb", label: "RB", type: "number", editable: true },
      {
        key: "total_rumah_rusak",
        label: "Total rusak",
        type: "number",
        editable: true,
      },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
  map_layers: {
    key: "map_layers",
    label: "Map layers",
    pk: "key",
    defaultSort: { column: "sort_order", ascending: true },
    searchable: ["key", "title_id", "title_en"],
    allowInsert: false,
    allowDelete: false,
    note: "Registry layer peta (termasuk infraRoadBridge / Jembatan). Hanya judul, enabled, dan urutan yang bisa diubah.",
    columns: [
      { key: "key", label: "Key", type: "text", editable: false },
      { key: "title_id", label: "Judul (ID)", type: "text", editable: true },
      { key: "title_en", label: "Judul (EN)", type: "text", editable: true },
      { key: "enabled", label: "Enabled", type: "boolean", editable: true },
      { key: "sort_order", label: "Urutan", type: "number", editable: true },
      { key: "kind", label: "Jenis", type: "text", editable: false },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
  krb_jenis_bahaya: {
    key: "krb_jenis_bahaya",
    label: "KRB jenis bahaya",
    pk: "kode",
    defaultSort: { column: "kode", ascending: true },
    searchable: ["kode", "label_id", "label_en", "kategori"],
    allowInsert: false,
    allowDelete: false,
    note: "Katalog 11 ancaman IRBI. Baca saja.",
    columns: [
      { key: "kode", label: "Kode", type: "text", editable: false },
      { key: "label_id", label: "Label ID", type: "text", editable: false },
      { key: "label_en", label: "Label EN", type: "text", editable: false },
      { key: "kategori", label: "Kategori", type: "text", editable: false },
      { key: "sumber_otoritatif", label: "Sumber", type: "text", editable: false },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
  krb_kabupaten: {
    key: "krb_kabupaten",
    label: "KRB kabupaten",
    pk: "kode_kabupaten",
    defaultSort: { column: "irb_2025", ascending: false },
    searchable: ["kode_kabupaten", "kabupaten", "ancaman_tertinggi"],
    allowInsert: false,
    allowDelete: false,
    note: "Skor IRBI 2025 per kab/kota. Kode mengikuti weather registry.",
    columns: [
      { key: "kode_kabupaten", label: "Kode", type: "text", editable: false },
      { key: "kabupaten", label: "Nama", type: "text", editable: false },
      { key: "is_kota", label: "Kota", type: "boolean", editable: false },
      { key: "irb_2025", label: "IRB 2025", type: "number", editable: true },
      {
        key: "kelas_risiko_2025",
        label: "Kelas 2025",
        type: "select",
        editable: true,
        options: ["RENDAH", "SEDANG", "TINGGI"],
      },
      { key: "irb_2024", label: "IRB 2024", type: "number", editable: true },
      { key: "ancaman_tertinggi", label: "Ancaman tertinggi", type: "text", editable: true },
      { key: "skor_ancaman_tertinggi", label: "Skor ancaman", type: "number", editable: true },
      {
        key: "kelas_ancaman_tertinggi",
        label: "Kelas ancaman",
        type: "select",
        editable: true,
        options: ["RENDAH", "SEDANG", "TINGGI"],
      },
      { key: "jumlah_ancaman_tinggi", label: "Jml tinggi", type: "number", editable: true },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
  krb_wilayah: {
    key: "krb_wilayah",
    label: "KRB wilayah (kab × ancaman)",
    pk: "id",
    defaultSort: { column: "id", ascending: true },
    searchable: ["id", "kode_kabupaten", "kabupaten", "jenis_bahaya"],
    allowInsert: false,
    allowDelete: false,
    note: "253 baris kab × jenis. Edit kelas/skor IRBI; jangan insert massal dari UI.",
    columns: [
      { key: "id", label: "ID", type: "text", editable: false },
      { key: "kode_kabupaten", label: "Kode kab", type: "text", editable: false },
      { key: "kabupaten", label: "Kabupaten", type: "text", editable: false },
      { key: "jenis_bahaya", label: "Jenis", type: "text", editable: false },
      {
        key: "kelas_ancaman",
        label: "Kelas",
        type: "select",
        editable: true,
        options: ["RENDAH", "SEDANG", "TINGGI"],
      },
      { key: "skor_irbi", label: "Skor IRBI", type: "number", editable: true },
      { key: "tahun_acuan", label: "Tahun", type: "number", editable: false },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
  krb_kawasan: {
    key: "krb_kawasan",
    label: "KRB kawasan bernama",
    pk: "id",
    defaultSort: { column: "id", ascending: true },
    searchable: ["id", "nama", "jenis_bahaya", "zona"],
    allowInsert: true,
    allowDelete: true,
    note: "Puncak/koridor tanpa poligon. lat/lon opsional.",
    columns: [
      { key: "id", label: "ID", type: "text", editable: true },
      { key: "nama", label: "Nama", type: "text", editable: true },
      { key: "jenis_bahaya", label: "Jenis", type: "text", editable: true },
      { key: "zona", label: "Zona", type: "text", editable: true },
      { key: "kabupaten", label: "Kabupaten", type: "json", editable: true },
      { key: "kode_kabupaten", label: "Kode kab", type: "json", editable: true },
      { key: "deskripsi", label: "Deskripsi", type: "text", editable: true },
      { key: "latitude", label: "Latitude", type: "number", editable: true },
      { key: "longitude", label: "Longitude", type: "number", editable: true },
      { key: "sumber", label: "Sumber", type: "text", editable: true },
      { key: "sumber_url", label: "URL sumber", type: "text", editable: true },
      { key: "catatan", label: "Catatan", type: "text", editable: true },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
  krb_dokumen: {
    key: "krb_dokumen",
    label: "KRB dokumen",
    pk: "id",
    defaultSort: { column: "id", ascending: true },
    searchable: ["id", "judul", "jenis", "penerbit", "kabupaten"],
    allowInsert: true,
    allowDelete: true,
    note: "Katalog tautan InaRISK/PVMBG/BPBA. Bukan geometri.",
    columns: [
      { key: "id", label: "ID", type: "text", editable: true },
      { key: "judul", label: "Judul", type: "text", editable: true },
      { key: "jenis", label: "Jenis", type: "text", editable: true },
      { key: "wilayah", label: "Wilayah", type: "text", editable: true },
      { key: "kabupaten", label: "Kabupaten", type: "text", editable: true },
      { key: "tahun_mulai", label: "Tahun mulai", type: "number", editable: true },
      { key: "tahun_akhir", label: "Tahun akhir", type: "number", editable: true },
      { key: "penerbit", label: "Penerbit", type: "text", editable: true },
      { key: "status", label: "Status", type: "text", editable: true },
      { key: "url", label: "URL", type: "text", editable: true },
      { key: "catatan", label: "Catatan", type: "text", editable: true },
      { key: "updated_at", label: "Diperbarui", type: "datetime", editable: false },
    ],
  },
};

export function isAdminTableKey(value: string): value is AdminTableKey {
  return (ADMIN_TABLE_KEYS as string[]).includes(value);
}

export function pickInsertRow(
  table: AdminTableConfig,
  input: Record<string, unknown>
): Record<string, unknown> {
  const allowed = new Set(
    table.columns.filter((c) => c.key !== "updated_at").map((c) => c.key)
  );
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}

export function pickEditablePatch(
  table: AdminTableConfig,
  input: Record<string, unknown>
): Record<string, unknown> {
  const allowed = new Set(table.columns.filter((c) => c.editable).map((c) => c.key));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}

export type DomainTable = {
  [K in AdminTableKey]: Database["public"]["Tables"][K];
};
