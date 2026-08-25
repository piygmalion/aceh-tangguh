/**
 * Parser + join helpers for the coordinator profil_desa Google Sheet.
 *
 * Join ONLY on 10-digit kode_desa_kelurahan ∩ existing profil_desa.
 * Never name-only. Never invent kodes. Never Kemendagri remaps. Never feature.id.
 *
 * Count cells: '-' → null, '' → null, '00' → 0, literal 0 stays 0.
 * total_rumah_rusak = sum of non-null rumah_rr/rs/rb; null when all three are null.
 */
import { tenDigitKode } from "./village-area-meta.mjs";

export const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/13oDQIIpuoJbK39M_x_WPXFqfbhLyUe2myuZB1kdMlio/export?format=csv&gid=0";

export const KONDISI_SLUG = {
  "Tidak diketahui/Tidak terdampak": "tidak_diketahui",
  "Sebagian terdampak/terkena banjir": "sebagian_terdampak",
  Terisolir: "terisolir",
};

/** Sheet header → destination count field. */
export const COUNT_COLUMNS = {
  "Jumlah KK terdampak": "kk_terdampak",
  "Populasi terdampak": "populasi_terdampak",
  "Korban Hilang": "korban_hilang",
  "Korban meninggal": "korban_meninggal",
  "Rumah RR": "rumah_rr",
  "Rumah RS": "rumah_rs",
  "Rumah RB": "rumah_rb",
  "Jumlah KK": "kk",
  "Jumlah Populasi": "populasi",
  "Kepala Keluarga (Laki-laki)": "kk_laki_laki",
  "Kepala Keluarga (Perempuan)": "kk_perempuan",
  "Bayi (0 - 1 thn)": "bayi_0_1",
  "Balita (1 - 4 thn)": "balita_1_4",
  "Anak (5 - 12 thn)": "anak_5_12",
  "Remaja (13 - 17 thn)": "remaja_13_17",
  "Dewasa (18 - 59 thn)": "dewasa_18_59",
  "Lansia (>60 thn)": "lansia_60_plus",
  "Penyandang Disabilitas": "penyandang_disabilitas",
};

export const COUNT_FIELD_NAMES = Object.values(COUNT_COLUMNS);

const DEMOGRAFI_FIELDS = [
  "kk_laki_laki",
  "kk_perempuan",
  "bayi_0_1",
  "balita_1_4",
  "anak_5_12",
  "remaja_13_17",
  "dewasa_18_59",
  "lansia_60_plus",
  "penyandang_disabilitas",
];

/**
 * RFC4180-ish CSV parse. Handles quotes, commas, CR/LF, and a leading BOM.
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  const src = String(text ?? "").replace(/^\uFEFF/, "");
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (inQuotes || field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

/**
 * @param {string[][]} rows
 * @returns {Array<Record<string, string>>}
 */
export function csvRecords(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  /** @type {Array<Record<string, string>>} */
  const records = [];
  for (const line of rows.slice(1)) {
    /** @type {Record<string, string>} */
    const rec = {};
    for (let i = 0; i < headers.length; i += 1) {
      rec[headers[i]] = line[i] ?? "";
    }
    records.push(rec);
  }
  return records;
}

/**
 * @param {unknown} raw
 * @returns {{ value: number | null, kind: "empty" | "dash" | "zero_00" | "zero" | "number" | "invalid" }}
 */
export function parseCount(raw) {
  if (raw == null) return { value: null, kind: "empty" };
  const s = String(raw).trim();
  if (s === "") return { value: null, kind: "empty" };
  if (s === "-") return { value: null, kind: "dash" };
  if (s === "00") return { value: 0, kind: "zero_00" };
  if (!/^-?\d+$/.test(s)) return { value: null, kind: "invalid" };
  const n = Number(s);
  if (!Number.isFinite(n)) return { value: null, kind: "invalid" };
  return { value: n, kind: n === 0 ? "zero" : "number" };
}

/**
 * @param {unknown} label
 * @returns {{ label: string | null, kode: string | null }}
 */
export function mapKondisi(label) {
  if (label == null) return { label: null, kode: null };
  const trimmed = String(label).trim();
  if (!trimmed || trimmed === "-") return { label: null, kode: null };
  return { label: trimmed, kode: KONDISI_SLUG[trimmed] ?? null };
}

/**
 * Sum non-null rumah counts. All-null → null (dash is already null; do not treat as 0).
 * @param {number | null} rr
 * @param {number | null} rs
 * @param {number | null} rb
 * @returns {number | null}
 */
export function totalRumahRusak(rr, rs, rb) {
  let saw = false;
  let sum = 0;
  for (const value of [rr, rs, rb]) {
    if (value == null || Number.isNaN(value)) continue;
    saw = true;
    sum += value;
  }
  return saw ? sum : null;
}

