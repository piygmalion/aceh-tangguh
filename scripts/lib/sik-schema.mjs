/**
 * Table / column aliases for sik_aceh.db.
 * Names are matched case-insensitively. Do not invent columns.
 */

export const SKIP_TABLE_NAMES = new Set([
  "users",
  "user",
  "session",
  "sessions",
  "login",
  "password",
  "passwords",
  "log",
  "logs",
  "audit",
  "audits",
  "token",
  "tokens",
  "cache",
  "android_metadata",
]);

export const KEJADIAN_TABLE_ALIASES = [
  "kejadian",
  "kejadian_bencana",
  "t_kejadian",
  "bencana",
  "sik_kejadian",
  "disasters",
  "disaster",
  "events",
  "event",
];

export const WILAYAH_TABLE_ALIASES = [
  "desa",
  "wilayah",
  "m_desa",
  "ref_desa",
  "gampong",
  "kelurahan",
];

/** @type {Record<string, string[]>} */
export const COLUMN_ALIASES = {
  sik_id: ["id", "id_kejadian", "kejadian_id", "kode", "kode_kejadian", "no"],
  jenis_bencana: [
    "jenis_bencana",
    "jenis_bencana_teks",
    "jenis",
    "tipe_bencana",
    "nama_bencana",
    "bencana",
  ],
  hari_tanggal: ["hari_tanggal", "tanggal", "tgl", "date", "waktu", "datetime"],
  latitude: ["latitude", "lat", "y", "koordinat_y"],
  longitude: ["longitude", "lon", "lng", "long", "x", "koordinat_x"],
  kabupaten: ["kabupaten", "kab", "kabupaten_kota", "nama_kabupaten"],
  kecamatan: ["kecamatan", "kec", "nama_kecamatan"],
  desa: ["desa", "kelurahan", "gampong", "nama_desa"],
  kode_desa_kelurahan: [
    "kode_desa_kelurahan",
    "kode_desa",
    "kode_bps",
    "kode_wilayah",
    "kd_desa",
  ],
  jiwa_terdampak: ["jiwa_terdampak", "jiwa", "penduduk_terdampak"],
  kk_terdampak: ["kk_terdampak", "kk"],
  pengungsi: ["pengungsi", "mengungsi"],
  meninggal: ["meninggal", "korban_meninggal", "mati"],
  hilang: ["hilang", "korban_hilang"],
  luka_berat: ["luka_berat", "luka_berat_jumlah"],
  luka_ringan: ["luka_ringan", "luka_ringan_jumlah"],
  kronologi: ["kronologi", "uraian", "deskripsi", "keterangan"],
  penyebab: ["penyebab", "sebab"],
  status_proses: ["status_proses", "status", "status_penanganan"],
  jam: ["jam", "waktu_kejadian"],
};

export const KAB_ALIASES = {
  "kab. aceh utara": "Aceh Utara",
  "kabupaten aceh utara": "Aceh Utara",
  "kab. aceh timur": "Aceh Timur",
  "kabupaten aceh timur": "Aceh Timur",
  "kab. aceh tamiang": "Aceh Tamiang",
  "kabupaten aceh tamiang": "Aceh Tamiang",
  "kab. pidie": "Pidie",
  "kabupaten pidie": "Pidie",
  "kab. pidie jaya": "Pidie Jaya",
  "kabupaten pidie jaya": "Pidie Jaya",
  "kab. bireuen": "Bireuen",
  "kabupaten bireuen": "Bireuen",
  "kota langsa": "Langsa",
  langsa: "Langsa",
  "kab. aceh barat": "Aceh Barat",
  "kabupaten aceh barat": "Aceh Barat",
  "kota lhokseumawe": "Lhokseumawe",
  lhokseumawe: "Lhokseumawe",
  "kab. bener meriah": "Bener Meriah",
  "kabupaten bener meriah": "Bener Meriah",
  "kab. aceh singkil": "Aceh Singkil",
  "kabupaten aceh singkil": "Aceh Singkil",
  "kab. gayo lues": "Gayo Lues",
  "kabupaten gayo lues": "Gayo Lues",
  "kab. aceh tengah": "Aceh Tengah",
  "kabupaten aceh tengah": "Aceh Tengah",
  "kab. aceh selatan": "Aceh Selatan",
  "kabupaten aceh selatan": "Aceh Selatan",
  "kab. aceh tenggara": "Aceh Tenggara",
  "kabupaten aceh tenggara": "Aceh Tenggara",
  "kab. nagan raya": "Nagan Raya",
  "kabupaten nagan raya": "Nagan Raya",
  "kab. simeulue": "Simeulue",
  "kabupaten simeulue": "Simeulue",
  "kota subulussalam": "Subulussalam",
  subulussalam: "Subulussalam",
  "kota banda aceh": "Banda Aceh",
  "banda aceh": "Banda Aceh",
  "kota sabang": "Sabang",
  sabang: "Sabang",
  "kab. aceh besar": "Aceh Besar",
  "kabupaten aceh besar": "Aceh Besar",
  "kab. aceh jaya": "Aceh Jaya",
  "kabupaten aceh jaya": "Aceh Jaya",
  "kab. aceh barat daya": "Aceh Barat Daya",
  "kabupaten aceh barat daya": "Aceh Barat Daya",
};

