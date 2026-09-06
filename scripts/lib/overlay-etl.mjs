/**
 * Pure helpers for the Ruang Kita static ETL.
 * Runtime map never hits ruangkita.net — this is offline ingest only.
 */

import { createHash } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";
import { ACEH_BBOX } from "./aceh-scope.mjs";

export { ACEH_BBOX };

/** Fail the scrape when a layer drops by more than this fraction versus the previous manifest. */
export const OVERLAY_ETL_DROP_THRESHOLD = 0.4;

export const ACEH_PERAIRAN_CODES = [
  "P.A.01",
  "P.A.02",
  "P.A.03",
  "P.A.04",
  "P.A.05",
  "P.A.06",
  "P.A.07",
  "P.A.08",
  "M.01",
  "M.03",
];

export const RUANGKITA_ORIGIN = "https://ruangkita.net";

export const FALLBACK_SOURCE_URLS = {
  pelabuhan: "https://maritim.bmkg.go.id/marine2026-data/meta/pelabuhan.json",
  perairanIndex: "https://maritim.bmkg.go.id/marine2026-data/meta/area_province.json",
  wilmetos: "https://maritim.bmkg.go.id/marine2026-data/meta/wilmetos.min.geojson",
  sensors: "https://bmkg-content-inatews.storage.googleapis.com/sensor_seismic.json",
  faults: "https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer",
};

const ACEH_TERMS = [
  "aceh",
  "banda aceh",
  "sabang",
  "langsa",
  "lhokseumawe",
  "subulussalam",
  "simeulue",
  "pidie",
  "bener meriah",
  "bireuen",
  "gayo lues",
  "nagan raya",
];

export function inAcehBbox(lon, lat) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
  const [minLon, minLat, maxLon, maxLat] = ACEH_BBOX;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

/**
 * Provinces whose territory overlaps the Aceh bbox envelope. The bbox alone is
 * not authoritative: Pangkalan Susu (XB005) and the Sidikalang / Manduamas /
 * Laurambong sensors sit inside the envelope but belong to Sumatera Utara.
 */
const NON_ACEH_PROVINCE_TERMS = [
  "sumatra utara",
  "sumatera utara",
  "north sumatra",
  "north sumatera",
  "sumut",
];

/** True when the text explicitly names a province other than Aceh. */
export function mentionsNonAcehProvince(text) {
  if (!text) return false;
  const hay = String(text).toLowerCase();
  if (NON_ACEH_PROVINCE_TERMS.some((term) => hay.includes(term))) return true;
  return false;
}

export function mentionsAceh(text) {
  if (!text) return false;
  const hay = String(text).toLowerCase();
  return ACEH_TERMS.some((term) => hay.includes(term));
}

export function featurePoint(feature) {
  const geom = feature?.geometry;
  if (!geom) return null;
  if (geom.type === "Point" && Array.isArray(geom.coordinates)) {
    const lon = Number(geom.coordinates[0]);
    const lat = Number(geom.coordinates[1]);
    if (Number.isFinite(lon) && Number.isFinite(lat)) return { lon, lat };
  }
  return null;
}

