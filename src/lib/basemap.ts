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
  if (!value || !(BASEMAP_IDS as string[]).includes(value)) return false;
  if (value === "dark" && !cartoBasemapKeyPresent()) return false;
  return true;
}

export function normalizeBasemapId(value: string | null | undefined): BasemapId {
  return isBasemapId(value) ? value : "positron";
}

/** Picker list. Gelap is omitted while dark Carto tiles cannot load. */
export function visibleBasemapOptions(): BasemapOption[] {
  return BASEMAP_OPTIONS.filter((option) => isBasemapId(option.id));
}

/**
 * Legacy `?basemap=dark` without a Carto key becomes positron.
 * Returns null when the query should stay as written.
 */
export function rewriteHiddenDarkBasemap(search: string): string | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  if (params.get("basemap") !== "dark" || isBasemapId("dark")) return null;
  params.set("basemap", "positron");
  return params.toString();
}

/** Aceh operational AOI — used for STAC scans, not for clamping the map camera. */
export { ACEH_BBOX } from "./aceh-scope";

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
 * failed to load this CDN (empty map). Enable with `?vector=1`. Raster fallback
 * is keyed Carto, or OSM.org if `NEXT_PUBLIC_CARTO_API_KEY` is unset (unkeyed
 * Carto tiles are watermarked).
 */
export const BASEMAP_VECTOR_URLS: Partial<Record<BasemapId, string>> = {
  positron: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
  streets: "https://tiles.openfreemap.org/styles/liberty",
};

const OSM_RASTER_TILES = ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"];
const OSM_RASTER_ATTRIBUTION = "© OpenStreetMap contributors";

/** Browser-visible Carto basemap key. Never log the value. */
export function cartoBasemapKeyPresent(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim());
}

function cartoTileUrls(style: "light_all" | "dark_all"): string[] {
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() ?? "";
  const q = `?key=${encodeURIComponent(key)}`;
  return ["a", "b", "c"].map(
    (s) => `https://${s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png${q}`
  );
}

function cartoOrOsmRaster(opts: {
  name: string;
  cartoStyle: "light_all" | "dark_all";
}): Record<string, unknown> {
  if (cartoBasemapKeyPresent()) {
    return rasterStyle({
      name: opts.name,
      tiles: cartoTileUrls(opts.cartoStyle),
      attribution: "© CARTO © OpenStreetMap",
    });
  }
  return rasterStyle({
    name: opts.name,
    tiles: OSM_RASTER_TILES,
    attribution: OSM_RASTER_ATTRIBUTION,
  });
}

const STATIC_RASTER = {
  streets: rasterStyle({
    name: "streets-raster",
    tiles: OSM_RASTER_TILES,
    attribution: OSM_RASTER_ATTRIBUTION,
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
} as const;

let rasterCatalogKey = "\0";
let rasterCatalog: Record<RasterBasemapId, BasemapStyle> | null = null;

export function getBasemapRasterCatalog(): Record<RasterBasemapId, BasemapStyle> {
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() ?? "";
  if (!rasterCatalog || rasterCatalogKey !== key) {
    rasterCatalogKey = key;
    rasterCatalog = {
      positron: cartoOrOsmRaster({
        name: "positron-raster",
        cartoStyle: "light_all",
      }),
      dark: cartoOrOsmRaster({ name: "dark-raster", cartoStyle: "dark_all" }),
      streets: STATIC_RASTER.streets,
      satellite: STATIC_RASTER.satellite,
      sentinel: STATIC_RASTER.sentinel,
    };
  }
  return rasterCatalog;
}

/** Default operational styles: keyed Carto or OSM raster, Esri, Sentinel-2. */
export const BASEMAP_RASTER: Record<RasterBasemapId, BasemapStyle> = {
  get positron() {
    return getBasemapRasterCatalog().positron;
  },
  get dark() {
    return getBasemapRasterCatalog().dark;
  },
  get streets() {
    return getBasemapRasterCatalog().streets;
  },
  get satellite() {
    return getBasemapRasterCatalog().satellite;
  },
  get sentinel() {
    return getBasemapRasterCatalog().sentinel;
  },
};

/** @deprecated Alias — raster is the default, not a fallback. */
export const BASEMAP_RASTER_FALLBACKS = BASEMAP_RASTER;

/** Keyed Carto (or OSM if no key) if a brand vector style/source fails. */
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
  opts?: {
    preferVector?: boolean;
    rasterFallback?: boolean;
    acehOsmUrl?: string | null;
    localAcehOsmPresent?: boolean;
  }
): BasemapStyle {
  if (isBrandBasemapId(id)) {
    if (opts?.rasterFallback === true) {
      return BASEMAP_RASTER[BRAND_RASTER_FALLBACK[id]];
    }
    return buildBrandBasemapStyle(id, {
      acehOsmUrl: opts?.acehOsmUrl,
      localAcehOsmPresent: opts?.localAcehOsmPresent,
    });
  }
  // rasterFallback kept so older call sites that meant “use Carto” still work.
  const useVector = opts?.preferVector === true && opts?.rasterFallback !== true;
  if (useVector) {
    return BASEMAP_VECTOR_URLS[id] ?? BASEMAP_RASTER[id];
  }
  return BASEMAP_RASTER[id];
}

/** Default export used by the map: keyed Carto or OSM rasters; brand styles are extra. */
export const BASEMAP_STYLES: Record<BasemapId, BasemapStyle> = {
  ...BASEMAP_RASTER,
  ...BASEMAP_BRAND,
};
