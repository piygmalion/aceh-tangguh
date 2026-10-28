/**
 * Parse + overlap helpers for tilikan jalan/jembatan CSVs.
 *
 * Ingest only coord_quality=ok rows into tilikan_kerusakan_infra.
 * Do not read pengungsian / Haifa / Padal / polsek / fasum / PII files.
 * Do not upsert marker_features. Do not join desa by name.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, csvRecords } from "./profil-sheet.mjs";
import { tenDigitKode } from "./village-area-meta.mjs";

const registryPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../public/fixtures/aceh-kabupaten-registry.json",
);

/** Kemendagri 4 digit from registry adm2. Not the BPS kode_kab on boundaries. */
export const ACEH_KABUPATEN = JSON.parse(readFileSync(registryPath, "utf8")).kabupaten_kota.map(
  (row) => ({
    kode: String(row.adm2).replace(".", ""),
    nama: row.nama,
  }),
);

export const NEAR_METERS = 50;
export const ALLOWED_JENIS = new Set(["jalan", "jembatan"]);

const BLOCKED_PATH = /(pengungsian|haifa|padal|polsek|fasum|orang.?hilang|missing.?person|kontak_internal)/i;
const PII_HEADER =
  /(^|_)(hp|telepon|telpon|telp|phone|no_hp|nomor.?kontak|nama_pic|nama_camat|camat|kepala.?desa|kades|penanggungjawab|pic_nama|pic_kontak)(_|$)/i;
const ADMIN_PREFIX =
  /^(kota(\s+administratif)?|kabupaten|kab\.?|kotamadya)\s+/i;

/**
 * @param {string} filePath
 */
export function assertAllowedTilikanPath(filePath) {
  const normalized = String(filePath ?? "").replace(/\\/g, "/");
  if (BLOCKED_PATH.test(normalized)) {
    throw new Error(
      `Refusing ${normalized}: pengungsian / orang hilang / polsek / fasum stay off this ingest.`
    );
  }
}

/**
 * @param {string[]} headers
 */
export function assertNoPiiHeaders(headers) {
  for (const header of headers) {
    const key = String(header ?? "").trim().replace(/\s+/g, "_");
    if (PII_HEADER.test(key)) {
      throw new Error(`Refusing CSV with PII header: ${header}`);
    }
  }
}

/**
 * @param {string} raw
 */