/**
 * Keep the existing name/kabupaten/kecamatan unless it is truly empty.
 * @param {unknown} existing
 * @param {unknown} incoming
 * @returns {string | null}
 */
export function preserveExistingName(existing, incoming) {
  const current = existing == null ? "" : String(existing).trim();
  if (current) return current;
  const next = incoming == null ? "" : String(incoming).trim();
  return next || null;
}

/**
 * @param {Record<string, string>} record
 * @returns {{
 *   kode: string | null,
 *   nama: string | null,
 *   kabupaten: string | null,
 *   kecamatan: string | null,
 *   kondisi_label: string | null,
 *   kondisi_kode: string | null,
 *   values: Record<string, number | null>,
 *   kinds: Record<string, string>,
 *   skipped_empty_kode: boolean,
 * }}
 */
export function parseSheetRecord(record) {
  const kode = tenDigitKode(record?.kode_desa_kelurahan);
  const rawKode = record?.kode_desa_kelurahan;
  const hasRaw = rawKode != null && String(rawKode).trim() !== "";
  if (hasRaw && !kode) {
    // Non-10-digit junk is skipped as empty — never invented into a kode.
  }
  const kondisi = mapKondisi(record?.["Kondisi Kelurahan/Desa/Gampong"]);
  /** @type {Record<string, number | null>} */
  const values = {};
  /** @type {Record<string, string>} */
  const kinds = {};
  for (const [header, field] of Object.entries(COUNT_COLUMNS)) {
    const parsed = parseCount(record?.[header]);
    values[field] = parsed.value;
    kinds[field] = parsed.kind;
  }
  const nama = String(record?.desa_kelurahan ?? "").trim() || null;
  const kabupaten = String(record?.kabupaten_kota ?? "").trim() || null;
  const kecamatan = String(record?.kecamatan ?? "").trim() || null;
  return {
    kode,
    nama,
    kabupaten,
    kecamatan,
    kondisi_label: kondisi.label,
    kondisi_kode: kondisi.kode,
    values,
    kinds,
    skipped_empty_kode: !kode,
  };
}

/**
 * @param {string} csvText
 */
export function parseProfilSheet(csvText) {
  const records = csvRecords(parseCsv(csvText));
  const rows = records.map(parseSheetRecord);
  return { records, rows, stats: sheetStats(rows) };
}

/**
 * @param {Array<ReturnType<typeof parseSheetRecord>>} rows
 */
export function sheetStats(rows) {
  /** @type {Record<string, number>} */
  const dash_null_by_column = {};
  /** @type {Record<string, number>} */
  const zero_00_by_column = {};
  for (const field of COUNT_FIELD_NAMES) {
    dash_null_by_column[field] = 0;
    zero_00_by_column[field] = 0;
  }
  let sheet_coded = 0;
  let sheet_empty_kode = 0;
  for (const row of rows) {
    if (row.kode) sheet_coded += 1;
    else sheet_empty_kode += 1;
    for (const field of COUNT_FIELD_NAMES) {
      if (row.kinds[field] === "dash") dash_null_by_column[field] += 1;
      if (row.kinds[field] === "zero_00") zero_00_by_column[field] += 1;
    }
  }
  return {
    sheet_rows: rows.length,
    sheet_coded,
    sheet_empty_kode,
    dash_null_by_column,
    zero_00_by_column,
  };
}

/**
 * 10-digit kode join only. Empty-kode sheet rows are skipped, never name-matched.
 * @param {Array<ReturnType<typeof parseSheetRecord>>} sheetRows
 * @param {Array<Record<string, unknown>>} liveRows
 */
export function joinByTenDigitKode(sheetRows, liveRows) {
  /** @type {Map<string, Record<string, unknown>>} */
  const liveByKode = new Map();
  let live_empty_kode = 0;
  for (const live of liveRows || []) {
    const kode = tenDigitKode(live?.kode_desa_kelurahan);
    if (!kode) {
      live_empty_kode += 1;
      continue;
    }
    if (!liveByKode.has(kode)) liveByKode.set(kode, live);
  }

  /** @type {Array<{ kode: string, sheet: ReturnType<typeof parseSheetRecord>, live: Record<string, unknown> }>} */
  const matched = [];
  /** @type {Array<ReturnType<typeof parseSheetRecord>>} */
  const unmatched_sheet = [];
  /** @type {Array<ReturnType<typeof parseSheetRecord>>} */
  const skipped_empty_kode = [];
  const seen = new Set();

  for (const sheet of sheetRows) {
    if (!sheet.kode) {
      skipped_empty_kode.push(sheet);
      continue;
    }
    const live = liveByKode.get(sheet.kode);
    if (!live) {
      unmatched_sheet.push(sheet);
      continue;
    }
    matched.push({ kode: sheet.kode, sheet, live });
    seen.add(sheet.kode);
  }

  const unmatched_live = [...liveByKode.keys()].filter((kode) => !seen.has(kode));

  return {
    matched,
    unmatched_sheet,
    unmatched_live,
    skipped_empty_kode,
    live_coded: liveByKode.size,
    live_empty_kode,
  };
}

