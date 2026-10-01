import type { FilterSpecification } from "maplibre-gl";
import type { Geometry, Position } from "geojson";
import { cartoBasemapKeyPresent } from "@/lib/basemap";
import { COLOR_TOKENS } from "@/lib/layer-colors";
import type { VillageClickSelection } from "@/lib/profil-desa";
import { overlayPmtilesUrl } from "@/lib/tiles-url";
import type { AreaLayerKey, BasemapId } from "@/lib/types";

/** Kab overview uses the existing dissolve fixture, not retired r3p-kab.pmtiles. */
export const KAB_OVERVIEW_AREA_KEY = "r3pDistribution" as const;

/** Same breaks as villageDistribution.legend.json / kecamatan dissolve. */
export const VILLAGE_DISTRIBUTION_TERCILES = Object.freeze({ t1: 106, t2: 1184 });

/** Desa outline paint still interpolates with zoom so polygons are not a blob. */
export const VILLAGE_OUTLINE_MIN_ZOOM = 11;
/** After a kab focus: kecamatan choropleth below this zoom. */
export const KECAMATAN_OVERVIEW_MAX_ZOOM = 11;
/** After a kab focus: desa mesh at and above this zoom. */
export const VILLAGE_MESH_MIN_ZOOM = 11;

export const BASEMAP_LABEL_PLACE_LAYER = "basemap-label-place";
export const MARKER_CLUSTERS_LAYER = "marker-clusters";

export const AREA_FILL_LAYER_IDS = [
  "area-fill",
  "area-fill-kab",
  "area-fill-kecamatan",
  "area-fill-village",
] as const;

export const AREA_HIGHLIGHT_LAYER_IDS = [
  "area-highlight-fill",
  "area-highlight-line",
  "area-highlight-fill-kab",
  "area-highlight-line-kab",
  "area-highlight-fill-kecamatan",
  "area-highlight-line-kecamatan",
  "area-highlight-fill-village",
  "area-highlight-line-village",
] as const;

export function areaHighlightLayerId(
  kind: "fill" | "line",
  prefix?: string
): string {
  const base = kind === "fill" ? "area-highlight-fill" : "area-highlight-line";
  return prefix ? `${base}-${prefix}` : base;
}

export function isAreaFillLayerId(id: string | undefined): boolean {
  if (!id) return false;
  return (
    (AREA_FILL_LAYER_IDS as readonly string[]).includes(id) ||
    (AREA_HIGHLIGHT_LAYER_IDS as readonly string[]).includes(id)
  );
}

/** Desa and R3P share the kab → kecamatan → desa PMTiles stack. */
export function isAdminLodArea(
  key: AreaLayerKey | null | undefined,
): key is "villageDistribution" | "r3pDistribution" {
  return key === "villageDistribution" || key === "r3pDistribution";
}

export const PMTILES_KECAMATAN = {
  url: overlayPmtilesUrl("kecamatan-r3p.pmtiles"),
  sourceLayer: "kecamatan",
} as const;

export const PMTILES_VILLAGE = {
  url: overlayPmtilesUrl("village-r3p.pmtiles"),
  sourceLayer: "village",
} as const;

/** Click drill: kabupaten GeoJSON → kecamatan tiles → village tiles. */
export type VillageLodBand = "kabupaten" | "kecamatan" | "village";

export type PmtilesAreaMeta = {
  url: string;
  sourceLayer: string;
};

export type VillageLodFocus = {
  kodeKab?: string;
  kabupaten?: string;
  kodeKecamatan?: string;
};

export type LngLatBoundsTuple = [[number, number], [number, number]];

export function adminLodBand(focus: VillageLodFocus | null | undefined): VillageLodBand {
  if (focus?.kodeKecamatan) return "village";
  if (focus?.kodeKab || focus?.kabupaten) return "kecamatan";
  return "kabupaten";
}

export function adminLodTiles(band: VillageLodBand): PmtilesAreaMeta | null {
  if (band === "kecamatan") return PMTILES_KECAMATAN;
  if (band === "village") return PMTILES_VILLAGE;
  return null;
}

export function villageDistributionBucket(total: unknown): "rendah" | "sedang" | "tinggi" {
  const t = Number(total);
  const n = Number.isFinite(t) ? t : 0;
  if (n <= VILLAGE_DISTRIBUTION_TERCILES.t1) return "rendah";
  if (n <= VILLAGE_DISTRIBUTION_TERCILES.t2) return "sedang";
  return "tinggi";
}