export function foldName(raw) {
  return String(raw ?? "")
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * @param {string | null | undefined} raw
 */
export function findKabupaten(raw) {
  if (!raw) return undefined;
  const key = foldName(raw).replace(ADMIN_PREFIX, "").trim();
  if (!key) return undefined;
  return ACEH_KABUPATEN.find((row) => foldName(row.nama) === key);
}

/**
 * @param {unknown} value
 */
export function toFiniteNumber(value) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {string} nama
 */
export function exactKey(lat, lng, nama) {
  return `${lat.toFixed(5)}|${lng.toFixed(5)}|${foldName(nama)}`;
}

/**
 * @param {"jalan" | "jembatan"} jenis
 * @param {number} lat
 * @param {number} lng
 * @param {string} nama
 */
export function dedupKey(jenis, lat, lng, nama) {
  return `${jenis}|${exactKey(lat, lng, nama)}`;
}

/**
 * @param {unknown} raw
 * @returns {"jalan" | "jembatan" | null}
 */
export function normalizeJenis(raw) {
  const text = String(raw ?? "").trim().toLowerCase();
  if (text === "jalan" || text.includes("road") || text.includes("tilikan_jalan")) {
    return "jalan";
  }
  if (text === "jembatan" || text.includes("bridge") || text.includes("tilikan_jembatan")) {
    return "jembatan";
  }
  return null;
}

/**
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * @param {string} csvText
 * @param {string} filePath
 */
export function parseTilikanKerusakanCsv(csvText, filePath) {
  assertAllowedTilikanPath(filePath);
  const rows = parseCsv(csvText);
  if (!rows.length) {
    return { accepted: [], skipped: [], headers: [] };
  }
  const headers = rows[0].map((h) => h.trim());
  assertNoPiiHeaders(headers);
  const records = csvRecords(rows);
  /** @type {object[]} */
  const accepted = [];
  /** @type {object[]} */
  const skipped = [];
  for (const rec of records) {
    const jenis = normalizeJenis(rec.sumber || rec.jenis);
    const lat = toFiniteNumber(rec.latitude);
    const lng = toFiniteNumber(rec.longitude);
    const nama = String(rec.nama ?? "").trim();
    const quality = String(rec.coord_quality ?? "").trim();
    if (quality !== "ok" || lat == null || lng == null || !jenis || !nama) {
      skipped.push({
        nama,
        reason: quality !== "ok" ? "coord_quality" : !jenis ? "jenis" : "incomplete",
      });
      continue;
    }
    const kab = findKabupaten(rec.kabupaten);
    const kabRaw = String(rec.kabupaten ?? "").trim();
    accepted.push({
      jenis,
      nama,
      alamat: String(rec.alamat ?? "").trim() || null,
      kabupaten: kab?.nama ?? (kabRaw || null),
      kode_kabupaten: kab?.kode ?? null,
      kecamatan: String(rec.kecamatan ?? "").trim() || null,
      desa: String(rec.desa ?? "").trim() || null,
      kode_desa_kelurahan: tenDigitKode(rec.kode_desa || rec.kode_desa_kelurahan),
      latitude: lat,
      longitude: lng,
      coord_quality: "ok",
      approx: String(rec.approx ?? "").toLowerCase() === "true",
      sumber: String(rec.sumber ?? "").trim() || null,
      media_url: String(rec.media_url ?? "").trim() || null,
      source_row: nama,
      dedup_key: dedupKey(jenis, lat, lng, nama),
      exact_key: exactKey(lat, lng, nama),
    });
  }
  return { accepted, skipped, headers };
}

/**
 * @param {object} fc
 * @returns {{ id: string, title: string, lat: number, lng: number, kabupaten: string | null }[]}
 */
/**
 * @param {{ id?: unknown, title?: unknown, latitude?: unknown, longitude?: unknown, kabupaten?: unknown, layer?: unknown }[]} rows
 */
export function inventoryFromMarkerRows(rows) {
  /** @type {{ id: string, title: string, lat: number, lng: number, kabupaten: string | null }[]} */
  const out = [];
  for (const row of rows || []) {
    if (row.layer && row.layer !== "infraRoadBridge") continue;
    const lat = toFiniteNumber(row.latitude);
    const lng = toFiniteNumber(row.longitude);
    if (lat == null || lng == null) continue;
    out.push({
      id: String(row.id ?? ""),
      title: String(row.title ?? "").trim(),
      lat,
      lng,
      kabupaten: row.kabupaten ? String(row.kabupaten) : null,
    });
  }
  return out;
}

export function inventoryFromMarkers(fc) {
  const features = Array.isArray(fc?.features) ? fc.features : [];
  /** @type {{ id: string, title: string, lat: number, lng: number, kabupaten: string | null }[]} */
  const out = [];
  for (const feature of features) {
    const layer = feature?.properties?.layer;
    if (layer !== "infraRoadBridge") continue;
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lng = toFiniteNumber(coords[0]);
    const lat = toFiniteNumber(coords[1]);
    if (lat == null || lng == null) continue;
    const title = String(feature.properties?.title ?? feature.id ?? "").trim();
    out.push({
      id: String(feature.id ?? ""),
      title,
      lat,
      lng,
      kabupaten: feature.properties?.kabupaten ? String(feature.properties.kabupaten) : null,
    });
  }
  return out;
}

/**
 * @param {{ lat: number, lng: number }[]} points
 */
export function buildNearIndex(points) {
  /** @type {Map<string, number[]>} */
  const grid = new Map();
  points.forEach((point, index) => {
    const key = `${Math.round(point.lat * 1000)}|${Math.round(point.lng * 1000)}`;
    const bucket = grid.get(key);
    if (bucket) bucket.push(index);
    else grid.set(key, [index]);
  });
  return grid;
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {{ lat: number, lng: number, id: string, title: string }[]} inventory
 * @param {Map<string, number[]>} grid
 */
export function nearestWithin(lat, lng, inventory, grid) {
  const gy = Math.round(lat * 1000);
  const gx = Math.round(lng * 1000);
  let best = null;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const hits = grid.get(`${gy + dy}|${gx + dx}`);
      if (!hits) continue;
      for (const index of hits) {
        const point = inventory[index];
        const meters = haversineMeters(lat, lng, point.lat, point.lng);
        if (meters > NEAR_METERS) continue;
        if (!best || meters < best.meters) {
          best = { ...point, meters };
        }
      }
    }
  }
  return best;
}

/**
 * @param {object[]} accepted
 * @param {{ id: string, title: string, lat: number, lng: number }[]} inventory
 */
export function classifyOverlap(accepted, inventory) {
  const exact = new Map();
  for (const point of inventory) {
    exact.set(exactKey(point.lat, point.lng, point.title), point);
  }
  const grid = buildNearIndex(inventory);
  return accepted.map((row) => {
    const hit = exact.get(row.exact_key);
    if (hit) {
      return {
        ...row,
        match: "exact",
        marker_feature_id: hit.id || null,
        marker_title: hit.title,
        distance_m: 0,
      };
    }
    const near = nearestWithin(row.latitude, row.longitude, inventory, grid);
    if (near) {
      return {
        ...row,
        match: "near",
        marker_feature_id: near.id || null,
        marker_title: near.title,
        distance_m: Math.round(near.meters * 10) / 10,
      };
    }
    return {
      ...row,
      match: "baru",
      marker_feature_id: null,
      marker_title: "",
      distance_m: "",
    };
  });
}

export const OVERLAP_FIELDS = [
  "jenis",
  "nama",
  "latitude",
  "longitude",
  "kabupaten",
  "kode_kabupaten",
  "match",
  "marker_feature_id",
  "marker_title",
  "distance_m",
];

/**
 * @param {object[]} classified
 */
export function overlapStats(classified) {
  return {
    rows: classified.length,
    exact: classified.filter((row) => row.match === "exact").length,
    near: classified.filter((row) => row.match === "near").length,
    baru: classified.filter((row) => row.match === "baru").length,
  };
}