export function parseDiscoveredUrls(jsText) {
  const discovered = {
    pelabuhan: null,
    perairanIndex: null,
    sensors: null,
    faults: null,
  };
  const pelabuhan = jsText.match(
    /PELABUHAN_GEOJSON\s*=\s*[^;]*?(https?:\/\/[^'"\s]+meta\/pelabuhan\.json)/i,
  );
  if (pelabuhan) discovered.pelabuhan = pelabuhan[1];
  const apiBase = jsText.match(
    /API_BASE\s*=\s*['"](https?:\/\/maritim\.bmkg\.go\.id\/[^'"]+)['"]/i,
  );
  if (apiBase && !discovered.pelabuhan) {
    discovered.pelabuhan = `${apiBase[1].replace(/\/?$/, "/")}meta/pelabuhan.json`;
    discovered.perairanIndex = `${apiBase[1].replace(/\/?$/, "/")}meta/area_province.json`;
  }
  const sensors = jsText.match(
    /SENSOR_SEISMIC_URL\s*=\s*['"](https?:\/\/[^'"]+)['"]/i,
  );
  if (sensors) discovered.sensors = sensors[1];
  const faults = jsText.match(
    /(https:\/\/gis\.bnpb\.go\.id\/server\/rest\/services\/inarisk\/Faults\/MapServer)/i,
  );
  if (faults) discovered.faults = faults[1];
  return discovered;
}

export function filterAcehPorts(collection) {
  const features = Array.isArray(collection?.features) ? collection.features : [];
  return {
    type: "FeatureCollection",
    features: features.filter((f) => {
      const props = f.properties ?? {};
      const pt = featurePoint(f);
      const province = String(props.province ?? props.provinsi ?? "");
      // Province is authoritative when present: an explicit non-Aceh province
      // wins over a bbox hit, otherwise border ports leak into the Aceh layer.
      if (mentionsNonAcehProvince(province)) return false;
      if (province.toLowerCase() === "aceh") return true;
      if (mentionsNonAcehProvince(props.name)) return false;
      if (pt && inAcehBbox(pt.lon, pt.lat)) return true;
      return mentionsAceh(props.name) || mentionsAceh(province);
    }),
  };
}

export function filterAcehSensors(collection) {
  const features = Array.isArray(collection?.features) ? collection.features : [];
  return {
    type: "FeatureCollection",
    features: features
      .map((f) => {
        const pt = featurePoint(f);
        if (!pt) return null;
        const props = f.properties ?? {};
        // InaTEWS carries the province inside `stakeholder`; Sumatera Utara
        // stations near the border fall inside the Aceh bbox, so reject them.
        if (
          mentionsNonAcehProvince(props.stakeholder) ||
          mentionsNonAcehProvince(props.uptbmkg)
        ) {
          return null;
        }
        if (
          !inAcehBbox(pt.lon, pt.lat) &&
          !mentionsAceh(props.stakeholder) &&
          !mentionsAceh(props.uptbmkg)
        ) {
          return null;
        }
        return {
          type: "Feature",
          id: props.id ?? undefined,
          geometry: {
            type: "Point",
            coordinates: [pt.lon, pt.lat],
          },
          properties: {
            ...props,
            layer: "seismicSensors",
            title: String(props.id ?? props.stakeholder ?? "Sensor BMKG"),
          },
        };
      })
      .filter(Boolean),
  };
}

export function filterAcehWaters(collection, codes = ACEH_PERAIRAN_CODES) {
  const allow = new Set(codes);
  const features = Array.isArray(collection?.features) ? collection.features : [];
  return {
    type: "FeatureCollection",
    features: features
      .filter((f) => allow.has(String(f.properties?.ID_MAR ?? f.properties?.id ?? "")))
      .map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          kode: f.properties?.ID_MAR ?? f.properties?.id,
          name: f.properties?.perairan ?? f.properties?.name,
          layer: "maritimeWaters",
        },
      })),
  };
}

export function portsToStaticRows(collection, sourceUrl) {
  return (collection.features ?? []).flatMap((f, i) => {
    // Drop geometry-less ports instead of pinning them to Null Island (0,0).
    const pt = featurePoint(f);
    if (!pt) return [];
    const props = f.properties ?? {};
    const code = String(props.code ?? props.kode ?? "");
    return [{
      id: code || `port-${i}`,
      layer_key: "maritimePorts",
      external_id: code || `port-${i}`,
      name: String(props.name ?? "Pelabuhan"),
      kode_bmkg: code || null,
      longitude: pt.lon,
      latitude: pt.lat,
      source: "ruangkita",
      source_url: sourceUrl,
      properties: {
        ...props,
        layer: "maritimePorts",
        title: props.name,
        kode_bmkg: code,
      },
    }];
  });
}

export function inariskFaultQueryUrl(mapServerBase, layerId) {
  const base = mapServerBase.replace(/\/$/, "");
  const geom = JSON.stringify({
    xmin: ACEH_BBOX[0],
    ymin: ACEH_BBOX[1],
    xmax: ACEH_BBOX[2],
    ymax: ACEH_BBOX[3],
    spatialReference: { wkid: 4326 },
  });
  const params = new URLSearchParams({
    where: "1=1",
    geometry: geom,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });
  return `${base}/${layerId}/query?${params.toString()}`;
}