function numericProp(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Recolor kab dissolve polygons with desa terciles for villageDistribution. */
export function rebucketVillageKabFeature(
  props: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const p = { ...(props ?? {}) };
  const rumah =
    numericProp(p.rumah_rr) + numericProp(p.rumah_rs) + numericProp(p.rumah_rb);
  const total = rumah > 0 ? rumah : numericProp(p.value);
  p.bucket = villageDistributionBucket(total);
  return p;
}

/** Panel opens on kab, kecamatan, and desa clicks. */
export function villagePanelClickEnabled(band: VillageLodBand): boolean {
  return band === "kabupaten" || band === "kecamatan" || band === "village";
}

/**
 * Keep choropleth under map points. Prefer `marker-clusters` (Carto + brand).
 * Fall back to brand place labels when the marker source is not mounted.
 */
export function overlayBeforeId(
  styleHasLayer: ((id: string) => boolean) | null | undefined
): string | undefined {
  if (!styleHasLayer) return undefined;
  if (styleHasLayer(MARKER_CLUSTERS_LAYER)) return MARKER_CLUSTERS_LAYER;
  if (styleHasLayer(BASEMAP_LABEL_PLACE_LAYER)) return BASEMAP_LABEL_PLACE_LAYER;
  return undefined;
}

export function readStoredKode(
  props: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!props) return "";
  for (const key of keys) {
    const raw = props[key];
    if (raw == null) continue;
    const value = String(raw).trim();
    if (!value || value === "null" || value === "undefined") continue;
    return value;
  }
  return "";
}

export function readKabLodFocus(
  props: Record<string, unknown> | null | undefined
): VillageLodFocus | null {
  if (!props) return null;
  const kodeKab = readStoredKode(props, "kode_kab", "kode_kabupaten");
  const kabupaten = String(props.name ?? props.kabupaten ?? "").trim();
  if (!kodeKab && !kabupaten) return null;
  const focus: VillageLodFocus = {};
  if (kodeKab) focus.kodeKab = kodeKab;
  if (kabupaten) focus.kabupaten = kabupaten;
  return focus;
}

export function mergeVillageLodFocus(
  kab: VillageLodFocus | null,
  village: VillageClickSelection | null
): VillageLodFocus | null {
  const kodeKab = kab?.kodeKab || village?.kodeKabupaten || undefined;
  const kabupaten = kab?.kabupaten || village?.kabupaten || undefined;
  const kodeKecamatan = kab?.kodeKecamatan || village?.kodeKecamatan || undefined;
  if (!kodeKab && !kabupaten && !kodeKecamatan) return null;
  return { kodeKab, kabupaten, kodeKecamatan };
}

export function withKecamatanFocus(
  kab: VillageLodFocus | null,
  kodeKecamatan: string,
): VillageLodFocus {
  const kode = kodeKecamatan.trim();
  return {
    kodeKab: kab?.kodeKab,
    kabupaten: kab?.kabupaten,
    kodeKecamatan: kode || undefined,
  };
}

export function isKecamatanAreaFeature(
  props: Record<string, unknown> | null | undefined,
): boolean {
  const level = String(props?.level ?? "").toLowerCase();
  if (level === "kecamatan") return true;
  if (isKabAreaFeature(props, "kecamatan")) return false;
  const kodeKec = readStoredKode(props, "kode_kecamatan");
  const kodeDesa = readStoredKode(props, "kode_desa_kelurahan");
  return Boolean(kodeKec) && !kodeDesa;
}

export function readVillageSelection(
  props: Record<string, unknown> | null | undefined,
): VillageClickSelection | null {
  if (!props) return null;
  const name = String(props.name ?? "").trim();
  const level = props.level ? String(props.level) : "desa";
  const kabupatenFromProp = String(props.kabupaten ?? "").trim();
  const kabupaten =
    kabupatenFromProp ||
    (level === "kab" || level === "kabupaten" ? name : "");
  const kecamatan = String(props.kecamatan ?? "").trim();
  if (!name && !kecamatan && !kabupaten) return null;
  const kodeDesa = readStoredKode(props, "kode_desa_kelurahan") || undefined;
  const kodeKecamatan = readStoredKode(props, "kode_kecamatan") || undefined;
  const kodeKabupaten =
    readStoredKode(props, "kode_kabupaten", "kode_kab") || undefined;
  return {
    name,
    kabupaten,
    kecamatan,
    kodeDesa,
    kodeKecamatan,
    kodeKabupaten,
    level,
  };
}

