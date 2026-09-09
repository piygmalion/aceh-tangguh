import type { Feature, Point } from "geojson";
import type { BasemapId, MarkerLayerKey } from "@/lib/types";
import { STATUS_HEX } from "@/lib/chart-colors";
import { COLOR_TOKENS } from "@/lib/layer-colors";
import { isTruncatedAcehLongitude, isTruncatedCoordQuality } from "@/lib/coord-quality";
import { TYPE_FLOOR_PX } from "@/lib/type-floor";

/** MapLibre circle-radius — 7px haloed dots. */
export const MAP_DOT_RADIUS_PX = 7;
export const MAP_DOT_STROKE_PX = 1.5;
export const MAP_PAPER_STROKE = COLOR_TOKENS.paper;
/** Dark ring for light grey canvases (Carto Positron / brand-light / brand-grey). */
export const MAP_LIGHT_CANVAS_STROKE = COLOR_TOKENS.ink;

const LIGHT_CANVAS_BASEMAPS = new Set<BasemapId>([
  "positron",
  "streets",
  "brand-light",
  "brand-grey",
]);

/**
 * Stroke that sits on the ground. Paper (~1.15:1) disappears on Carto Positron
 * and other light grey presets; ink reads on those canvases. Dark canvas and
 * imagery keep paper.
 */
export function markerHaloStroke(basemap: BasemapId): string {
  return LIGHT_CANVAS_BASEMAPS.has(basemap)
    ? MAP_LIGHT_CANVAS_STROKE
    : MAP_PAPER_STROKE;
}

/** High-zoom pin: 24px glyph on a 28px charcoal/paper disc. */
export const MAP_PIN_DISC_PX = 28;
export const MAP_PIN_GLYPH_PX = 24;

/** Toolbar face: 20px glyph on a 32px charcoal/paper disc. */
export const TOOLBAR_DISC_PX = 32;
export const TOOLBAR_GLYPH_PX = 20;

/** +1 zoom clicks from DEFAULT_VIEW (z=7) before unclustered icons appear. */
export const MAP_ICON_ZOOM_STEPS = 3;
/** First zoom at which clustered points split into icons (7 + 3). */
export const MAP_UNCLUSTERED_ICON_ZOOM = 10;
/** Unclustered pins only after the third +1 from DEFAULT_VIEW (FE-47). */
export const MAP_ICON_MIN_ZOOM = MAP_UNCLUSTERED_ICON_ZOOM;
/** Haloed GPU dots below icon zoom, and while chrome icons are still loading. */
export const MAP_DOT_MAX_ZOOM = MAP_UNCLUSTERED_ICON_ZOOM;
/** Cluster through z=9; unclustered icons from z=10. */
export const MAP_CLUSTER_MAX_ZOOM = MAP_UNCLUSTERED_ICON_ZOOM - 1;

/** Supercluster radius — wide enough that overview shows numbered groups, not a pin field. */
export const MAP_CLUSTER_RADIUS = 80;
/** Paper disc + status-token ring so clusters read as counts, not 7px dots. */
export const MAP_CLUSTER_FILL = COLOR_TOKENS.paper;
export const MAP_CLUSTER_RING_WIDTH_PX = 4;
export const MAP_CLUSTER_COUNT_TEXT_PX = TYPE_FLOOR_PX;

/** Count breaks for ring color / radius. Density only — not invented casualty severity. */
export const MAP_CLUSTER_COUNT_STEPS = Object.freeze({ mid: 25, high: 80 });

export function clusterCircleRadiusExpr(): unknown[] {
  return [
    "step",
    ["get", "point_count"],
    ["interpolate", ["linear"], ["zoom"], 6, 36, 10, 26],
    MAP_CLUSTER_COUNT_STEPS.mid,
    ["interpolate", ["linear"], ["zoom"], 6, 46, 10, 34],
    MAP_CLUSTER_COUNT_STEPS.high,
    ["interpolate", ["linear"], ["zoom"], 6, 56, 10, 42],
  ];
}

/** Ring uses forest/sage/status tokens from existing point_count. No victim ranks. */
export function clusterRingColorExpr(): unknown[] {
  return [
    "step",
    ["get", "point_count"],
    STATUS_HEX.RENDAH,
    MAP_CLUSTER_COUNT_STEPS.mid,
    STATUS_HEX.SEDANG,
    MAP_CLUSTER_COUNT_STEPS.high,
    STATUS_HEX.TINGGI,
  ];
}

