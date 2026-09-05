/**
 * Pure helpers for the Ruang Kita static ETL.
 * Runtime map never hits ruangkita.net — this is offline ingest only.
 */

import { createHash } from "node:crypto";
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