/**
 * JS predicate mirroring `villageLayerFilter`.
 * Prefer existing kode_* properties. Never match kecamatan name.
 * After a kab/kec focus, only features that match kode or kabupaten name stay visible.
 */
export function villageFeatureVisible(
  props: Record<string, unknown> | null | undefined,
  focus: VillageLodFocus | null
): boolean {
  if (!focus || (!focus.kodeKab && !focus.kabupaten && !focus.kodeKecamatan)) {
    return true;
  }
  const p = props ?? {};
  const kodeKab = readStoredKode(p, "kode_kab", "kode_kabupaten");
  const kodeKec = readStoredKode(p, "kode_kecamatan");
  const kodeDesa = readStoredKode(p, "kode_desa_kelurahan");
  const kabupaten = String(p.kabupaten ?? "").trim();

  if (focus.kodeKab || focus.kabupaten) {
    const kodeHit = Boolean(
      (focus.kodeKab && kodeKab && kodeKab === focus.kodeKab) ||
        (focus.kodeKab && kodeKec && kodeKec.startsWith(focus.kodeKab)) ||
        (focus.kodeKab && kodeDesa && kodeDesa.startsWith(focus.kodeKab))
    );
    const nameHit = Boolean(focus.kabupaten && kabupaten === focus.kabupaten);
    if (!kodeHit && !nameHit) return false;
  }

  if (focus.kodeKecamatan) {
    const kecHit = Boolean(
      (kodeKec && kodeKec === focus.kodeKecamatan) ||
        (kodeDesa && kodeDesa.startsWith(focus.kodeKecamatan))
    );
    if (!kecHit) return false;
  }

  return true;
}

type MapFilter = FilterSpecification;

function hasKodeExpr(prop: string): MapFilter {
  return [
    "all",
    ["has", prop],
    ["!=", ["to-string", ["coalesce", ["get", prop], ""]], ""],
    ["!=", ["to-string", ["get", prop]], "null"],
  ] as MapFilter;
}

function presentKodeEquals(prop: string, value: string): MapFilter {
  return [
    "all",
    hasKodeExpr(prop),
    ["==", ["to-string", ["get", prop]], value],
  ] as MapFilter;
}

function presentKodePrefix(prop: string, prefix: string): MapFilter {
  return [
    "all",
    hasKodeExpr(prop),
    [
      "==",
      ["slice", ["to-string", ["coalesce", ["get", prop], ""]], 0, prefix.length],
      prefix,
    ],
  ] as MapFilter;
}

function kabMatchExpr(focus: VillageLodFocus): MapFilter {
  const any: MapFilter[] = [];
  if (focus.kodeKab) {
    any.push(presentKodeEquals("kode_kab", focus.kodeKab));
    any.push(presentKodeEquals("kode_kabupaten", focus.kodeKab));
    any.push(presentKodePrefix("kode_kecamatan", focus.kodeKab));
    any.push(presentKodePrefix("kode_desa_kelurahan", focus.kodeKab));
  }
  if (focus.kabupaten) {
    any.push(["==", ["get", "kabupaten"], focus.kabupaten] as MapFilter);
  }
  if (any.length === 0) return ["==", ["get", "name"], "__none__"] as MapFilter;
  return ["any", ...any] as MapFilter;
}

function kecMatchExpr(kodeKecamatan: string): MapFilter {
  return [
    "any",
    presentKodeEquals("kode_kecamatan", kodeKecamatan),
    presentKodePrefix("kode_desa_kelurahan", kodeKecamatan),
  ] as MapFilter;
}

/** MapLibre filter for kecamatan-r3p / village-r3p. Undefined = no filter. */
export function villageLayerFilter(
  focus: VillageLodFocus | null
): FilterSpecification | undefined {
  if (!focus || (!focus.kodeKab && !focus.kabupaten && !focus.kodeKecamatan)) {
    return undefined;
  }
  const parts: FilterSpecification[] = [];
  if (focus.kodeKab || focus.kabupaten) parts.push(kabMatchExpr(focus));
  if (focus.kodeKecamatan) parts.push(kecMatchExpr(focus.kodeKecamatan));
  if (parts.length === 1) return parts[0];
  return ["all", ...parts] as FilterSpecification;
}

