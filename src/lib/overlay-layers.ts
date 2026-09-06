import type { OverlayLayerKey } from "./types";
import { COLOR_TOKENS } from "./layer-colors";

/**
 * Geospasial overlays (Ruang Kita-inspired). Independent of marker `?layers=`
 * and distribusi `?area=`. Default off. Shareable via `?overlays=`.
 */
export type { OverlayLayerKey } from "./types";

export type OverlayKind = "point" | "fill" | "line" | "raster";

export type OverlayCatalogEntry = {
  key: OverlayLayerKey;
  kind: OverlayKind;
  group: "maritime" | "live" | "faults" | "bahaya";
  color: string;
};

export const OVERLAY_LAYER_KEYS: OverlayLayerKey[] = [
  "maritimePorts",
  "maritimeWaters",
  "bmkgQuakes",
  "magmaQuakes",
  "magmaVolcanoes",
  "sipongiHotspots",
  "tatonasStations",
  "seismicSensors",
  "inariskSumateraFault",
  "inariskMegathrust",
  "inariskBahayaGempa",
  "inariskBahayaTsunami",
  "inariskBahayaLongsor",
  "inariskBahayaBanjir",
  "inariskBahayaKarhutla",
  "inariskBahayaGunungApi",
];

export const OVERLAY_CATALOG: OverlayCatalogEntry[] = [
  { key: "maritimePorts", kind: "point", group: "maritime", color: COLOR_TOKENS.teal },
  { key: "maritimeWaters", kind: "fill", group: "maritime", color: COLOR_TOKENS.teal },
  { key: "bmkgQuakes", kind: "point", group: "live", color: COLOR_TOKENS.orange },
  { key: "magmaQuakes", kind: "point", group: "live", color: COLOR_TOKENS.gold },
  { key: "magmaVolcanoes", kind: "point", group: "live", color: COLOR_TOKENS.awas },
  { key: "sipongiHotspots", kind: "point", group: "live", color: COLOR_TOKENS.awas },
  { key: "tatonasStations", kind: "point", group: "live", color: COLOR_TOKENS.teal },
  { key: "seismicSensors", kind: "point", group: "live", color: COLOR_TOKENS.ink },
  {
    key: "inariskSumateraFault",
    kind: "line",
    group: "faults",
    color: COLOR_TOKENS.orange,
  },
  {
    key: "inariskMegathrust",
    kind: "fill",
    group: "faults",
    color: COLOR_TOKENS.awas,
  },
  {
    key: "inariskBahayaGempa",
    kind: "fill",
    group: "bahaya",
    color: COLOR_TOKENS.orange,
  },
  {
    key: "inariskBahayaTsunami",
    kind: "fill",
    group: "bahaya",
    color: COLOR_TOKENS.teal,
  },
  {
    key: "inariskBahayaLongsor",
    kind: "fill",
    group: "bahaya",
    color: COLOR_TOKENS.gold,
  },
  {
    key: "inariskBahayaBanjir",
    kind: "fill",
    group: "bahaya",
    color: COLOR_TOKENS.teal,
  },
  {
    key: "inariskBahayaKarhutla",
    kind: "fill",
    group: "bahaya",
    color: COLOR_TOKENS.awas,
  },
  {
    key: "inariskBahayaGunungApi",
    kind: "fill",
    group: "bahaya",
    color: COLOR_TOKENS.awas,
  },
];

const OVERLAY_SET = new Set<string>(OVERLAY_LAYER_KEYS);

export function isOverlayLayerKey(value: string): value is OverlayLayerKey {
  return OVERLAY_SET.has(value);
}

