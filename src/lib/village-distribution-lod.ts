import type { FilterSpecification } from "maplibre-gl";
import type { Geometry, Position } from "geojson";
import { COLOR_TOKENS } from "@/lib/layer-colors";
import type { VillageClickSelection } from "@/lib/profil-desa";
import { overlayPmtilesUrl } from "@/lib/tiles-url";

/** Below this zoom, villageDistribution paints r3p-kab only. */
export const KECAMATAN_LOD_MIN_ZOOM = 9;

/** Exclusive max zoom for kecamatan tiles (village mesh starts here). */
export const KECAMATAN_LOD_MAX_ZOOM = 11;

/** Desa fill starts here — no village mesh at z9–10. */
export const VILLAGE_LOD_MIN_ZOOM = 11;

/** Desa outlines start with the village-fill switch so polygons are not a blob. */
export const VILLAGE_OUTLINE_MIN_ZOOM = 11;

export const BASEMAP_LABEL_PLACE_LAYER = "basemap-label-place";
export const MARKER_CLUSTERS_LAYER = "marker-clusters";

export const AREA_FILL_LAYER_IDS = [
  "area-fill",
  "area-fill-kab",
  "area-fill-kecamatan",
  "area-fill-village",
] as const;

export function isAreaFillLayerId(id: string | undefined): boolean {
  return !!id && (AREA_FILL_LAYER_IDS as readonly string[]).includes(id);
}

/** After the HEAD/GET probe settles, missing tiles must fall back to GeoJSON. */
export function pmtilesKnownMissing(
  ok: boolean | undefined,
  settled: boolean
): boolean {
  return settled && ok !== true;
}

/** Choropleth click wins over markers so kab/kec/desa modals can open. */
export function preferVillageFillOnClick(
  villageClickEnabled: boolean,
  layerIds: Array<string | undefined>
): boolean {
  return villageClickEnabled && layerIds.some((id) => isAreaFillLayerId(id));
}

/**
 * react-map-gl `<Source>` only injects `source` onto direct `<Layer>` children.
 * Wrappers must forward it or MapLibre adds a fill with no source.
 */
export function mapSourceProp(
  source?: string
): { source: string } | Record<string, never> {
  if (!source) return {};
  return { source };
}

/** z<9 villageDistribution LOD — do not delete r3p-kab; retirement is a follow-up. */
export const PMTILES_KAB = {
  url: overlayPmtilesUrl("r3p-kab.pmtiles"),
  sourceLayer: "r3p",
} as const;

export const PMTILES_KECAMATAN = {
  url: overlayPmtilesUrl("kecamatan-r3p.pmtiles"),
  sourceLayer: "kecamatan",
} as const;

export const PMTILES_VILLAGE = {
  url: overlayPmtilesUrl("village-r3p.pmtiles"),
  sourceLayer: "village",
} as const;

export type VillageLodBand = "kab" | "kecamatan" | "village";

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

export function villageLodBand(zoom: number): VillageLodBand {
  if (zoom < KECAMATAN_LOD_MIN_ZOOM) return "kab";
  if (zoom < VILLAGE_LOD_MIN_ZOOM) return "kecamatan";
  return "village";
}

export function isKecamatanLodZoom(zoom: number): boolean {
  return villageLodBand(zoom) === "kecamatan";
}

export function isVillageLodZoom(zoom: number): boolean {
  return villageLodBand(zoom) === "village";
}

/** Panel opens on kab, kecamatan, and desa choropleth clicks. */
export function villagePanelClickEnabled(band: VillageLodBand): boolean {
  return band === "kab" || band === "kecamatan" || band === "village";
}

/** Click level follows the LOD band so kecamatan tiles never open as desa. */
export function villageClickLevel(
  band: VillageLodBand,
  props?: Record<string, unknown> | null
): "kab" | "kecamatan" | "desa" {
  if (band === "kab" || isKabAreaFeature(props, band)) return "kab";
  if (band === "kecamatan") return "kecamatan";
  const level = String(props?.level ?? "").trim().toLowerCase();
  if (level === "kab" || level === "kabupaten") return "kab";
  if (level === "kecamatan") return "kecamatan";
  return "desa";
}

export function villageDistributionTiles(zoom: number): PmtilesAreaMeta {
  const band = villageLodBand(zoom);
  if (band === "kab") return PMTILES_KAB;
  if (band === "kecamatan") return PMTILES_KECAMATAN;
  return PMTILES_VILLAGE;
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
  const kodeKab = kab?.kodeKab || undefined;
  const kabupaten = kab?.kabupaten || village?.kabupaten || undefined;
  const kodeKecamatan = village?.kodeKecamatan || undefined;
  if (!kodeKab && !kabupaten && !kodeKecamatan) return null;
  return { kodeKab, kabupaten, kodeKecamatan };
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

export const AREA_OUTLINE_COLOR = COLOR_TOKENS.forest;

export const KAB_OUTLINE_PAINT = {
  "line-color": AREA_OUTLINE_COLOR,
  "line-width": 0.7,
  "line-opacity": 0.65,
} as const;

export const VILLAGE_OUTLINE_PAINT = {
  "line-color": AREA_OUTLINE_COLOR,
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

export function areaOutlinePaint(kind: "kab" | "kecamatan" | "village") {
  return kind === "village" ? VILLAGE_OUTLINE_PAINT : KAB_OUTLINE_PAINT;
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

export function isKabAreaFeature(
  props: Record<string, unknown> | null | undefined,
  lod: VillageLodBand | boolean
): boolean {
  const band: VillageLodBand = typeof lod === "boolean" ? (lod ? "village" : "kab") : lod;
  if (band === "kab") return true;
  return String(props?.level ?? "") === "kab";
}
