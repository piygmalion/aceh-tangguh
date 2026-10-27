import type { BrandBasemapId } from "./types";
import { COLOR_TOKENS } from "./layer-colors";
import { withBasePath } from "./preview/env";
import { configuredBasemapPmtilesUrl, toMapLibreVectorSourceUrl } from "./tiles-url";

/**
 * Ink scale 50–900 derived from paper #F4F5F0, charcoal #242420, and ink #1A1A17.
 * Used by the Minimalist Grey preset (and as neutral road/building ink on Light/Dark).
 */
export const INK_SCALE = {
  50: "#F4F5F0",
  100: "#D6D7D2",
  200: "#B9B9B5",
  300: "#9B9B97",
  400: "#7D7E79",
  500: "#5F605B",
  600: "#42423E",
  700: "#33332F",
  800: "#242420",
  900: "#1A1A17",
} as const;

/**
 * Self-hosted MapLibre glyph ranges (`public/fonts`). Noto Sans Regular,
 * SIL OFL 1.1. No sprite atlas: labels are text-only, so a sprite URL is omitted.
 * Do not point this at a public glyph CDN.
 */
export const BASEMAP_GLYPHS_TEMPLATE = "/fonts/{fontstack}/{range}.pbf";

export function basemapGlyphsUrl(): string {
  return withBasePath(BASEMAP_GLYPHS_TEMPLATE);
}

/** Shown by MapLibre from the vector source `attribution` field. */
export const OSM_BASEMAP_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

export const BRAND_BASEMAP_IDS = [
  "brand-light",
  "brand-dark",
  "brand-grey",
] as const satisfies readonly BrandBasemapId[];

export function isBrandBasemapId(value: string): value is BrandBasemapId {
  return (BRAND_BASEMAP_IDS as readonly string[]).includes(value);
}

export type MapLibreStyleV8 = {
  version: 8;
  name: string;
  glyphs: string;
  sources: Record<string, unknown>;
  layers: MapLibreLayer[];
};

export type MapLibreLayer = {
  id: string;
  type: string;
  source?: string;
  "source-layer"?: string;
  minzoom?: number;
  maxzoom?: number;
  filter?: unknown;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
};

type Palette = {
  background: string;
  landSecondary: string;
  landcover: string;
  /** Parks. Light uses forest; dark uses sage with the other landcover. */
  park: string;
  landcoverOpacity: number;
  water: string;
  roadMinor: string;
  roadMajor: string;
  roadCasing: string;
  building: string;
  buildingOutline: string;
  /** Country + province (Aceh) — forest on grey, ink-scale otherwise. */
  boundaryAdmin: string;
  boundaryLocal: string;
  label: string;
  labelHalo: string;
  waterLabel: string;
};

const LIGHT: Palette = {
  background: COLOR_TOKENS.paperWarm,
  landSecondary: COLOR_TOKENS.sage,
  landcover: COLOR_TOKENS.sage,
  park: COLOR_TOKENS.forest,
  landcoverOpacity: 0.34,
  water: COLOR_TOKENS.teal,
  roadMinor: INK_SCALE[200],
  roadMajor: INK_SCALE[300],
  roadCasing: INK_SCALE[100],
  building: INK_SCALE[100],
  buildingOutline: INK_SCALE[200],
  boundaryAdmin: INK_SCALE[600],
  boundaryLocal: INK_SCALE[400],
  label: COLOR_TOKENS.ink,
  labelHalo: COLOR_TOKENS.paper,
  waterLabel: COLOR_TOKENS.paper,
};

/** Teal #2F6B66 mixed with 15% paper #F7F7F4 — dark water only. 3.89:1 vs ink canvas. */
export const DARK_WATER = "#4D807B";

const DARK: Palette = {
  background: COLOR_TOKENS.ink,
  landSecondary: COLOR_TOKENS.sage,
  landcover: COLOR_TOKENS.sage,
  park: COLOR_TOKENS.sage,
  landcoverOpacity: 0.32,
  water: DARK_WATER,
  roadMinor: INK_SCALE[600],
  roadMajor: INK_SCALE[500],
  roadCasing: INK_SCALE[800],
  building: INK_SCALE[800],
  buildingOutline: INK_SCALE[700],
  boundaryAdmin: INK_SCALE[400],
  boundaryLocal: INK_SCALE[600],
  label: COLOR_TOKENS.paper,
  labelHalo: COLOR_TOKENS.ink,
  waterLabel: COLOR_TOKENS.paper,
};