export function clusterCountTextColor(): string {
  return COLOR_TOKENS.ink;
}

export type MarkerRenderMode = "dot" | "approx" | "pin" | "stack";

export type StackMember = {
  id: string;
  title: string;
  status: string;
  jenisBencana: string;
  color: string;
};

export function isUnknownDesaLabel(value: unknown): boolean {
  return String(value ?? "").trim() === "-";
}

export function featurePointId(feature: Feature): string {
  if (feature.id != null) return String(feature.id);
  const props = feature.properties ?? {};
  if (props.id != null) return String(props.id);
  return "";
}

export function centroidKey(lon: number, lat: number): string {
  return `${lon},${lat}`;
}

/**
 * desa='-' (or missing desa on fixture markers) share centroids and must stack.
 * Named desa keep individual pins even when two rows collide.
 */
export function shouldStackDisasterCentroid(
  layer: unknown,
  desa: unknown
): boolean {
  if (layer !== "disasterEvents") return false;
  if (desa == null || String(desa).trim() === "") return true;
  return isUnknownDesaLabel(desa);
}

export function annotateDisasterDesa<T extends Feature>(
  feature: T,
  desaById: ReadonlyMap<string, string>
): T {
  if (feature.properties?.layer !== "disasterEvents") return feature;
  const id = featurePointId(feature);
  if (!id || !desaById.has(id)) return feature;
  const desa = desaById.get(id);
  if (desa == null) return feature;
  return {
    ...feature,
    properties: {
      ...(feature.properties ?? {}),
      desa,
    },
  };
}

export function desaByIdFromKejadian(
  rows: ReadonlyArray<{ id?: string; lokasi?: { desa?: string }; desa?: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!row.id) continue;
    const desa = row.lokasi?.desa ?? row.desa ?? "";
    map.set(row.id, desa);
  }
  return map;
}

export function markerRenderMode(input: {
  layer: MarkerLayerKey | string;
  lon: unknown;
  coordQuality?: unknown;
  stackCount?: unknown;
}): MarkerRenderMode {
  const stackCount = Number(input.stackCount ?? 0);
  if (Number.isFinite(stackCount) && stackCount > 1) return "stack";
  if (input.layer === "policeOffices") {
    if (isTruncatedCoordQuality(input.coordQuality) || isTruncatedAcehLongitude(input.lon)) {
      return "approx";
    }
  }
  return "pin";
}

export function parseStackItems(raw: unknown): StackMember[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is StackMember => {
      return Boolean(item && typeof item === "object" && "id" in item);
    }) as StackMember[];
  }
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseStackItems(parsed);
  } catch {
    return [];
  }
}

/**
 * Collapse coincident disasterEvents with desa='-' onto one stacked feature.
 * Keeps every member id in `stackItems`. Does not invent or jitter coordinates.
 */
export function stackSharedCentroidDisasterEvents<T extends Feature<Point>>(
  features: T[]
): T[] {
  const groups = new Map<string, T[]>();
  const passthrough: T[] = [];

  for (const feature of features) {
    const layer = feature.properties?.layer;
    const desa = feature.properties?.desa;
    if (!shouldStackDisasterCentroid(layer, desa)) {
      passthrough.push(feature);
      continue;
    }
    const [lon, lat] = feature.geometry.coordinates;
    const key = centroidKey(lon, lat);
    const list = groups.get(key);
    if (list) list.push(feature);
    else groups.set(key, [feature]);
  }

  const stacked: T[] = [];
  for (const group of Array.from(groups.values())) {
    if (group.length === 1) {
      stacked.push(group[0]);
      continue;
    }
    const first = group[0];
    const members: StackMember[] = group.map((feature: T) => ({
      id: featurePointId(feature),
      title: String(feature.properties?.title ?? "Titik"),
      status: String(feature.properties?.status ?? ""),
      jenisBencana: String(
        feature.properties?.jenisBencana ?? feature.properties?.jenis_bencana ?? ""
      ),
      color: String(feature.properties?.color ?? ""),
    }));
    stacked.push({
      ...first,
      properties: {
        ...(first.properties ?? {}),
        renderMode: "stack",
        stackCount: group.length,
        stackItems: JSON.stringify(members),
      },
    });
  }

  return [...passthrough, ...stacked];
}