function bboxEdges(bbox) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return [minLon, minLat, maxLon, maxLat];
}

function pointInBbox(lon, lat, bbox) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
  const [minLon, minLat, maxLon, maxLat] = bboxEdges(bbox);
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

function readXy(pos) {
  if (!Array.isArray(pos) || pos.length < 2) return null;
  const lon = Number(pos[0]);
  const lat = Number(pos[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}

function sameXy(a, b, eps = 1e-12) {
  return Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps;
}

function segmentLength(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.hypot(dx, dy);
}

function clampToBbox(pos, bbox) {
  const [minLon, minLat, maxLon, maxLat] = bboxEdges(bbox);
  return [
    Math.min(maxLon, Math.max(minLon, pos[0])),
    Math.min(maxLat, Math.max(minLat, pos[1])),
  ];
}

/** Liang–Barsky segment clip. Inclusive edges. Null if no remainder or zero length. */
function clipSegmentToBbox(x0, y0, x1, y1, bbox) {
  const [xmin, ymin, xmax, ymax] = bboxEdges(bbox);
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x0 - xmin, xmax - x0, y0 - ymin, ymax - y0];
  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
      continue;
    }
    const r = q[i] / p[i];
    if (p[i] < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  const a = clampToBbox([x0 + t0 * dx, y0 + t0 * dy], bbox);
  const b = clampToBbox([x0 + t1 * dx, y0 + t1 * dy], bbox);
  if (segmentLength(a, b) === 0 || sameXy(a, b)) return null;
  return [a, b];
}

function clipLineParts(coords, bbox) {
  const parts = [];
  let current = [];
  const flush = () => {
    if (current.length >= 2) parts.push(current);
    current = [];
  };
  for (let i = 0; i < coords.length - 1; i += 1) {
    const a = readXy(coords[i]);
    const b = readXy(coords[i + 1]);
    if (!a || !b) {
      flush();
      continue;
    }
    const clipped = clipSegmentToBbox(a[0], a[1], b[0], b[1], bbox);
    if (!clipped) {
      flush();
      continue;
    }
    const [c0, c1] = clipped;
    if (current.length === 0) {
      current.push(c0, c1);
      continue;
    }
    const last = current[current.length - 1];
    if (sameXy(last, c0)) {
      if (!sameXy(last, c1)) current.push(c1);
    } else {
      flush();
      current.push(c0, c1);
    }
  }
  flush();
  return parts;
}

function lineGeometryFromParts(parts) {
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    return { type: "LineString", coordinates: parts[0] };
  }
  return { type: "MultiLineString", coordinates: parts };
}

function insideClipEdge(pos, edge, bbox) {
  const [xmin, ymin, xmax, ymax] = bboxEdges(bbox);
  if (edge === 0) return pos[0] >= xmin;
  if (edge === 1) return pos[0] <= xmax;
  if (edge === 2) return pos[1] >= ymin;
  return pos[1] <= ymax;
}

function intersectClipEdge(a, b, edge, bbox) {
  const [xmin, ymin, xmax, ymax] = bboxEdges(bbox);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (edge === 0) {
    const t = dx === 0 ? 0 : (xmin - a[0]) / dx;
    return clampToBbox([xmin, a[1] + t * dy], bbox);
  }
  if (edge === 1) {
    const t = dx === 0 ? 0 : (xmax - a[0]) / dx;
    return clampToBbox([xmax, a[1] + t * dy], bbox);
  }
  if (edge === 2) {
    const t = dy === 0 ? 0 : (ymin - a[1]) / dy;
    return clampToBbox([a[0] + t * dx, ymin], bbox);
  }
  const t = dy === 0 ? 0 : (ymax - a[1]) / dy;
  return clampToBbox([a[0] + t * dx, ymax], bbox);
}

function uniqueRingPoints(ring) {
  const out = [];
  for (const pos of ring) {
    const last = out[out.length - 1];
    if (!last || !sameXy(last, pos)) out.push(pos);
  }
  if (out.length >= 2 && sameXy(out[0], out[out.length - 1])) out.pop();
  return out;
}

function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return sum / 2;
}