const GREY: Palette = {
  background: INK_SCALE[50],
  landSecondary: INK_SCALE[100],
  landcover: INK_SCALE[200],
  park: INK_SCALE[200],
  landcoverOpacity: 0.55,
  water: INK_SCALE[500],
  roadMinor: INK_SCALE[200],
  roadMajor: INK_SCALE[300],
  roadCasing: INK_SCALE[100],
  building: INK_SCALE[100],
  buildingOutline: INK_SCALE[200],
  boundaryAdmin: COLOR_TOKENS.forest,
  boundaryLocal: INK_SCALE[500],
  label: INK_SCALE[900],
  labelHalo: INK_SCALE[50],
  waterLabel: COLOR_TOKENS.paper,
};

const PALETTES: Record<BrandBasemapId, Palette> = {
  "brand-light": LIGHT,
  "brand-dark": DARK,
  "brand-grey": GREY,
};

const STYLE_NAMES: Record<BrandBasemapId, string> = {
  "brand-light": "aceh-tangguh-light",
  "brand-dark": "aceh-tangguh-dark",
  "brand-grey": "aceh-tangguh-grey",
};

const POLY = ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false];
const LINE = ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false];

const PLACE_TEXT = [
  "coalesce",
  ["get", "name:nonlatin"],
  ["get", "name"],
  ["get", "name:latin"],
  ["get", "name_en"],
] as const;

function roadWidth(stops: [number, number][]): unknown {
  return ["interpolate", ["exponential", 1.4], ["zoom"], ...stops.flat()];
}

function layersFor(p: Palette): MapLibreLayer[] {
  return [
    {
      id: "basemap-background",
      type: "background",
      paint: { "background-color": p.background },
    },
    {
      id: "basemap-landuse-residential",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      maxzoom: 16,
      filter: ["all", POLY, ["==", ["get", "class"], "residential"]],
      paint: {
        "fill-color": p.landSecondary,
        "fill-opacity": 0.55,
      },
    },
    {
      id: "basemap-landcover-wood",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["all", POLY, ["==", ["get", "class"], "wood"]],
      paint: {
        "fill-color": p.landcover,
        "fill-opacity": p.landcoverOpacity,
      },
    },
    {
      id: "basemap-park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      filter: POLY,
      paint: {
        "fill-color": p.park,
        "fill-opacity": p.landcoverOpacity,
      },
    },
    {
      id: "basemap-water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      filter: ["all", POLY, ["!=", ["get", "brunnel"], "tunnel"]],
      paint: {
        "fill-antialias": true,
        "fill-color": p.water,
      },
    },
    {
      id: "basemap-waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      minzoom: 8,
      filter: LINE,
      paint: {
        "line-color": p.water,
        "line-width": 0.8,
        "line-opacity": 0.8,
      },
    },
    {
      id: "basemap-building",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 12,
      paint: {
        "fill-antialias": true,
        "fill-color": p.building,
        "fill-outline-color": p.buildingOutline,
      },
    },
    {
      id: "basemap-road-minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 8,
      filter: [
        "all",
        LINE,
        ["match", ["get", "class"], ["minor", "service", "track", "path"], true, false],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": p.roadMinor,
        "line-width": roadWidth([
          [13, 0.8],
          [20, 10],
        ]),
      },
    },
    {
      id: "basemap-road-major-casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 8,
      filter: [
        "all",
        LINE,
        ["match", ["get", "class"], ["primary", "secondary", "tertiary", "trunk", "motorway"], true, false],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": p.roadCasing,
        "line-width": roadWidth([
          [8, 1.6],
          [20, 22],
        ]),
      },
    },
    {
      id: "basemap-road-major",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 8,
      filter: [
        "all",
        LINE,
        ["match", ["get", "class"], ["primary", "secondary", "tertiary", "trunk", "motorway"], true, false],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": p.roadMajor,
        "line-width": roadWidth([
          [8, 1],
          [20, 16],
        ]),
      },
    },
    {
      id: "basemap-boundary-local",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      minzoom: 7,
      filter: [
        "all",
        ["match", ["get", "admin_level"], [3, 5, 6], true, false],
        ["!=", ["get", "maritime"], 1],
      ],
      paint: {
        "line-color": p.boundaryLocal,
        "line-dasharray": [1, 1],
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.6, 11, 1.2],
      },
    },
    {
      id: "basemap-boundary-province",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      minzoom: 3,
      filter: [
        "all",
        ["==", ["get", "admin_level"], 4],
        ["!=", ["get", "maritime"], 1],
      ],
      paint: {
        "line-color": p.boundaryAdmin,
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1, 10, 2.2],
      },
    },
    {
      id: "basemap-boundary-country",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: [
        "all",
        ["==", ["get", "admin_level"], 2],
        ["!=", ["get", "maritime"], 1],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": p.boundaryAdmin,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.1, 12, 2.8],
      },
    },
    {
      id: "basemap-label-water",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "water_name",
      minzoom: 4,
      layout: {
        "text-field": PLACE_TEXT,
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
        "text-max-width": 6,
      },
      paint: {
        "text-color": p.waterLabel,
        "text-halo-color": p.water,
        "text-halo-width": 1,
      },
    },
    {
      id: "basemap-label-road",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      minzoom: 12,
      layout: {
        "symbol-placement": "line",
        "text-field": PLACE_TEXT,
        "text-font": ["Noto Sans Regular"],
        "text-size": 10,
      },
      paint: {
        "text-color": p.label,
        "text-halo-color": p.labelHalo,
        "text-halo-width": 1.2,
      },
    },
    {
      id: "basemap-label-place",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: 3,
      filter: [
        "match",
        ["get", "class"],
        ["village", "town", "city", "state", "country"],
        true,
        false,
      ],
      layout: {
        "text-field": PLACE_TEXT,
        "text-font": ["Noto Sans Regular"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          11,
          8,
          14,
          12,
          16,
        ],
        "text-max-width": 8,
        "text-padding": 2,
      },
      paint: {
        "text-color": p.label,
        "text-halo-color": p.labelHalo,
        "text-halo-width": 1.2,
      },
    },
  ];
}