/** Light basemap: #111111 at 35%. Width stays on the paint below. */
export const AREA_OUTLINE_COLOR = "rgba(17, 17, 17, 0.35)";
/** Dark basemap: #FFFFFF at 30%. */
export const AREA_OUTLINE_COLOR_DARK = "rgba(255, 255, 255, 0.30)";

const DARK_OUTLINE_BASEMAPS = new Set<BasemapId>(["dark", "brand-dark", "satellite", "sentinel"]);

export function areaOutlineColor(basemap?: BasemapId | null): string {
  if (basemap === "dark" && !cartoBasemapKeyPresent()) return AREA_OUTLINE_COLOR;
  if (basemap && DARK_OUTLINE_BASEMAPS.has(basemap)) return AREA_OUTLINE_COLOR_DARK;
  return AREA_OUTLINE_COLOR;
}
export const AREA_HIGHLIGHT_FILL = COLOR_TOKENS.awas;
export const AREA_HIGHLIGHT_LINE = COLOR_TOKENS.awas;
export const AREA_HIGHLIGHT_FILL_OPACITY = 0.28;
/** Desa mesh: paper wash so grey outlines read; only the selection uses awas. */
export const VILLAGE_MESH_FILL = COLOR_TOKENS.paper;
export const VILLAGE_MESH_FILL_OPACITY = 0.12;

export function areaFillUsesMeshWash(kind: "kab" | "kecamatan" | "village"): boolean {
  return kind === "village";
}

export const KAB_OUTLINE_PAINT = {
  "line-color": AREA_OUTLINE_COLOR,
  "line-width": 0.7,
  "line-opacity": 1,
} as const;

export const KECAMATAN_OUTLINE_PAINT = {
  "line-color": COLOR_TOKENS.paper,
  "line-width": 1.1,
  "line-opacity": 0.9,
} as const;

export const VILLAGE_OUTLINE_PAINT = {
  "line-color": COLOR_TOKENS.paper,
  "line-width": [
    "interpolate",
    ["linear"],
    ["zoom"],
    VILLAGE_OUTLINE_MIN_ZOOM,
    0.45,
    13,
    0.9,
  ],
  "line-opacity": [
    "interpolate",
    ["linear"],
    ["zoom"],
    VILLAGE_OUTLINE_MIN_ZOOM,
    0.3,
    13,
    0.45,
  ],
} as const;

export function areaOutlinePaint(
  kind: "kab" | "kecamatan" | "village",
  basemap?: BasemapId | null,
) {
  if (kind === "village") return VILLAGE_OUTLINE_PAINT;
  if (kind === "kecamatan") return KECAMATAN_OUTLINE_PAINT;
  return {
    ...KAB_OUTLINE_PAINT,
    "line-color": areaOutlineColor(basemap),
  };
}

export function villageLodShowsKecamatanLayer(band: VillageLodBand): boolean {
  return band === "kecamatan" || band === "village";
}

export function villageLodShowsVillageLayer(band: VillageLodBand): boolean {
  return band === "kecamatan" || band === "village";
}

export function lodFocusFromSelection(
  sel: VillageClickSelection | null | undefined
): VillageLodFocus | null {
  if (!sel) return null;
  const kodeKab = sel.kodeKabupaten?.trim() || undefined;
  const level = sel.level?.trim().toLowerCase() ?? "";
  const kabupaten =
    sel.kabupaten?.trim() ||
    (level === "kab" || level === "kabupaten" ? sel.name?.trim() : "") ||
    undefined;
  const kodeKecamatan = sel.kodeKecamatan?.trim() || undefined;
  if (!kodeKab && !kabupaten && !kodeKecamatan) return null;
  const focus: VillageLodFocus = {};
  if (kodeKab) focus.kodeKab = kodeKab;
  if (kabupaten) focus.kabupaten = kabupaten;
  if (kodeKecamatan) focus.kodeKecamatan = kodeKecamatan;
  return focus;
}

