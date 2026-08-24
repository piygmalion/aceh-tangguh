import type {
  AreaLayerKey,
  ClusterId,
  HazardKind,
  MarkerLayerKey,
} from "@/lib/types";
import { encodeDisasterJenis, parseDisasterJenis } from "@/lib/disaster-jenis";
import {
  LIVE_MARKER_LAYER_KEYS,
  REMOVED_MARKER_LAYER_KEYS,
  RETIRED_MARKER_LAYER_KEYS,
} from "@/lib/map-layers-catalog";

const KNOWN_MARKER_LAYER_KEYS = new Set<string>([
  ...LIVE_MARKER_LAYER_KEYS,
  ...RETIRED_MARKER_LAYER_KEYS,
]);
const REMOVED_LAYER_SET = new Set<string>(REMOVED_MARKER_LAYER_KEYS);

/** Live Partisipasi layers that replaced the single `citizenReports` key. */
export const PARTICIPATION_LAYER_KEYS = [
  "laporanKejadian",
  "laporanPenanganan",
] as const satisfies readonly MarkerLayerKey[];

/**
 * Soft URL alias: old `?layers=citizenReports` → `laporanKejadian` only
 * (the previous overlay was kejadian-only). Then the token is treated as
 * removed (helipad pattern) so it never stays in the toolbar or URL.
 */
export const MARKER_LAYER_ALIASES: Record<string, readonly MarkerLayerKey[]> = {
  citizenReports: ["laporanKejadian"],
};

/** Default public map layers when `layers` is omitted. */
export const DEFAULT_LAYERS = [
  "disasterEvents",
  "facHealth",
  "laporanKejadian",
] as const satisfies readonly MarkerLayerKey[];

const CLUSTER_IDS: readonly ClusterId[] = [
  "sar",
  "logistik",
  "pengungsian",
  "kesehatan",
  "pendidikan",
  "pemulihan",
];

const HAZARD_KINDS: readonly HazardKind[] = [
  "banjir",
  "longsor",
  "gempa",
  "kebakaran",
  "lainnya",
];

export type ClusterLayerPreset = {
  markerLayers: MarkerLayerKey[];
  /** Optional choropleth; omitted unless a cluster has a clear area fit. */
  areaLayer?: AreaLayerKey;
};

/**
 * Homepage `?cluster=` aliases → marker layers.
 *
 * Posko / tendPoints were removed from the toolbar — do not map clusters
 * back onto those keys.
 *
 * - sar / pemulihan → disaster events + laporan kejadian
 * - logistik → disaster events + road/bridge infra
 * - pengungsian → disaster events + laporan kejadian (shelter layers retired)
 * - kesehatan → health facilities
 * - pendidikan → education facilities
 */
export const CLUSTER_TO_LAYERS: Record<ClusterId, ClusterLayerPreset> = {
  sar: { markerLayers: ["disasterEvents", "laporanKejadian"] },
  pemulihan: { markerLayers: ["disasterEvents", "laporanKejadian"] },
  logistik: { markerLayers: ["disasterEvents", "infraRoadBridge"] },
  pengungsian: { markerLayers: ["disasterEvents", "laporanKejadian"] },
  kesehatan: { markerLayers: ["facHealth"] },
  pendidikan: { markerLayers: ["facEducation"] },
};

/**
 * Homepage `?hazard=` aliases → `disasterJenis` filter (jenis_bencana values).
 * Always implies the `disasterEvents` parent layer.
 *
 * Keys match `HazardKind` / HazardStatusStrip chips.
 */
export const HAZARD_TO_DISASTER_JENIS: Record<HazardKind, string[]> = {
  banjir: ["Banjir", "Banjir Bandang", "Banjir Bandang dan Tanah Longsor"],
  longsor: ["Longsor", "Tanah Longsor", "Banjir Bandang dan Tanah Longsor"],
  gempa: ["Gempa Bumi"],
  kebakaran: ["Kebakaran", "Kebakaran Hutan dan Lahan", "Kebakaran Pemukiman"],
  lainnya: ["Lainnya", "Angin Puting Beliung", "Abrasi", "Kekeringan"],
};

