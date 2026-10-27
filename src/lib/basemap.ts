import type { BasemapId, BrandBasemapId, RasterBasemapId } from "./types";
import { COLOR_TOKENS } from "./layer-colors";
import {
  BRAND_BASEMAP_IDS,
  basemapGlyphsUrl,
  buildBrandBasemapStyle,
  buildEmptyBasemapStyle,
  isBrandBasemapId,
  type BasemapTone,
} from "./basemap-presets";

export { BRAND_BASEMAP_IDS, isBrandBasemapId, basemapGlyphsUrl };

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

export function normalizeBasemapId(value: string | null | undefined): BasemapId {
  return isBasemapId(value) ? value : "positron";
}

/** Picker list. Dark is an owned PMTiles style, so it stays visible without a key. */
export function visibleBasemapOptions(): BasemapOption[] {
  return BASEMAP_OPTIONS.filter((option) => isBasemapId(option.id));
}

/**
 * Older builds rewrote `?basemap=dark` when Carto tiles could not load.
 * Dark is now an owned style, so the query is left as written.
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
  { id: "positron", labelKey: "basemapPositron", kind: "vector" },
  { id: "dark", labelKey: "basemapDark", kind: "vector" },
  { id: "streets", labelKey: "basemapStreets", kind: "vector" },
  { id: "satellite", labelKey: "basemapSatellite", kind: "imagery" },
  { id: "sentinel", labelKey: "basemapSentinel", kind: "imagery" },
  { id: "brand-light", labelKey: "basemapBrandLight", kind: "vector" },
  { id: "brand-dark", labelKey: "basemapBrandDark", kind: "vector" },
  { id: "brand-grey", labelKey: "basemapBrandGrey", kind: "vector" },
];

export type BasemapStyle = string | Record<string, unknown>;

/**
 * No remote vector-style URLs. OpenFreeMap and public OSM rasters are not
 * fallbacks. Owned PMTiles is selected by `NEXT_PUBLIC_BASEMAP_PMTILES_URL`.
 */
export const BASEMAP_VECTOR_URLS: Partial<Record<BasemapId, string>> = {};

const ESRI_IMAGERY_ATTRIBUTION =
  'Tiles © <a href="https://www.esri.com/en-us/legal/terms/data-attributions" target="_blank">Esri</a> — Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community';

function rasterStyle(opts: {
  name: string;
  tiles: string[];
  attribution: string;
  maxzoom?: number;
}): Record<string, unknown> {
  return {
    version: 8,
    name: opts.name,
    glyphs: basemapGlyphsUrl(),
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

const IMAGERY: Record<"satellite" | "sentinel", BasemapStyle> = {
  satellite: rasterStyle({
    name: "satellite",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution: ESRI_IMAGERY_ATTRIBUTION,
  }),
  sentinel: rasterStyle({
    name: "sentinel-s2cloudless-2024",
    tiles: [SENTINEL_CLOUDLESS_TILES],
    attribution: "Sentinel-2 cloudless © EOX (modified Copernicus Sentinel data 2024)",
    maxzoom: 14,
  }),
};

/** Vector operational styles (and imagery). Positron/dark/streets read the PMTiles env at call time. */
export const BASEMAP_RASTER: Record<RasterBasemapId, BasemapStyle> = {
  get positron() {
    return getBasemapStyle("positron");
  },
  get dark() {
    return getBasemapStyle("dark");
  },
  get streets() {
    return getBasemapStyle("streets");
  },
  satellite: IMAGERY.satellite,
  sentinel: IMAGERY.sentinel,
};

/** @deprecated Alias. Owned PMTiles is the operational basemap. */
export const BASEMAP_RASTER_FALLBACKS = BASEMAP_RASTER;

/** Tone family if an owned vector style cannot load. Not a tile server. */
export const BRAND_RASTER_FALLBACK: Record<BrandBasemapId, RasterBasemapId> = {
  "brand-light": "positron",
  "brand-dark": "dark",
  "brand-grey": "positron",
};

export const BASEMAP_BRAND: Record<BrandBasemapId, BasemapStyle> = {
  get "brand-light"() {
    return getBasemapStyle("brand-light");
  },
  get "brand-dark"() {
    return getBasemapStyle("brand-dark");
  },
  get "brand-grey"() {
    return getBasemapStyle("brand-grey");
  },
};

export function basemapOwnsVectorStyle(id: BasemapId): boolean {
  return id !== "satellite" && id !== "sentinel";
}

export function basemapTone(id: BasemapId): BasemapTone {
  if (id === "dark" || id === "brand-dark" || id === "satellite" || id === "sentinel") {
    return "dark";
  }
  if (id === "brand-grey") return "grey";
  return "light";
}

/** Canvas behind the GL surface. Matches the style background so tiles do not flash white. */
export function basemapCanvasColor(id: BasemapId): string {
  return basemapTone(id) === "dark" ? COLOR_TOKENS.ink : COLOR_TOKENS.paperWarm;
}

function brandIdFor(id: BasemapId): BrandBasemapId {
  if (id === "dark" || id === "brand-dark") return "brand-dark";
  if (id === "brand-grey") return "brand-grey";
  return "brand-light";
}

export function getBasemapStyle(
  id: BasemapId,
  opts?: {
    preferVector?: boolean;
    rasterFallback?: boolean;
    acehOsmUrl?: string | null;
    localAcehOsmPresent?: boolean;
  }
): BasemapStyle {
  if (id === "satellite" || id === "sentinel") return IMAGERY[id];
  const brand = isBrandBasemapId(id) ? id : brandIdFor(id);
  if (opts?.rasterFallback === true) return buildEmptyBasemapStyle(basemapTone(brand));
  return buildBrandBasemapStyle(brand, { acehOsmUrl: opts?.acehOsmUrl });
}

/** Operational styles. Positron, dark, and streets share the owned PMTiles archive. */
export const BASEMAP_STYLES: Record<BasemapId, BasemapStyle> = {
  get positron() {
    return getBasemapStyle("positron");
  },
  get dark() {
    return getBasemapStyle("dark");
  },
  get streets() {
    return getBasemapStyle("streets");
  },
  get satellite() {
    return getBasemapStyle("satellite");
  },
  get sentinel() {
    return getBasemapStyle("sentinel");
  },
  get "brand-light"() {
    return getBasemapStyle("brand-light");
  },
  get "brand-dark"() {
    return getBasemapStyle("brand-dark");
  },
  get "brand-grey"() {
    return getBasemapStyle("brand-grey");
  },
};
