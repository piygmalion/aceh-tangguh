/**
 * Intersection builder for villageDistribution → area_feature_meta.
 *
 * Join key is properties.kode_desa_kelurahan (10-digit BPS), never feature.id.
 * Name / kabupaten / copied attributes come from profil_desa coded rows only.
 * Do not invent kodes, do not remap leftover names, do not use Kemendagri dictionaries.
 */

export const VILLAGE_LAYER_KEY = "villageDistribution";

export const TEN_DIGIT_KODE = /^\d{10}$/;

/** Profil columns copied into area_feature_meta.properties (existing fields only). */
export const PROFIL_PROPERTY_FIELDS = [
  "kode_desa_kelurahan",
  "kecamatan",
  "kode_kabupaten",
  "kode_kecamatan",
  "kondisi_kode",
  "kk",
  "populasi",
  "kk_terdampak",
  "populasi_terdampak",
  "korban_meninggal",
  "korban_hilang",
  "rumah_rr",
  "rumah_rs",
  "rumah_rb",
  "total_rumah_rusak",
];

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function tenDigitKode(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return TEN_DIGIT_KODE.test(s) ? s : null;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function hasProfilKode(value) {
  if (value == null) return false;
  return String(value).trim().length > 0;
}

/**
 * @param {Array<{ properties?: Record<string, unknown> | null }>} features
 * @returns {{
 *   geojsonCoded: Map<string, { properties?: Record<string, unknown> | null }>,
 *   geojson_coded: number,
 *   skipped_empty_geojson: number,
 *   skipped_non_ten_digit_geojson: number,
 * }}
 */
export function collectGeojsonCoded(features) {
  /** @type {Map<string, { properties?: Record<string, unknown> | null }>} */
  const geojsonCoded = new Map();
  let skipped_empty_geojson = 0;
  let skipped_non_ten_digit_geojson = 0;

  for (const feature of features || []) {
    const raw = feature?.properties?.kode_desa_kelurahan;
    if (!hasProfilKode(raw)) {
      skipped_empty_geojson += 1;
      continue;
    }
    const kode = tenDigitKode(raw);
    if (!kode) {
      skipped_non_ten_digit_geojson += 1;
      continue;
    }
    if (!geojsonCoded.has(kode)) {
      geojsonCoded.set(kode, feature);
    }
  }

  return {
    geojsonCoded,
    geojson_coded: geojsonCoded.size,
    skipped_empty_geojson,
    skipped_non_ten_digit_geojson,
  };
}

/**
 * @param {Array<Record<string, unknown>>} profilRows
 * @returns {{
 *   profilByKode: Map<string, Record<string, unknown>>,
 *   profil_coded: number,
 *   skipped_profil_null: number,
 * }}
 */
export function collectProfilCoded(profilRows) {
  /** @type {Map<string, Record<string, unknown>>} */
  const profilByKode = new Map();
  let skipped_profil_null = 0;

  for (const row of profilRows || []) {
    const raw = row?.kode_desa_kelurahan;
    if (!hasProfilKode(raw)) {
      skipped_profil_null += 1;
      continue;
    }
    const kode = tenDigitKode(raw) ?? String(raw).trim();
    if (!profilByKode.has(kode)) {
      profilByKode.set(kode, row);
    }
  }

  return {
    profilByKode,
    profil_coded: profilByKode.size,
    skipped_profil_null,
  };
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function propertiesFromProfil(row) {
  /** @type {Record<string, unknown>} */
  const properties = {};
  for (const key of PROFIL_PROPERTY_FIELDS) {
    if (row[key] !== undefined) {
      properties[key] = row[key];
    }
  }
  return properties;
}

/**
 * Build area_feature_meta rows for the geojson-coded ∩ profil-coded intersection.
 * Stamps name/kabupaten from profil only. Join is kode, never feature.id or name.
 *
 * @param {Array<{ id?: unknown, properties?: Record<string, unknown> | null }>} features
 * @param {Array<Record<string, unknown>>} profilRows
 */
export function buildVillageAreaMeta(features, profilRows) {
  const geo = collectGeojsonCoded(features);
  const profil = collectProfilCoded(profilRows);

  /** @type {Array<{ id: string, layer_key: string, name: string, kabupaten: string | null, properties: Record<string, unknown> }>} */
  const rows = [];
  let geojson_kode_not_in_profil = 0;

  for (const kode of geo.geojsonCoded.keys()) {
    const profilRow = profil.profilByKode.get(kode);
    if (!profilRow) {
      geojson_kode_not_in_profil += 1;
      continue;
    }
    const name = typeof profilRow.nama === "string" ? profilRow.nama.trim() : "";
    if (!name) continue;
    const kabupaten =
      typeof profilRow.kabupaten === "string" && profilRow.kabupaten.trim()
        ? profilRow.kabupaten.trim()
        : null;
    rows.push({
      id: kode,
      layer_key: VILLAGE_LAYER_KEY,
      name,
      kabupaten,
      properties: propertiesFromProfil(profilRow),
    });
  }

  return {
    rows,
    counts: {
      geojson_coded: geo.geojson_coded,
      profil_coded: profil.profil_coded,
      intersection: rows.length,
      skipped_empty_geojson: geo.skipped_empty_geojson,
      skipped_profil_null: profil.skipped_profil_null,
      geojson_kode_not_in_profil,
    },
  };
}