/** Sutherland–Hodgman ring clip to an axis-aligned rectangle. Inclusive edges. */
function clipRingToBbox(ring, bbox) {
  let pts = [];
  for (const pos of ring) {
    const xy = readXy(pos);
    if (xy) pts.push(xy);
  }
  pts = uniqueRingPoints(pts);
  if (pts.length < 3) return null;
  for (let edge = 0; edge < 4; edge += 1) {
    if (pts.length === 0) return null;
    const input = pts;
    pts = [];
    let prev = input[input.length - 1];
    for (const cur of input) {
      const curIn = insideClipEdge(cur, edge, bbox);
      const prevIn = insideClipEdge(prev, edge, bbox);
      if (curIn) {
        if (!prevIn) pts.push(intersectClipEdge(prev, cur, edge, bbox));
        pts.push(cur);
      } else if (prevIn) {
        pts.push(intersectClipEdge(prev, cur, edge, bbox));
      }
      prev = cur;
    }
    pts = uniqueRingPoints(pts);
  }
  if (pts.length < 3) return null;
  const closed = [...pts, pts[0]];
  if (Math.abs(ringArea(closed)) === 0) return null;
  return closed;
}

function clipPolygonRings(rings, bbox) {
  if (!Array.isArray(rings) || rings.length === 0) return null;
  const exterior = clipRingToBbox(rings[0], bbox);
  if (!exterior) return null;
  const holes = [];
  for (let i = 1; i < rings.length; i += 1) {
    const hole = clipRingToBbox(rings[i], bbox);
    if (hole) holes.push(hole);
  }
  return [exterior, ...holes];
}

function clipPointGeometry(geometry, bbox) {
  const xy = readXy(geometry?.coordinates);
  if (!xy || !pointInBbox(xy[0], xy[1], bbox)) return null;
  return { type: "Point", coordinates: xy };
}

function clipMultiPointGeometry(geometry, bbox) {
  const coords = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
  const kept = [];
  for (const pos of coords) {
    const xy = readXy(pos);
    if (xy && pointInBbox(xy[0], xy[1], bbox)) kept.push(xy);
  }
  if (kept.length === 0) return null;
  if (kept.length === 1) return { type: "Point", coordinates: kept[0] };
  return { type: "MultiPoint", coordinates: kept };
}

function clipLineStringGeometry(geometry, bbox) {
  const coords = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
  return lineGeometryFromParts(clipLineParts(coords, bbox));
}

function clipMultiLineStringGeometry(geometry, bbox) {
  const lines = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
  const parts = [];
  for (const line of lines) {
    if (Array.isArray(line)) parts.push(...clipLineParts(line, bbox));
  }
  return lineGeometryFromParts(parts);
}

function clipPolygonGeometry(geometry, bbox) {
  const rings = clipPolygonRings(geometry?.coordinates, bbox);
  if (!rings) return null;
  return { type: "Polygon", coordinates: rings };
}

function clipMultiPolygonGeometry(geometry, bbox) {
  const polys = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
  const kept = [];
  for (const poly of polys) {
    const rings = clipPolygonRings(poly, bbox);
    if (rings) kept.push(rings);
  }
  if (kept.length === 0) return null;
  if (kept.length === 1) return { type: "Polygon", coordinates: kept[0] };
  return { type: "MultiPolygon", coordinates: kept };
}

function clipGeometryCollection(geometry, bbox) {
  const members = Array.isArray(geometry?.geometries) ? geometry.geometries : [];
  const kept = [];
  for (const member of members) {
    const clipped = clipGeometryToBbox(member, bbox);
    if (clipped) kept.push(clipped);
  }
  if (kept.length === 0) return null;
  return { type: "GeometryCollection", geometries: kept };
}

/**
 * Clip a GeoJSON geometry to an axis-aligned bbox. Edges are inclusive.
 * Returns a new geometry, or null when nothing remains.
 */