export function areaHighlightFilter(
  sel: VillageClickSelection | null | undefined
): FilterSpecification {
  if (!sel) return ["==", ["get", "name"], "__none__"];
  const parts: FilterSpecification[] = [];
  const kodeDesa = sel.kodeDesa?.trim() ?? "";
  const kodeKec = sel.kodeKecamatan?.trim() ?? "";
  const kodeKab = sel.kodeKabupaten?.trim() ?? "";
  const name = sel.name?.trim() ?? "";
  const kecamatan = sel.kecamatan?.trim() ?? "";
  const level = sel.level?.trim().toLowerCase() ?? "";
  const isKab = level === "kab" || level === "kabupaten";
  const isKec = level === "kecamatan";

  if (kodeDesa) {
    parts.push(["==", ["get", "kode_desa_kelurahan"], kodeDesa] as FilterSpecification);
  }
  if (kodeKec && (isKec || !kodeDesa)) {
    parts.push(["==", ["get", "kode_kecamatan"], kodeKec] as FilterSpecification);
    if (name) parts.push(["==", ["get", "name"], name] as FilterSpecification);
    if (kecamatan) parts.push(["==", ["get", "kecamatan"], kecamatan] as FilterSpecification);
  }
  if (isKab) {
    if (kodeKab) {
      parts.push([
        "all",
        ["==", ["get", "level"], "kab"],
        ["==", ["get", "kode_kab"], kodeKab],
      ] as FilterSpecification);
      parts.push([
        "all",
        ["==", ["get", "level"], "kab"],
        ["==", ["get", "kode_kabupaten"], kodeKab],
      ] as FilterSpecification);
    }
    if (name) {
      parts.push([
        "all",
        ["==", ["get", "level"], "kab"],
        ["==", ["get", "name"], name],
      ] as FilterSpecification);
    }
  }
  if (!isKab && !isKec && !kodeDesa && name && kecamatan) {
    parts.push([
      "all",
      ["==", ["get", "name"], name],
      ["==", ["get", "kecamatan"], kecamatan],
    ] as FilterSpecification);
  }
  if (parts.length === 0) return ["==", ["get", "name"], "__none__"];
  if (parts.length === 1) return parts[0];
  return ["any", ...parts] as FilterSpecification;
}

function extendBounds(
  out: [number, number, number, number],
  lng: number,
  lat: number
) {
  if (lng < out[0]) out[0] = lng;
  if (lat < out[1]) out[1] = lat;
  if (lng > out[2]) out[2] = lng;
  if (lat > out[3]) out[3] = lat;
}

function walkPositions(coords: Position | Position[] | unknown, out: [number, number, number, number]) {
  if (!Array.isArray(coords) || coords.length === 0) return;
  if (typeof coords[0] === "number") {
    extendBounds(out, coords[0] as number, coords[1] as number);
    return;
  }
  for (const child of coords) walkPositions(child, out);
}

export function geometryBounds(
  geometry: Geometry | null | undefined
): LngLatBoundsTuple | null {
  if (!geometry) return null;
  const out: [number, number, number, number] = [
    Infinity,
    Infinity,
    -Infinity,
    -Infinity,
  ];
  if (geometry.type === "GeometryCollection") {
    for (const child of geometry.geometries) {
      const next = geometryBounds(child);
      if (!next) continue;
      extendBounds(out, next[0][0], next[0][1]);
      extendBounds(out, next[1][0], next[1][1]);
    }
  } else if ("coordinates" in geometry) {
    walkPositions(geometry.coordinates, out);
  }
  if (!Number.isFinite(out[0]) || !Number.isFinite(out[1])) return null;
  return [
    [out[0], out[1]],
    [out[2], out[3]],
  ];
}

export function unionBounds(
  bounds: Array<LngLatBoundsTuple | null | undefined>
): LngLatBoundsTuple | null {
  const out: [number, number, number, number] = [
    Infinity,
    Infinity,
    -Infinity,
    -Infinity,
  ];
  let any = false;
  for (const pair of bounds) {
    if (!pair) continue;
    any = true;
    extendBounds(out, pair[0][0], pair[0][1]);
    extendBounds(out, pair[1][0], pair[1][1]);
  }
  if (!any) return null;
  return [
    [out[0], out[1]],
    [out[2], out[3]],
  ];
}

/**
 * Kab click drills into kecamatan. Only features with `level=kab` count as kab.
 */
export function isKabAreaFeature(
  props: Record<string, unknown> | null | undefined,
  _lod?: VillageLodBand | boolean
): boolean {
  return String(props?.level ?? "") === "kab";
}
