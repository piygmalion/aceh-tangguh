import type { Database } from "@/lib/supabase/types";

export type AdminTableKey =
  | "reports"
  | "laporan_kejadian"
  | "laporan_penanganan"
  | "kejadian_bencana"
  | "publikasi"
  | "marker_features"
  | "anggaran_kegiatan"
  | "profil_desa";

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
  "marker_features",
  "anggaran_kegiatan",
  "profil_desa",
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
    label: "Publikasi",
    pk: "slug",
    defaultSort: { column: "published_at", ascending: false },
    searchable: ["slug", "title", "description"],
    allowInsert: true,
    allowDelete: false,
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
};

export function isAdminTableKey(value: string): value is AdminTableKey {
  return (ADMIN_TABLE_KEYS as string[]).includes(value);
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