export function clipGeometryToBbox(geometry, bbox = ACEH_BBOX) {
  if (!geometry || typeof geometry !== "object") return null;
  switch (geometry.type) {
    case "Point":
      return clipPointGeometry(geometry, bbox);
    case "MultiPoint":
      return clipMultiPointGeometry(geometry, bbox);
    case "LineString":
      return clipLineStringGeometry(geometry, bbox);
    case "MultiLineString":
      return clipMultiLineStringGeometry(geometry, bbox);
    case "Polygon":
      return clipPolygonGeometry(geometry, bbox);
    case "MultiPolygon":
      return clipMultiPolygonGeometry(geometry, bbox);
    case "GeometryCollection":
      return clipGeometryCollection(geometry, bbox);
    default:
      return null;
  }
}

/**
 * Clip each feature geometry to bbox. Does not mutate `collection`.
 * Drops features whose clipped geometry is null or degenerate.
 */
export function clipFeatureCollectionToBbox(collection, bbox = ACEH_BBOX) {
  const src = collection && typeof collection === "object" ? collection : {};
  const features = Array.isArray(src.features) ? src.features : [];
  const next = [];
  for (const feature of features) {
    const geometry = clipGeometryToBbox(feature?.geometry, bbox);
    if (!geometry) continue;
    const copy = {
      type: "Feature",
      properties:
        feature?.properties && typeof feature.properties === "object"
          ? { ...feature.properties }
          : {},
      geometry,
    };
    if (feature && Object.hasOwn(feature, "id")) copy.id = feature.id;
    next.push(copy);
  }
  return {
    ...src,
    type: "FeatureCollection",
    features: next,
  };
}

export function overlayLayerChecksum(features) {
  return createHash("sha256")
    .update(JSON.stringify(features ?? []), "utf8")
    .digest("hex");
}

export function overlayLayerStats(collection) {
  const features = Array.isArray(collection?.features) ? collection.features : [];
  return {
    featureCount: features.length,
    checksum: overlayLayerChecksum(features),
  };
}

/** Prefer layers[key].featureCount; fall back to legacy counts[key]. */
export function previousOverlayCounts(manifest) {
  if (!manifest || typeof manifest !== "object") return null;
  const fromLayers = {};
  if (manifest.layers && typeof manifest.layers === "object") {
    for (const [key, layer] of Object.entries(manifest.layers)) {
      const n = Number(layer?.featureCount);
      if (Number.isFinite(n)) fromLayers[key] = n;
    }
  }
  if (Object.keys(fromLayers).length > 0) return fromLayers;
  if (manifest.counts && typeof manifest.counts === "object") {
    const fromCounts = {};
    for (const [key, value] of Object.entries(manifest.counts)) {
      const n = Number(value);
      if (Number.isFinite(n)) fromCounts[key] = n;
    }
    if (Object.keys(fromCounts).length > 0) return fromCounts;
  }
  return null;
}

/**
 * Gate Ruang Kita static ETL before fixtures are written.
 * Count 0 always fails. A drop above 40% fails unless force is set.
 */