export type BasemapTone = "light" | "dark" | "grey";

export type BrandVectorTilesKind = "aceh-pmtiles";

export type BrandVectorTilesSource = {
  kind: BrandVectorTilesKind;
  url: string;
  attribution: string;
};

const TONE_BACKGROUND: Record<BasemapTone, string> = {
  light: COLOR_TOKENS.paperWarm,
  dark: COLOR_TOKENS.ink,
  grey: INK_SCALE[50],
};

export function basemapToneForBrand(id: BrandBasemapId): BasemapTone {
  if (id === "brand-dark") return "dark";
  if (id === "brand-grey") return "grey";
  return "light";
}

/** Theme canvas only. No tile URL, so a missing archive cannot fall through to a public server. */
export function buildEmptyBasemapStyle(tone: BasemapTone): MapLibreStyleV8 {
  return {
    version: 8,
    name: `aceh-basemap-unavailable-${tone}`,
    glyphs: basemapGlyphsUrl(),
    sources: {},
    layers: [
      {
        id: "basemap-background",
        type: "background",
        paint: { "background-color": TONE_BACKGROUND[tone] },
      },
    ],
  };
}

/**
 * Owned Aceh PMTiles when `NEXT_PUBLIC_BASEMAP_PMTILES_URL` (or the legacy
 * `NEXT_PUBLIC_ACEH_OSM_PMTILES`) is set. Otherwise null — callers paint the
 * empty canvas. A local file on disk is not implied.
 */
export function resolveBrandVectorTilesSource(opts?: {
  acehOsmUrl?: string | null;
}): BrandVectorTilesSource | null {
  const aceh = opts?.acehOsmUrl?.trim() || configuredBasemapPmtilesUrl();
  if (!aceh) return null;
  return {
    kind: "aceh-pmtiles",
    url: toMapLibreVectorSourceUrl(aceh),
    attribution: OSM_BASEMAP_ATTRIBUTION,
  };
}

export function buildBrandBasemapStyle(
  id: BrandBasemapId,
  opts?: { acehOsmUrl?: string | null }
): MapLibreStyleV8 {
  const tiles = resolveBrandVectorTilesSource(opts);
  if (!tiles) return buildEmptyBasemapStyle(basemapToneForBrand(id));
  return {
    version: 8,
    name: STYLE_NAMES[id],
    glyphs: basemapGlyphsUrl(),
    sources: {
      openmaptiles: {
        type: "vector",
        url: tiles.url,
        attribution: tiles.attribution,
      },
    },
    layers: layersFor(PALETTES[id]),
  };
}

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

/** Collect hex paints from a style — used to lock the token palette in tests. */
export function collectStylePaintHex(style: MapLibreStyleV8): string[] {
  const found = new Set<string>();
  const walk = (value: unknown) => {
    if (typeof value === "string") {
      for (const match of value.match(HEX_RE) ?? []) {
        found.add(match.toUpperCase());
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(walk);
    }
  };
  walk(style.layers);
  return Array.from(found).sort();
}
