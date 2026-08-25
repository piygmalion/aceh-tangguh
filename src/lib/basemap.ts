import type { BasemapId, BrandBasemapId, RasterBasemapId } from "./types";
import {
  BRAND_BASEMAP_IDS,
  OPENFREEMAP_GLYPHS,
  buildBrandBasemapStyle,
  isBrandBasemapId,
} from "./basemap-presets";

export { BRAND_BASEMAP_IDS, isBrandBasemapId, OPENFREEMAP_GLYPHS };

export const RASTER_BASEMAP_IDS: RasterBasemapId[] = [
  "positron",
  "dark",
  "streets",
  "satellite",
  "sentinel",
];

export const BASEMAP_IDS: BasemapId[] = [
  ...RASTER_BASEMAP_IDS,
  ...BRAND_BASEMAP_IDS,
];

export function isBasemapId(value: string | null | undefined): value is BasemapId {
  return !!value && (BASEMAP_IDS as string[]).includes(value);
}

/** Aceh operational AOI — used for STAC scans, not for clamping the map camera. */
export const ACEH_BBOX: [number, number, number, number] = [95.0, 2.0, 98.3, 6.15];

/** EOX Sentinel-2 cloudless 2024 (WebMercator WMTS). Template is z/y/x. */
export const SENTINEL_CLOUDLESS_TILES =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg";

export const SENTINEL_CLOUDLESS_YEAR = 2024;

export type BasemapKind = "raster" | "imagery" | "vector";

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
  { id: "brand-light", labelKey: "basemapBrandLight", kind: "vector" },
  { id: "brand-dark", labelKey: "basemapBrandDark", kind: "vector" },
  { id: "brand-grey", labelKey: "basemapBrandGrey", kind: "vector" },
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
export const BASEMAP_RASTER: Record<RasterBasemapId, BasemapStyle> = {
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

/** Carto raster to use if a brand vector style/source fails. */
export const BRAND_RASTER_FALLBACK: Record<BrandBasemapId, RasterBasemapId> = {
  "brand-light": "positron",
  "brand-dark": "dark",
  "brand-grey": "positron",
};

export const BASEMAP_BRAND: Record<BrandBasemapId, BasemapStyle> = {
  "brand-light": buildBrandBasemapStyle("brand-light"),
  "brand-dark": buildBrandBasemapStyle("brand-dark"),
  "brand-grey": buildBrandBasemapStyle("brand-grey"),
};

export function getBasemapStyle(
  id: BasemapId,
  opts?: { preferVector?: boolean; rasterFallback?: boolean }
): BasemapStyle {
  if (isBrandBasemapId(id)) {
    if (opts?.rasterFallback === true) {
      return BASEMAP_RASTER[BRAND_RASTER_FALLBACK[id]];
    }
    return BASEMAP_BRAND[id];
  }
  // rasterFallback kept so older call sites that meant “use Carto” still work.
  const useVector = opts?.preferVector === true && opts?.rasterFallback !== true;
  if (useVector) {
    const vector = BASEMAP_VECTOR_URLS[id];
    if (vector) return vector;
  }
  return BASEMAP_RASTER[id];
}

/** Default export used by the map: Carto rasters stay default; brand styles are extra. */
export const BASEMAP_STYLES: Record<BasemapId, BasemapStyle> = {
  ...BASEMAP_RASTER,
  ...BASEMAP_BRAND,
};