export function parseClusterId(raw: string | null | undefined): ClusterId | undefined {
  if (!raw) return undefined;
  return CLUSTER_IDS.includes(raw as ClusterId) ? (raw as ClusterId) : undefined;
}

export function parseHazardKind(raw: string | null | undefined): HazardKind | undefined {
  if (!raw) return undefined;
  return HAZARD_KINDS.includes(raw as HazardKind) ? (raw as HazardKind) : undefined;
}

export function expandMarkerLayerKeys(keys: readonly string[]): MarkerLayerKey[] {
  const seen = new Set<MarkerLayerKey>();
  const out: MarkerLayerKey[] = [];
  for (const raw of keys) {
    const mapped: readonly string[] = MARKER_LAYER_ALIASES[raw] ?? [raw];
    for (const key of mapped) {
      if (!KNOWN_MARKER_LAYER_KEYS.has(key) || REMOVED_LAYER_SET.has(key)) continue;
      const typed = key as MarkerLayerKey;
      if (seen.has(typed)) continue;
      seen.add(typed);
      out.push(typed);
    }
  }
  return out;
}

export function layersRawHasCitizenReportsAlias(raw: string | null): boolean {
  if (!raw) return false;
  return raw.split(",").some((s) => s.trim() === "citizenReports");
}

export function parseMarkerLayers(raw: string | null): MarkerLayerKey[] {
  if (!raw) return [...DEFAULT_LAYERS];
  return expandMarkerLayerKeys(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export type ResolvedMapUrlAliases = {
  markerLayers: MarkerLayerKey[];
  disasterJenis: string[];
  areaLayer: AreaLayerKey | null;
  /** True when cluster/hazard query params need to be rewritten away. */
  needsCanonicalSync: boolean;
};

/**
 * Resolve `cluster` / `hazard` query aliases into canonical layer state.
 *
 * - `cluster` applies only when `layers` is absent (explicit layers win).
 * - `hazard` applies only when `disasterJenis` is absent; enables disasterEvents.
 */
export function resolveMapUrlAliases(input: {
  cluster: string | null;
  hazard: string | null;
  layersRaw: string | null;
  disasterJenisRaw: string | null;
  areaRaw: string | null;
}): ResolvedMapUrlAliases {
  const cluster = parseClusterId(input.cluster);
  const hazard = parseHazardKind(input.hazard);
  const hasAliasParam = Boolean(input.cluster || input.hazard);
  const hasCitizenReportsAlias = layersRawHasCitizenReportsAlias(input.layersRaw);

  let markerLayers = parseMarkerLayers(input.layersRaw);
  let disasterJenis = parseDisasterJenis(input.disasterJenisRaw);
  let areaLayer = (input.areaRaw as AreaLayerKey | null) || null;

  if (cluster && !input.layersRaw) {
    const preset = CLUSTER_TO_LAYERS[cluster];
    markerLayers = [...preset.markerLayers];
    if (preset.areaLayer && !input.areaRaw) {
      areaLayer = preset.areaLayer;
    }
  }

  if (hazard && !input.disasterJenisRaw) {
    disasterJenis = [...HAZARD_TO_DISASTER_JENIS[hazard]];
    if (!markerLayers.includes("disasterEvents")) {
      markerLayers = ["disasterEvents", ...markerLayers];
    }
  }

  return {
    markerLayers,
    disasterJenis,
    areaLayer,
    needsCanonicalSync: hasAliasParam || hasCitizenReportsAlias,
  };
}

/** Canonical query patch after applying cluster/hazard aliases. */
export function canonicalMapUrlPatch(resolved: ResolvedMapUrlAliases): Record<
  string,
  string | null
> {
  return {
    layers: resolved.markerLayers.join(",") || null,
    disasterJenis: encodeDisasterJenis(resolved.disasterJenis),
    area: resolved.areaLayer,
    cluster: null,
    hazard: null,
  };
}
