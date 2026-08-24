import type { BasemapId } from "./types";

export const BASEMAP_IDS: BasemapId[] = [
  "positron",
  "dark",
  "streets",
  "satellite",
  "sentinel",
];

export function isBasemapId(value: string | null | undefined): value is BasemapId {
  return !!value && (BASEMAP_IDS as string[]).includes(value);
}

/** Aceh operational AOI — used for STAC scans, not for clamping the map camera. */
export const ACEH_BBOX: [number, number, number, number] = [95.0, 2.0, 98.3, 6.15];

const OPENFREEMAP_GLYPHS =
  "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

/** EOX Sentinel-2 cloudless 2024 (WebMercator WMTS). Template is z/y/x. */
export const SENTINEL_CLOUDLESS_TILES =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg";

export const SENTINEL_CLOUDLESS_YEAR = 2024;

export type BasemapKind = "raster" | "imagery";

export type BasemapOption = {
  id: BasemapId;
  labelKey: string;
  kind: BasemapKind;
};

export const BASEMAP_OPTIONS: BasemapOption[] = [
  { id: "positron", labelKey: "basemapPositron", kind: "raster" },
  { id: "dark", labelKey: "basemapDark", kind: "raster" },
  { id: "streets", labelKey: "basemapStreets", kind: "raster" },
  { id: "satellite", labelKey: "basemapSatellite", kind: "imagery" },
  { id: "sentinel", labelKey: "basemapSentinel", kind: "imagery" },
];

export type BasemapStyle = string | Record<string, unknown>;

function rasterStyle(opts: {
  name: string;
  tiles: string[];
  attribution: string;
  maxzoom?: number;
}): Record<string, unknown> {
  return {
    version: 8,
    name: opts.name,
    glyphs: OPENFREEMAP_GLYPHS,
    sources: {
      raster: {
        type: "raster",
        tiles: opts.tiles,
        tileSize: 256,
        maxzoom: opts.maxzoom ?? 19,
        attribution: opts.attribution,
      },
    },
    layers: [
      {
        id: "raster",
        type: "raster",
        source: "raster",
        minzoom: 0,
        maxzoom: 24,
      },
    ],
  };
}

/**
 * Optional OpenFreeMap vector styles. Not the default — the sandbox has already
 * failed to load this CDN (empty map). Enable with `?vector=1`; Carto raster is
 * the fallback if the style fetch fails.
 */
export const BASEMAP_VECTOR_URLS: Partial<Record<BasemapId, string>> = {
  positron: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
  streets: "https://tiles.openfreemap.org/styles/liberty",
};

/** Default operational styles: Carto/OSM raster XYZ, Esri, Sentinel-2 Cloudless. */
export const BASEMAP_RASTER: Record<BasemapId, BasemapStyle> = {
  positron: rasterStyle({
    name: "positron-raster",
    tiles: [
      "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    ],
    attribution: "© CARTO © OpenStreetMap",
  }),
  dark: rasterStyle({
    name: "dark-raster",
    tiles: [
      "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    ],
    attribution: "© CARTO © OpenStreetMap",
  }),
  streets: rasterStyle({
    name: "streets-raster",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "© OpenStreetMap contributors",
  }),
  satellite: rasterStyle({
    name: "satellite",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution: "Tiles © Esri",
  }),
  sentinel: rasterStyle({
    name: "sentinel-s2cloudless-2024",
    tiles: [SENTINEL_CLOUDLESS_TILES],
    attribution:
      "Sentinel-2 cloudless © EOX (modified Copernicus Sentinel data 2024)",
    maxzoom: 14,
  }),
};

/** @deprecated Alias — raster is the default, not a fallback. */
export const BASEMAP_RASTER_FALLBACKS = BASEMAP_RASTER;

export function getBasemapStyle(
  id: BasemapId,
  opts?: { preferVector?: boolean; rasterFallback?: boolean }
): BasemapStyle {
  // rasterFallback kept so older call sites that meant “use Carto” still work.
  const useVector = opts?.preferVector === true && opts?.rasterFallback !== true;
  if (useVector) {
    const vector = BASEMAP_VECTOR_URLS[id];
    if (vector) return vector;
  }
  return BASEMAP_RASTER[id];
}

/** Default export used by the map: Carto/OSM rasters + imagery. */
export const BASEMAP_STYLES: Record<BasemapId, BasemapStyle> = { ...BASEMAP_RASTER };