const MONTHS_ID = {
  januari: "01",
  februari: "02",
  maret: "03",
  april: "04",
  mei: "05",
  juni: "06",
  juli: "07",
  agustus: "08",
  september: "09",
  oktober: "10",
  november: "11",
  desember: "12",
};

/**
 * @param {string} name
 */
export function isRejectedTable(name) {
  const key = String(name || "")
    .trim()
    .toLowerCase();
  if (!key) return true;
  if (key.startsWith("sqlite_")) return true;
  return SKIP_TABLE_NAMES.has(key);
}

/**
 * @param {string[]} tables
 * @param {string[]} aliases
 */
export function pickTable(tables, aliases) {
  const lower = new Map(
    (tables || []).map((t) => [String(t).toLowerCase(), t])
  );
  for (const alias of aliases) {
    const hit = lower.get(alias.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

/**
 * @param {string[]} columns
 * @param {string[]} aliases
 */
export function pickColumn(columns, aliases) {
  const lower = new Map(
    (columns || []).map((c) => [String(c).toLowerCase(), c])
  );
  for (const alias of aliases) {
    const hit = lower.get(alias.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

/**
 * @param {string[]} columns
 */
export function resolveKejadianColumns(columns) {
  /** @type {Record<string, string | null>} */
  const mapping = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    mapping[field] = pickColumn(columns, aliases);
  }
  return mapping;
}

/**
 * A table can be treated as kejadian if it has jenis + (date or lat/lng).
 * @param {string[]} columns
 */
export function looksLikeKejadian(columns) {
  const mapping = resolveKejadianColumns(columns);
  if (!mapping.jenis_bencana) return false;
  return Boolean(
    mapping.hari_tanggal || (mapping.latitude && mapping.longitude)
  );
}

/**
 * @param {string[]} tables
 * @param {Record<string, string[]>} columnsByTable
 */
export function resolveKejadianTable(tables, columnsByTable) {
  const named = pickTable(tables, KEJADIAN_TABLE_ALIASES);
  if (named && !isRejectedTable(named) && columnsByTable[named]) {
    if (looksLikeKejadian(columnsByTable[named])) return named;
  }
  for (const table of tables || []) {
    if (isRejectedTable(table)) continue;
    const cols = columnsByTable[table] || [];
    if (looksLikeKejadian(cols)) return table;
  }
  return null;
}

/**
 * @param {unknown} value
 */
export function foldText(value) {
  if (value == null) return "";
  return String(value)
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/^(kab\.?|kabupaten|kota|kec\.?|kecamatan|desa|gampong|kel\.?)\s+/i, "")
    .replace(/\s+/g, " ");
}

/**
 * @param {unknown} raw
 */
export function normalizeKabupaten(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  const folded = foldText(raw);
  if (KAB_ALIASES[folded]) return KAB_ALIASES[folded];
  const stripped = folded.replace(/^(kab\.?|kabupaten|kota)\s+/, "");
  if (KAB_ALIASES[stripped]) return KAB_ALIASES[stripped];
  const original = String(raw).trim();
  return original.replace(/^(kab\.?|kabupaten|kota)\s+/i, "").replace(/\s+/g, " ");
}

/**
 * @param {unknown} raw
 */
export function normalizeTanggalKey(raw) {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s || s === "-") return "";
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const monthYear = s.match(/^([A-Za-zÀ-ÿ]+)\s+(\d{4})$/);
  if (monthYear) {
    const m = MONTHS_ID[monthYear[1].toLowerCase()];
    if (m) return `${monthYear[2]}-${m}`;
  }
  return foldText(s);
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, string | null>} mapping
 */
export function projectSikRow(row, mapping) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [field, column] of Object.entries(mapping)) {
    if (!column) continue;
    out[field] = row[column];
  }
  return out;
}
