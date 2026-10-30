/**
 * Public PMTiles URL helpers.
 *
 * Overlay choropleth archives stay on disk at `/tiles/...` unless
 * `NEXT_PUBLIC_TILES_BASE_URL` points at an S3/R2 public prefix.
 * The Aceh basemap extract is a separate archive (`aceh-osm.pmtiles`).
 * It is bundled at `/tiles/aceh-osm.pmtiles` (served by Vercel with HTTP
 * Range). `NEXT_PUBLIC_BASEMAP_PMTILES_URL` overrides it (R2/CDN later) —
 * never a planet file and never a public OSM raster.
 */

import { withBasePath } from "./preview/env";

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

/**
 * Public basemap archive. `NEXT_PUBLIC_BASEMAP_PMTILES_URL` is the CDN/R2 URL
 * (HTTP Range). `NEXT_PUBLIC_ACEH_OSM_PMTILES` remains a legacy alias.
 * Returns null when neither env is set; see `basemapPmtilesUrl` for the
 * bundled default.
 */
export function configuredBasemapPmtilesUrl(): string | null {
  const primary = process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL?.trim();
  if (primary) return primary;
  const legacy = process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES?.trim();
  return legacy || null;
}

/**
 * Bundled archive URL. The pmtiles protocol needs an absolute URL, so in the
 * browser `/tiles/aceh-osm.pmtiles` is resolved against
 * `window.location.origin`. On the server (no window) the base-path-relative
 * path is returned; the map only fetches tiles in the browser.
 */
export function bundledBasemapPmtilesUrl(): string {
  const path = withBasePath(ACEH_OSM_PMTILES_LOCAL_PATH);
  if (typeof window === "undefined" || !window.location?.origin) return path;
  return new URL(path, window.location.origin).href;
}

/**
 * Basemap archive the map loads: env override (R2/CDN) first, otherwise the
 * archive bundled with the deployment. If it fails to load, the map paints
 * the theme canvas — never a public OSM or Carto server.
 */
export function basemapPmtilesUrl(): string {
  return configuredBasemapPmtilesUrl() ?? bundledBasemapPmtilesUrl();
}

/** @deprecated Use `configuredBasemapPmtilesUrl`. */
export function configuredAcehOsmPmtilesUrl(): string | null {
  return configuredBasemapPmtilesUrl();
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