/**
 * Refresh payload.demografi / payload.dampak_bencana / payload.kondisi.
 * Preserve id, lokasi, kabupaten_kota, desa_kelurahan, kode_desa_kelurahan.
 * Do not invent a new payload id.
 * @param {unknown} existing
 * @param {ReturnType<typeof parseSheetRecord>} parsed
 */
export function mergePayload(existing, parsed) {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};
  const prevDemo =
    base.demografi && typeof base.demografi === "object" && !Array.isArray(base.demografi)
      ? { ...base.demografi }
      : {};
  const prevDampak =
    base.dampak_bencana &&
    typeof base.dampak_bencana === "object" &&
    !Array.isArray(base.dampak_bencana)
      ? { ...base.dampak_bencana }
      : {};
  const prevKondisi =
    base.kondisi && typeof base.kondisi === "object" && !Array.isArray(base.kondisi)
      ? { ...base.kondisi }
      : {};

  const v = parsed.values;
  const total = totalRumahRusak(v.rumah_rr, v.rumah_rs, v.rumah_rb);

  return {
    ...base,
    demografi: {
      ...prevDemo,
      jumlah_kk: v.kk,
      jumlah_populasi: v.populasi,
      kk_laki_laki: v.kk_laki_laki,
      kk_perempuan: v.kk_perempuan,
      bayi_0_1: v.bayi_0_1,
      balita_1_4: v.balita_1_4,
      anak_5_12: v.anak_5_12,
      remaja_13_17: v.remaja_13_17,
      dewasa_18_59: v.dewasa_18_59,
      lansia_60_plus: v.lansia_60_plus,
      penyandang_disabilitas: v.penyandang_disabilitas,
    },
    dampak_bencana: {
      ...prevDampak,
      jumlah_kk_terdampak: v.kk_terdampak,
      populasi_terdampak: v.populasi_terdampak,
      korban_hilang: v.korban_hilang,
      korban_meninggal: v.korban_meninggal,
      rumah_rusak_ringan: v.rumah_rr,
      rumah_rusak_sedang: v.rumah_rs,
      rumah_rusak_berat: v.rumah_rb,
      total_rumah_rusak: total,
    },
    kondisi: {
      ...prevKondisi,
      kondisi_desa: parsed.kondisi_label,
      kondisi_desa_kode: parsed.kondisi_kode,
    },
  };
}

/**
 * Build a profil_desa UPDATE patch for a 10-digit match.
 * Never changes id or kode. Names only fill when the live field is empty.
 * Returns null when the sheet kode is missing or does not match live.
 * @param {Record<string, unknown>} live
 * @param {ReturnType<typeof parseSheetRecord>} parsed
 */
export function buildProfilUpdate(live, parsed) {
  const liveKode = tenDigitKode(live?.kode_desa_kelurahan);
  if (!parsed.kode || !liveKode || parsed.kode !== liveKode) return null;

  const v = parsed.values;
  const total = totalRumahRusak(v.rumah_rr, v.rumah_rs, v.rumah_rb);

  /** @type {Record<string, unknown>} */
  const patch = {
    kondisi_kode: parsed.kondisi_kode,
    kk: v.kk,
    populasi: v.populasi,
    kk_terdampak: v.kk_terdampak,
    populasi_terdampak: v.populasi_terdampak,
    korban_meninggal: v.korban_meninggal,
    korban_hilang: v.korban_hilang,
    rumah_rr: v.rumah_rr,
    rumah_rs: v.rumah_rs,
    rumah_rb: v.rumah_rb,
    total_rumah_rusak: total,
    payload: mergePayload(live.payload, parsed),
    updated_at: new Date().toISOString(),
  };

  for (const field of DEMOGRAFI_FIELDS) {
    patch[field] = v[field];
  }

  const nama = preserveExistingName(live.nama, parsed.nama);
  const kabupaten = preserveExistingName(live.kabupaten, parsed.kabupaten);
  const kecamatan = preserveExistingName(live.kecamatan, parsed.kecamatan);
  const liveNama = live.nama == null ? "" : String(live.nama).trim();
  const liveKab = live.kabupaten == null ? "" : String(live.kabupaten).trim();
  const liveKec = live.kecamatan == null ? "" : String(live.kecamatan).trim();
  if (!liveNama && nama) patch.nama = nama;
  if (!liveKab && kabupaten) patch.kabupaten = kabupaten;
  if (!liveKec && kecamatan) patch.kecamatan = kecamatan;

  return {
    id: live.id,
    kode: parsed.kode,
    patch,
  };
}
