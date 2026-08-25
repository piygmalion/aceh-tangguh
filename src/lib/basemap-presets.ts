import type { BrandBasemapId } from "./types";
import { COLOR_TOKENS } from "./layer-colors";

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

export const OPENFREEMAP_TILEJSON = "https://tiles.openfreemap.org/planet";
export const OPENFREEMAP_GLYPHS =
  "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

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
  landSecondary: INK_SCALE[100],
  landcover: COLOR_TOKENS.forest,
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

const DARK: Palette = {
  background: COLOR_TOKENS.ink,
  landSecondary: INK_SCALE[800],
  landcover: COLOR_TOKENS.sage,
  landcoverOpacity: 0.32,
  water: COLOR_TOKENS.teal,
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
  landcoverOpacity: 0.55,
  water: INK_SCALE[400],
  roadMinor: INK_SCALE[200],
  roadMajor: INK_SCALE[300],
  roadCasing: INK_SCALE[100],
  building: INK_SCALE[100],
  buildingOutline: INK_SCALE[200],
  boundaryAdmin: COLOR_TOKENS.forest,
  boundaryLocal: INK_SCALE[500],
  label: INK_SCALE[900],
  labelHalo: INK_SCALE[50],
  waterLabel: INK_SCALE[800],
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
        "fill-color": p.landcover,
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

export function buildBrandBasemapStyle(id: BrandBasemapId): MapLibreStyleV8 {
  return {
    version: 8,
    name: STYLE_NAMES[id],
    glyphs: OPENFREEMAP_GLYPHS,
    sources: {
      openmaptiles: {
        type: "vector",
        url: OPENFREEMAP_TILEJSON,
        attribution: "© OpenFreeMap © OpenMapTiles © OpenStreetMap",
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
