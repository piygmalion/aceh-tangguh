/** Coordinate quality flags on marker GeoJSON properties. */

/** Integer lon in {95,96,97,98} — truncated GPS degree, not inventable. */
export const COORD_QUALITY_TRUNCATED = "truncated";
/** Legacy fixture / seed flag; treat as the same truncated quality on read. */
export const COORD_QUALITY_TRUNCATED_INTEGER = "truncated_integer";
export const COORD_QUALITY_OFFSHORE = "offshore_or_out_of_bbox";

export type CoordQuality =
  | typeof COORD_QUALITY_TRUNCATED
  | typeof COORD_QUALITY_TRUNCATED_INTEGER
  | typeof COORD_QUALITY_OFFSHORE;

/** Aceh integer-degree longitudes that are approx/invalid GPS truncations. */
export const TRUNCATED_INTEGER_LONS = new Set([95, 96, 97, 98]);

export function isIntegerCoordinate(value: unknown): boolean {
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n);
}

/** True when longitude is an integer in {95, 96, 97, 98}. */
export function isTruncatedAcehLongitude(lon: unknown): boolean {
  const n = Number(lon);
  return Number.isFinite(n) && Number.isInteger(n) && TRUNCATED_INTEGER_LONS.has(n);
}

/** True when lon or lat is an integer after Number() — truncated GPS, not inventable. */
export function hasTruncatedIntegerCoord(lon: unknown, lat: unknown): boolean {
  return isIntegerCoordinate(lon) || isIntegerCoordinate(lat);
}

export function isTruncatedCoordQuality(
  value: unknown
): value is typeof COORD_QUALITY_TRUNCATED | typeof COORD_QUALITY_TRUNCATED_INTEGER {
  return value === COORD_QUALITY_TRUNCATED || value === COORD_QUALITY_TRUNCATED_INTEGER;
}

export function readCoordQuality(
  properties?: Record<string, unknown> | null
): CoordQuality | null {
  const q = properties?.coord_quality ?? properties?.coordQuality;
  if (isTruncatedCoordQuality(q)) {
    return COORD_QUALITY_TRUNCATED;
  }
  if (q === COORD_QUALITY_OFFSHORE) {
    return q;
  }
  return null;
}

/**
 * Flag policeOffices whose stored longitude is an integer degree in {95,96,97,98}.
 * Keeps every row and does not snap, jitter, or invent lon/lat.
 */
export function annotatePoliceOfficeCoordQuality<T extends {
  geometry?: { type?: string; coordinates?: unknown } | null;
  properties?: Record<string, unknown> | null;
}>(feature: T): T {
  const layer = feature.properties?.layer;
  if (layer !== "policeOffices") return feature;

  const geom = feature.geometry;
  if (!geom || geom.type !== "Point" || !Array.isArray(geom.coordinates)) {
    return feature;
  }

  const lon = geom.coordinates[0];
  if (!isTruncatedAcehLongitude(lon)) return feature;

  const existing = feature.properties?.coord_quality;
  if (existing === COORD_QUALITY_OFFSHORE) return feature;
  if (existing === COORD_QUALITY_TRUNCATED) return feature;

  return {
    ...feature,
    geometry: geom,
    properties: {
      ...(feature.properties ?? {}),
      coord_quality: COORD_QUALITY_TRUNCATED,
    },
  };
}

export function shouldShowApproxCoordNote(
  properties?: Record<string, unknown> | null
): boolean {
  const q = readCoordQuality(properties);
  return q === COORD_QUALITY_TRUNCATED || q === COORD_QUALITY_OFFSHORE;
}
