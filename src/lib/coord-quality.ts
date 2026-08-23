/** Coordinate quality flags on marker GeoJSON properties. */

export const COORD_QUALITY_TRUNCATED = "truncated_integer";
export const COORD_QUALITY_OFFSHORE = "offshore_or_out_of_bbox";

export type CoordQuality =
  | typeof COORD_QUALITY_TRUNCATED
  | typeof COORD_QUALITY_OFFSHORE;

export function isIntegerCoordinate(value: unknown): boolean {
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n);
}

/** True when lon or lat is an integer after Number() — truncated GPS, not inventable. */
export function hasTruncatedIntegerCoord(lon: unknown, lat: unknown): boolean {
  return isIntegerCoordinate(lon) || isIntegerCoordinate(lat);
}

export function readCoordQuality(
  properties?: Record<string, unknown> | null
): CoordQuality | null {
  const q = properties?.coord_quality;
  if (q === COORD_QUALITY_TRUNCATED || q === COORD_QUALITY_OFFSHORE) {
    return q;
  }
  return null;
}

export function shouldShowApproxCoordNote(
  properties?: Record<string, unknown> | null
): boolean {
  const q = readCoordQuality(properties);
  return q === COORD_QUALITY_TRUNCATED || q === COORD_QUALITY_OFFSHORE;
}