export function assessOverlayFeatureCounts(currentCounts, previousCounts, opts = {}) {
  const force = opts.force === true;
  const errors = [];
  for (const [key, raw] of Object.entries(currentCounts ?? {})) {
    const count = Number(raw);
    if (!Number.isFinite(count) || count <= 0) {
      errors.push(
        `${key}: feature count ${raw} (empty layer is not a successful scrape)`,
      );
      continue;
    }
    const prev = Number(previousCounts?.[key]);
    if (!Number.isFinite(prev) || prev <= 0) continue;
    const drop = (prev - count) / prev;
    if (drop > OVERLAY_ETL_DROP_THRESHOLD && !force) {
      errors.push(
        `${key}: feature count dropped ${(drop * 100).toFixed(1)}% (${prev} → ${count}); set FORCE_OVERLAY_ETL=1 to override`,
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Same ImageServer origin as src/lib/inarisk-tiles.ts. */
export const INARISK_IMAGE_ORIGIN =
  "https://gis.bnpb.go.id/server/rest/services/inarisk";

export const INARISK_BAHAYA_EXPORT_SIZE = { width: 660, height: 830 };

/** Offline ETL only — refuse a single envelope image larger than 8 MiB. */
export const INARISK_BAHAYA_MAX_PNG_BYTES = 8 * 1024 * 1024;

/** Slack above the locked 660×830 export so a slightly larger retry still decodes. */
export const INARISK_BAHAYA_MAX_PIXELS =
  INARISK_BAHAYA_EXPORT_SIZE.width * INARISK_BAHAYA_EXPORT_SIZE.height * 2;

export function assertBahayaPngSize(buf) {
  const len = buf?.byteLength ?? 0;
  if (len > INARISK_BAHAYA_MAX_PNG_BYTES) {
    throw new Error(`InaRISK bahaya PNG too large (${len} bytes)`);
  }
  return buf;
}

export const INARISK_BAHAYA_SIMPLIFY_EPS = 0.003;

export const INARISK_BAHAYA_FILL = {
  sedang: "#C4A35A",
  tinggi: "#B42318",
};

export const INARISK_BAHAYA_LAYERS = [
  {
    key: "inariskBahayaGempa",
    service: "layer_bahaya_gempabumi",
    file: "bahaya-gempa-aceh.geojson",
    title: "Bahaya gempa",
  },
  {
    key: "inariskBahayaTsunami",
    service: "layer_bahaya_tsunami",
    file: "bahaya-tsunami-aceh.geojson",
    title: "Bahaya tsunami",
  },
  {
    key: "inariskBahayaLongsor",
    service: "layer_bahaya_tanah_longsor",
    file: "bahaya-longsor-aceh.geojson",
    title: "Bahaya longsor",
  },
  {
    key: "inariskBahayaBanjir",
    service: "layer_bahaya_banjir",
    file: "bahaya-banjir-aceh.geojson",
    title: "Bahaya banjir",
  },
  {
    key: "inariskBahayaKarhutla",
    service: "layer_bahaya_kebakaran_hutan_dan_lahan",
    file: "bahaya-karhutla-aceh.geojson",
    title: "Bahaya karhutla",
  },
  {
    key: "inariskBahayaGunungApi",
    service: "layer_bahaya_letusan_gunungapi",
    file: "bahaya-gunungapi-aceh.geojson",
    title: "Bahaya gunung api",
  },
];

export function inariskBahayaExportUrl(
  service,
  size = INARISK_BAHAYA_EXPORT_SIZE,
) {
  const [xmin, ymin, xmax, ymax] = ACEH_BBOX;
  const params = new URLSearchParams({
    bbox: `${xmin},${ymin},${xmax},${ymax}`,
    bboxSR: "4326",
    imageSR: "4326",
    size: `${size.width},${size.height}`,
    format: "png32",
    f: "image",
    transparent: "true",
    interpolation: "RSP_NearestNeighbor",
  });
  return `${INARISK_IMAGE_ORIGIN}/${service}/ImageServer/exportImage?${params.toString()}`;
}

export function classifyInariskPixel(r, g, b, a) {
  if (a < 16) return 0;
  if (Math.abs(r - g) <= 3 && Math.abs(g - b) <= 3) {
    if (r === 2) return 2;
    if (r >= 3 && r <= 10) return 3;
    return 0;
  }
  if (r >= 180 && g < 80 && b < 80) return 3;
  if (r >= 180 && g >= 80 && g < 210 && b < 80) return 2;
  return 0;
}

export function classifyInariskPixels(rgba, width, height) {
  const values = new Uint8Array(width * height);
  for (let i = 0; i < values.length; i++) {
    const o = i * 4;
    values[i] = classifyInariskPixel(rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]);
  }
  return values;
}

function pngPaeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function pngBytesPerPixel(colorType, bitDepth) {
  if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${bitDepth}`);
  if (colorType === 0) return 1;
  if (colorType === 2) return 3;
  if (colorType === 3) return 1;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  throw new Error(`unsupported PNG color type ${colorType}`);
}

function pngUnfilter(inflated, width, height, bpp) {
  const stride = width * bpp;
  const raw = Buffer.alloc(height * stride);
  let src = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = inflated[src++];
    const row = inflated.subarray(src, src + stride);
    src += stride;
    const out = raw.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const x = row[i];
      const left = i >= bpp ? out[i - bpp] : 0;
      const up = prev[i];
      const upLeft = i >= bpp ? prev[i - bpp] : 0;
      let val = x;
      if (filter === 1) val = (x + left) & 255;
      else if (filter === 2) val = (x + up) & 255;
      else if (filter === 3) val = (x + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) val = (x + pngPaeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`PNG filter ${filter}`);
      out[i] = val;
    }
    prev = Buffer.from(out);
  }
  return raw;
}

function pngToRgba(raw, width, height, colorType, palette, trans) {
  const n = width * height;
  const rgba = Buffer.alloc(n * 4);
  if (colorType === 6) {
    raw.copy(rgba);
    return rgba;
  }
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (colorType === 2) {
      rgba[o] = raw[i * 3];
      rgba[o + 1] = raw[i * 3 + 1];
      rgba[o + 2] = raw[i * 3 + 2];
      rgba[o + 3] = 255;
    } else if (colorType === 0) {
      const v = raw[i];
      rgba[o] = v;
      rgba[o + 1] = v;
      rgba[o + 2] = v;
      rgba[o + 3] = 255;
    } else if (colorType === 4) {
      const v = raw[i * 2];
      rgba[o] = v;
      rgba[o + 1] = v;
      rgba[o + 2] = v;
      rgba[o + 3] = raw[i * 2 + 1];
    } else if (colorType === 3) {
      const idx = raw[i];
      rgba[o] = palette[idx * 3];
      rgba[o + 1] = palette[idx * 3 + 1];
      rgba[o + 2] = palette[idx * 3 + 2];
      rgba[o + 3] = trans && trans.length > idx ? trans[idx] : 255;
    }
  }
  return rgba;
}

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function decodePngRgba(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error("not a PNG");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  let palette = null;
  let trans = null;
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    offset += 12 + len;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (width * height > INARISK_BAHAYA_MAX_PIXELS) {
        throw new Error(`PNG IHDR exceeds InaRISK bahaya envelope (${width}x${height})`);
      }
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      trans = data;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  if (!width || !height) throw new Error("PNG missing IHDR");
  const bpp = pngBytesPerPixel(colorType, bitDepth);
  const inflated = inflateSync(Buffer.concat(idat));
  const raw = pngUnfilter(inflated, width, height, bpp);
  return { width, height, rgba: pngToRgba(raw, width, height, colorType, palette, trans) };
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

/** Test helper: 8-bit RGBA PNG, filter 0. */
export function encodePngRgba(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba).copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    PNG_SIG,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function simplifyRing(ring, epsilon = INARISK_BAHAYA_SIMPLIFY_EPS) {
  if (!Array.isArray(ring) || ring.length <= 4) {
    return ring ? ring.map((p) => [p[0], p[1]]) : [];
  }
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const pts = closed ? ring.slice(0, -1) : ring.slice();
  const keep = douglasPeucker(pts, epsilon);
  if (keep.length < 3) return [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1], pts[0]];
  const out = keep.map((p) => [p[0], p[1]]);
  out.push([out[0][0], out[0][1]]);
  return out;
}

function douglasPeucker(pts, epsilon) {
  if (pts.length <= 2) return pts.slice();
  let maxD = 0;
  let idx = 0;
  const a = pts[0];
  const b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpendicularDistance(pts[i], a, b);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= epsilon) return [a, b];
  const left = douglasPeucker(pts.slice(0, idx + 1), epsilon);
  const right = douglasPeucker(pts.slice(idx), epsilon);
  return left.slice(0, -1).concat(right);
}

function perpendicularDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function gridToLonLat(x, y, width, height, bbox) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return [
    minLon + (x / width) * (maxLon - minLon),
    maxLat - (y / height) * (maxLat - minLat),
  ];
}

function outlineCells(cells, width, height, bbox) {
  const edges = new Map();
  const add = (x1, y1, x2, y2) => {
    const key =
      x1 < x2 || (x1 === x2 && y1 < y2)
        ? `${x1},${y1},${x2},${y2}`
        : `${x2},${y2},${x1},${y1}`;
    if (edges.has(key)) edges.delete(key);
    else edges.set(key, [[x1, y1], [x2, y2]]);
  };
  for (const i of cells) {
    const x = i % width;
    const y = (i - x) / width;
    add(x, y, x + 1, y);
    add(x + 1, y, x + 1, y + 1);
    add(x + 1, y + 1, x, y + 1);
    add(x, y + 1, x, y);
  }
  const nodeKey = (p) => `${p[0]},${p[1]}`;
  const adj = new Map();
  for (const [a, b] of edges.values()) {
    const ka = nodeKey(a);
    const kb = nodeKey(b);
    if (!adj.has(ka)) adj.set(ka, []);
    if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka).push(b);
    adj.get(kb).push(a);
  }
  let start = null;
  for (const k of adj.keys()) {
    const [x, y] = k.split(",").map(Number);
    if (!start || y < start[1] || (y === start[1] && x < start[0])) start = [x, y];
  }
  if (!start) return null;
  const used = new Set();
  const ringPx = [start];
  let cur = start;
  let prev = null;
  for (let n = 0; n < edges.size + 2; n++) {
    const neighbors = adj.get(nodeKey(cur)) ?? [];
    let next = null;
    for (const cand of neighbors) {
      if (prev && cand[0] === prev[0] && cand[1] === prev[1]) continue;
      const dk = `${nodeKey(cur)}>${nodeKey(cand)}`;
      if (used.has(dk)) continue;
      next = cand;
      used.add(dk);
      break;
    }
    if (!next) break;
    if (next[0] === start[0] && next[1] === start[1]) {
      ringPx.push(start);
      break;
    }
    ringPx.push(next);
    prev = cur;
    cur = next;
  }
  if (ringPx.length < 4) return null;
  return ringPx.map((p) => gridToLonLat(p[0], p[1], width, height, bbox));
}

export function polygonizeClassGrid(values, width, height, bbox = ACEH_BBOX) {
  const visited = new Uint8Array(values.length);
  const byClass = { 2: [], 3: [] };
  for (let i = 0; i < values.length; i++) {
    const k = values[i];
    if ((k !== 2 && k !== 3) || visited[i]) continue;
    const cells = [];
    const stack = [i];
    visited[i] = 1;
    while (stack.length) {
      const cur = stack.pop();
      cells.push(cur);
      const x = cur % width;
      const y = (cur - x) / width;
      const tryN = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
        const ni = ny * width + nx;
        if (visited[ni] || values[ni] !== k) return;
        visited[ni] = 1;
        stack.push(ni);
      };
      tryN(x + 1, y);
      tryN(x - 1, y);
      tryN(x, y + 1);
      tryN(x, y - 1);
    }
    const ring = outlineCells(cells, width, height, bbox);
    if (!ring) continue;
    const simple = simplifyRing(ring);
    if (simple.length >= 4) byClass[k].push(simple);
  }
  return byClass;
}

export function tagBahayaProperties({ layer, title, kelas }) {
  return {
    layer,
    title,
    kelas,
    fillColor: kelas === "tinggi" ? INARISK_BAHAYA_FILL.tinggi : INARISK_BAHAYA_FILL.sedang,
  };
}

export function bahayaCollectionFromGrid(values, width, height, opts) {
  const bbox = opts.bbox ?? ACEH_BBOX;
  const groups = polygonizeClassGrid(values, width, height, bbox);
  const features = [];
  for (const [value, rings] of [
    [2, groups[2]],
    [3, groups[3]],
  ]) {
    if (!rings.length) continue;
    const kelas = value === 2 ? "sedang" : "tinggi";
    const coords = rings.map((ring) => [ring]);
    features.push({
      type: "Feature",
      properties: tagBahayaProperties({
        layer: opts.layer,
        title: opts.title,
        kelas,
      }),
      geometry:
        coords.length === 1
          ? { type: "Polygon", coordinates: coords[0] }
          : { type: "MultiPolygon", coordinates: coords },
    });
  }
  return { type: "FeatureCollection", features };
}

export function prepareBahayaLayer(pngBuffer, spec, bbox = ACEH_BBOX) {
  const { width, height, rgba } = decodePngRgba(pngBuffer);
  const values = classifyInariskPixels(rgba, width, height);
  const raw = bahayaCollectionFromGrid(values, width, height, {
    bbox,
    layer: spec.key ?? spec.layer,
    title: spec.title,
  });
  return clipFeatureCollectionToBbox(raw, bbox);
}

export function bahayaEmptyLayerKeys(prepared) {
  return prepared
    .filter((item) => !item.clipped?.features?.length)
    .map((item) => item.spec.key ?? item.spec.layer);
}