export function parseOverlayLayers(raw: string | null | undefined): OverlayLayerKey[] {
  if (!raw) return [];
  const seen = new Set<OverlayLayerKey>();
  const out: OverlayLayerKey[] = [];
  for (const token of raw.split(",")) {
    const key = token.trim();
    if (!isOverlayLayerKey(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function encodeOverlayLayers(keys: OverlayLayerKey[]): string | null {
  return keys.length ? keys.join(",") : null;
}

export function overlayColor(key: OverlayLayerKey): string {
  return OVERLAY_CATALOG.find((row) => row.key === key)?.color ?? COLOR_TOKENS.ink;
}

export const OVERLAY_TOOLBAR_GROUPS: {
  group: OverlayCatalogEntry["group"];
  labelKey: string;
  options: OverlayLayerKey[];
}[] = [
  {
    group: "maritime",
    labelKey: "overlayGroupMaritime",
    options: ["maritimePorts", "maritimeWaters"],
  },
  {
    group: "live",
    labelKey: "overlayGroupLive",
    options: [
      "bmkgQuakes",
      "magmaQuakes",
      "magmaVolcanoes",
      "sipongiHotspots",
      "tatonasStations",
      "seismicSensors",
    ],
  },
  {
    group: "faults",
    labelKey: "overlayGroupFaults",
    options: ["inariskSumateraFault", "inariskMegathrust"],
  },
  {
    group: "bahaya",
    labelKey: "overlayGroupBahaya",
    options: [
      "inariskBahayaGempa",
      "inariskBahayaTsunami",
      "inariskBahayaLongsor",
      "inariskBahayaBanjir",
      "inariskBahayaKarhutla",
      "inariskBahayaGunungApi",
    ],
  },
];

/** BMKG Maritim water-region codes covering Aceh operations. */
export const ACEH_PERAIRAN_CODES = [
  "P.A.01",
  "P.A.02",
  "P.A.03",
  "P.A.04",
  "P.A.05",
  "P.A.06",
  "P.A.07",
  "P.A.08",
  "M.01",
  "M.03",
] as const;

export const ACEH_PERAIRAN_CODE_SET = new Set<string>(ACEH_PERAIRAN_CODES);

export const OVERLAY_STATIC_FIXTURES: Partial<Record<OverlayLayerKey, string>> = {
  maritimePorts: "/fixtures/overlays/pelabuhan-aceh.geojson",
  maritimeWaters: "/fixtures/overlays/perairan-aceh.geojson",
  seismicSensors: "/fixtures/overlays/sensor-seismic-aceh.geojson",
  inariskSumateraFault: "/fixtures/overlays/sumatera-fault-aceh.geojson",
  inariskMegathrust: "/fixtures/overlays/megathrust-aceh.geojson",
  inariskBahayaGempa: "/fixtures/overlays/bahaya-gempa-aceh.geojson",
  inariskBahayaTsunami: "/fixtures/overlays/bahaya-tsunami-aceh.geojson",
  inariskBahayaLongsor: "/fixtures/overlays/bahaya-longsor-aceh.geojson",
  inariskBahayaBanjir: "/fixtures/overlays/bahaya-banjir-aceh.geojson",
  inariskBahayaKarhutla: "/fixtures/overlays/bahaya-karhutla-aceh.geojson",
  inariskBahayaGunungApi: "/fixtures/overlays/bahaya-gunungapi-aceh.geojson",
};

export const MARITIME_WAVE_LEGEND: { color: string; labelKey: string }[] = [
  { color: COLOR_TOKENS.sage, labelKey: "waveTenang" },
  { color: COLOR_TOKENS.teal, labelKey: "waveRendah" },
  { color: COLOR_TOKENS.gold, labelKey: "waveSedang" },
  { color: COLOR_TOKENS.orange, labelKey: "waveTinggi" },
  { color: COLOR_TOKENS.awas, labelKey: "waveEkstrem" },
];

export function overlayCatalogEntry(key: OverlayLayerKey): OverlayCatalogEntry | undefined {
  return OVERLAY_CATALOG.find((row) => row.key === key);
}

export function overlaySourceId(key: OverlayLayerKey): string {
  return `overlay-src-${key}`;
}

export function overlayFillLayerId(key: OverlayLayerKey): string {
  return `overlay-${key}-fill`;
}

export function overlayLineLayerId(key: OverlayLayerKey): string {
  return `overlay-${key}-line`;
}

export function overlayCircleLayerId(key: OverlayLayerKey): string {
  return `overlay-${key}-circle`;
}

export function overlaySymbolLayerId(key: OverlayLayerKey): string {
  return `overlay-${key}-symbol`;
}

export function overlayRasterLayerId(key: OverlayLayerKey): string {
  return `overlay-${key}-raster`;
}

export function overlayKeyFromLayerId(id: string | undefined): OverlayLayerKey | null {
  if (!id?.startsWith("overlay-")) return null;
  const rest = id.slice("overlay-".length);
  const match = /^(.*)-(fill|line|circle|raster|symbol)$/.exec(rest);
  if (!match) return null;
  return isOverlayLayerKey(match[1]) ? match[1] : null;
}

export function overlayInteractiveLayerIds(
  keys: OverlayLayerKey[],
  opts?: { pointAsSymbol?: boolean },
): string[] {
  const ids: string[] = [];
  for (const key of keys) {
    const kind = overlayCatalogEntry(key)?.kind;
    if (!kind || kind === "raster") continue;
    if (kind === "point") {
      // Both ids: clicks stay live while chrome icons swap circle → symbol.
      if (opts?.pointAsSymbol) {
        ids.push(overlaySymbolLayerId(key), overlayCircleLayerId(key));
      } else {
        ids.push(overlayCircleLayerId(key), overlaySymbolLayerId(key));
      }
    }
    if (kind === "fill") {
      ids.push(overlayFillLayerId(key));
      ids.push(overlayLineLayerId(key));
    }
    if (kind === "line") ids.push(overlayLineLayerId(key));
  }
  return ids;
}
