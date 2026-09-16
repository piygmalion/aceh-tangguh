import { ACEH_BBOX } from "@/lib/aceh-scope";
import {
  NASA_NRT_LAYER_KEYS,
  type NasaNrtLayerKey,
} from "./types";

const NASA_SET = new Set<string>(NASA_NRT_LAYER_KEYS);

export function isNasaNrtLayerKey(value: string): value is NasaNrtLayerKey {
  return NASA_SET.has(value);
}

export function parseNasaNrtLayers(raw: string | null | undefined): NasaNrtLayerKey[] {
  if (!raw) return [];
  const seen = new Set<NasaNrtLayerKey>();
  const out: NasaNrtLayerKey[] = [];
  for (const token of raw.split(",")) {
    const key = token.trim();
    if (!isNasaNrtLayerKey(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function encodeNasaNrtLayers(keys: NasaNrtLayerKey[]): string | null {
  return keys.length ? keys.join(",") : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function utcYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** AN-57: default GIBS day is UTC yesterday (P1D lag). */
export function defaultGibsDate(now: Date = new Date()): string {
  const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  y.setUTCDate(y.getUTCDate() - 1);
  return utcYmd(y);
}

export function parseNasaDate(
  raw: string | null | undefined,
  now: Date = new Date(),
): string {
  const fallback = defaultGibsDate(now);
  if (!raw || !DATE_RE.test(raw)) return fallback;
  const [ys, ms, ds] = raw.split("-").map(Number);
  const candidate = Date.UTC(ys, ms - 1, ds);
  if (!Number.isFinite(candidate)) return fallback;
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (candidate > todayUtc) return fallback;
  return raw;
}

export const GIBS_TRUE_COLOR = {
  key: "gibsTrueColor" as const,
  layer: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
  tileMatrixSet: "GoogleMapsCompatible_Level9",
  ext: "jpg",
  maxzoom: 9,
};

export const GIBS_THERMAL = {
  key: "gibsThermal" as const,
  layer: "VIIRS_SNPP_Thermal_Anomalies_375m_Night",
  tileMatrixSet: "GoogleMapsCompatible_Level8",
  ext: "png",
  maxzoom: 8,
};

export const GIBS_ATTRIBUTION = "NASA EOSDIS GIBS";

export function gibsTileUrl(
  product: typeof GIBS_TRUE_COLOR | typeof GIBS_THERMAL,
  time: string,
): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${product.layer}/default/${time}/${product.tileMatrixSet}/{z}/{y}/{x}.${product.ext}`;
}

export function worldviewHref(time: string, layers: string[]): string {
  const [west, south, east, north] = ACEH_BBOX;
  const l = layers.length
    ? layers.join(",")
    : GIBS_TRUE_COLOR.layer;
  return `https://worldview.earthdata.nasa.gov/?v=${west},${south},${east},${north}&t=${time}&l=${encodeURIComponent(l)}`;
}
