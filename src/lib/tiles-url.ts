/**
 * Public PMTiles URL helpers.
 *
 * Overlay choropleth archives stay on disk at `/tiles/...` unless
 * `NEXT_PUBLIC_TILES_BASE_URL` points at an S3/R2 public prefix.
 * The optional Aceh OSM basemap extract is a separate archive
 * (`aceh-osm.pmtiles`) — never a self-hosted planet extract.
 */

export const ACEH_OSM_PMTILES_FILENAME = "aceh-osm.pmtiles";
export const ACEH_OSM_PMTILES_LOCAL_PATH = "/tiles/aceh-osm.pmtiles";

/** OpenMapTiles source-layers required by brand presets (`basemap-presets.ts`). */
export const ACEH_OSM_REQUIRED_LAYERS = [
  "landcover",
  "water",
  "waterway",
  "building",
  "transportation",
  "boundary",
  "place",
  "water_name",
  "transportation_name",
] as const;

/** Extra OpenMapTiles layers the brand style paints when present. */
export const ACEH_OSM_OPTIONAL_LAYERS = ["landuse", "park"] as const;

export const OVERLAY_PMTILES_FILES = {
  kecamatan: "kecamatan-r3p.pmtiles",
  village: "village-r3p.pmtiles",
  irbi: "irbi-2025.pmtiles",
} as const;

/** Public object-store prefix (no trailing slash). Empty = serve from `/tiles`. */
export function publicTilesBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_TILES_BASE_URL ?? "").trim().replace(/\/+$/, "");
}

/** Strip a `/tiles/` prefix or leading slash so `{base}/{filename}` is stable. */
export function overlayPmtilesFilename(pathOrName: string): string {
  return pathOrName.replace(/^\/tiles\//, "").replace(/^\//, "");
}

/**
 * Overlay (or Aceh OSM) PMTiles URL.
 * Default remains `/tiles/<file>`. When `NEXT_PUBLIC_TILES_BASE_URL` is set,
 * returns `{base}/{filename}` (absolute https or protocol-relative).
 */
export function overlayPmtilesUrl(pathOrName: string): string {
  const name = overlayPmtilesFilename(pathOrName);
  const base = publicTilesBaseUrl();
  if (base) return `${base}/${name}`;
  return `/tiles/${name}`;
}

/** Explicit Aceh extract URL from env, or null to keep OpenFreeMap / Carto. */
export function configuredAcehOsmPmtilesUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES?.trim();
  return raw || null;
}

/**
 * MapLibre vector source URL. PMTiles archives need the `pmtiles://` protocol
 * (registered in MapViewport). TileJSON URLs (OpenFreeMap planet) stay as-is.
 */
export function toMapLibreVectorSourceUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("pmtiles://")) return trimmed;
  if (/\.pmtiles(\?|#|$)/i.test(trimmed)) return `pmtiles://${trimmed}`;
  return trimmed;
}
