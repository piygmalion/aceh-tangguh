/** Operational AOI — overlay ETL, MAGMA, Sentinel, weather inovasi. Not an admin boundary. */
export const ACEH_BBOX: [number, number, number, number] = [95.0, 2.0, 98.3, 6.15];

/** Wider envelope for citizen-report GPS only. Do not clip overlay or WN3 with this. */
export const ACEH_BOUNDS_LAPORAN = {
  latMin: 1.5,
  latMax: 6.5,
  lonMin: 95.0,
  lonMax: 98.5,
} as const;
