import type { FilterSpecification } from "maplibre-gl";
import type { Geometry, Position } from "geojson";
import { COLOR_TOKENS } from "@/lib/layer-colors";
import type { VillageClickSelection } from "@/lib/profil-desa";

/** Below this zoom, villageDistribution paints r3p-kab only. */
export const VILLAGE_LOD_MIN_ZOOM = 9;

/** Desa outlines start here — not at the village-fill switch. */
export const VILLAGE_OUTLINE_MIN_ZOOM = 11;

export const BASEMAP_LABEL_PLACE_LAYER = "basemap-label-place";

export const PMTILES_KAB = {
  url: "/tiles/r3p-kab.pmtiles",
  sourceLayer: "r3p",
} as const;

export const PMTILES_VILLAGE = {
  url: "/tiles/village-r3p.pmtiles",
  sourceLayer: "village",
} as const;

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

const KODE_PROPS = [
  "kode_kecamatan",
  "kode_kab",
  "kode_kabupaten",
  "kode_desa_kelurahan",
] as const;

export function isVillageLodZoom(zoom: number): boolean {
  return zoom >= VILLAGE_LOD_MIN_ZOOM;
}

export function villageDistributionTiles(zoom: number): PmtilesAreaMeta {
  return isVillageLodZoom(zoom) ? PMTILES_VILLAGE : PMTILES_KAB;
}

/** Insert overlay under brand place labels; omit on Carto raster (no such layer). */
export function overlayBeforeId(
  styleHasLayer: ((id: string) => boolean) | null | undefined
): string | undefined {
  if (!styleHasLayer) return undefined;
  return styleHasLayer(BASEMAP_LABEL_PLACE_LAYER)
    ? BASEMAP_LABEL_PLACE_LAYER
    : undefined;
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
  return {
    kodeKab: kodeKab || undefined,
    kabupaten: kabupaten || undefined,
  };
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
 * Features missing kode stay visible unless they fail a kode/name match they have.
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
  const hasAnyKode = Boolean(kodeKab || kodeKec || kodeDesa);

  if (focus.kodeKab || focus.kabupaten) {
    const kodeHit = Boolean(
      (focus.kodeKab && kodeKab && kodeKab === focus.kodeKab) ||
        (focus.kodeKab && kodeKec && kodeKec.startsWith(focus.kodeKab)) ||
        (focus.kodeKab && kodeDesa && kodeDesa.startsWith(focus.kodeKab))
    );
    const nameHit = Boolean(focus.kabupaten && kabupaten === focus.kabupaten);
    const leftoverNoName = !hasAnyKode && !kabupaten;
    if (!kodeHit && !nameHit && !leftoverNoName) return false;
  }

  if (focus.kodeKecamatan) {
    const kecHit = Boolean(
      (kodeKec && kodeKec === focus.kodeKecamatan) ||
        (kodeDesa && kodeDesa.startsWith(focus.kodeKecamatan))
    );
    const leftover = !kodeKec && !kodeDesa;
    if (!kecHit && !leftover) return false;
  }

  return true;
}

function missingKodeExpr(prop: string): FilterSpecification {
  return [
    "any",
    ["!", ["has", prop]],
    ["==", ["typeof", ["get", prop]], "null"],
    ["==", ["to-string", ["coalesce", ["get", prop], ""]], ""],
    ["==", ["to-string", ["get", prop]], "null"],
  ];
}

function hasKodeExpr(prop: string): FilterSpecification {
  return [
    "all",
    ["has", prop],
    ["!=", ["typeof", ["get", prop]], "null"],
    ["!=", ["to-string", ["coalesce", ["get", prop], ""]], ""],
    ["!=", ["to-string", ["get", prop]], "null"],
  ];
}

function presentKodeEquals(prop: string, value: string): FilterSpecification {
  return [
    "all",
    hasKodeExpr(prop),
    ["==", ["to-string", ["get", prop]], value],
  ];
}

function presentKodePrefix(prop: string, prefix: string): FilterSpecification {
  return [
    "all",
    hasKodeExpr(prop),
    [
      "==",
      ["slice", ["to-string", ["coalesce", ["get", prop], ""]], 0, prefix.length],
      prefix,
    ],
  ];
}

function kabMatchExpr(focus: VillageLodFocus): FilterSpecification {
  const any: FilterSpecification[] = [];
  if (focus.kodeKab) {
    any.push(presentKodeEquals("kode_kab", focus.kodeKab));
    any.push(presentKodeEquals("kode_kabupaten", focus.kodeKab));
    any.push(presentKodePrefix("kode_kecamatan", focus.kodeKab));
    any.push(presentKodePrefix("kode_desa_kelurahan", focus.kodeKab));
  }
  if (focus.kabupaten) {
    any.push(["==", ["get", "kabupaten"], focus.kabupaten]);
  }
  any.push([
    "all",
    ...KODE_PROPS.map((prop) => missingKodeExpr(prop)),
    missingKodeExpr("kabupaten"),
  ]);
  return ["any", ...any];
}

function kecMatchExpr(kodeKecamatan: string): FilterSpecification {
  return [
    "any",
    presentKodeEquals("kode_kecamatan", kodeKecamatan),
    presentKodePrefix("kode_desa_kelurahan", kodeKecamatan),
    ["all", missingKodeExpr("kode_kecamatan"), missingKodeExpr("kode_desa_kelurahan")],
  ];
}

/** MapLibre filter for village-r3p. Undefined = no filter (all features). */
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
  return ["all", ...parts];
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
    0,
    13,
    0.9,
  ],
  "line-opacity": [
    "interpolate",
    ["linear"],
    ["zoom"],
    VILLAGE_OUTLINE_MIN_ZOOM,
    0,
    13,
    0.4,
  ],
} as const;

export function areaOutlinePaint(kind: "kab" | "village"): {
  "line-color": string;
  "line-width": number | unknown[];
  "line-opacity": number | unknown[];
} {
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
  villageTilesActive: boolean
): boolean {
  if (!villageTilesActive) return true;
  return String(props?.level ?? "") === "kab";
}
