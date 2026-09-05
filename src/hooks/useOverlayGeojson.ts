"use client";

import { useQueries } from "@tanstack/react-query";
import type { FeatureCollection } from "geojson";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import type { OverlayLayerKey } from "@/lib/types";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

/** Live overlay keys that must surface BE-1 stale / upstream — not InaRISK raster. */
export const LIVE_OVERLAY_STATUS_KEYS = [
  "bmkgQuakes",
  "magmaQuakes",
  "magmaVolcanoes",
  "sipongiHotspots",
  "tatonasStations",
] as const;

export type LiveOverlayStatusKey = (typeof LIVE_OVERLAY_STATUS_KEYS)[number];

export type OverlayHealth = "ok" | "stale" | "upstream" | "failed";

export type OverlayFetchResult = {
  collection: FeatureCollection;
  httpStatus: number;
  stale: boolean;
  error: "upstream" | null;
  health: OverlayHealth;
};

export function isLiveOverlayStatusKey(
  key: OverlayLayerKey,
): key is LiveOverlayStatusKey {
  return (LIVE_OVERLAY_STATUS_KEYS as readonly string[]).includes(key);
}

function asFeatureCollection(body: unknown): FeatureCollection | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as { type?: unknown; features?: unknown };
  if (rec.type !== "FeatureCollection" || !Array.isArray(rec.features)) {
    return null;
  }
  return { type: "FeatureCollection", features: rec.features };
}

function readStale(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const stale = (body as { stale?: unknown }).stale;
  return stale === true || stale === "true";
}

function readUpstream(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  return (body as { error?: unknown }).error === "upstream";
}

export function classifyOverlayHealth(input: {
  ok: boolean;
  status: number;
  stale: boolean;
  upstream: boolean;
}): OverlayHealth {
  if (input.upstream || input.status === 503) return "upstream";
  if (input.stale) return "stale";
  if (!input.ok) return "failed";
  return "ok";
}

/** Keep features when the body is a FeatureCollection, including HTTP 503. */
export function parseOverlayResponse(input: {
  ok: boolean;
  status: number;
  body: unknown;
}): OverlayFetchResult {
  const collection = asFeatureCollection(input.body) ?? EMPTY_FC;
  const stale = readStale(input.body);
  const upstream = readUpstream(input.body);
  const health = classifyOverlayHealth({
    ok: input.ok,
    status: input.status,
    stale,
    upstream,
  });
  return {
    collection,
    httpStatus: input.status,
    stale: stale || health === "stale" || health === "upstream",
    error: upstream ? "upstream" : null,
    health,
  };
}

export async function fetchOverlayGeojson(
  key: OverlayLayerKey,
): Promise<OverlayFetchResult> {
  const res = await fetchPublicApi(`/api/overlay/${key}`);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return parseOverlayResponse({
    ok: res.ok,
    status: res.status,
    body,
  });
}

export function useLiveOverlayHealth(
  overlays: OverlayLayerKey[],
): Partial<Record<LiveOverlayStatusKey, OverlayHealth>> {
  const queries = useQueries({
    queries: LIVE_OVERLAY_STATUS_KEYS.map((key) => ({
      queryKey: qk.overlay(key),
      queryFn: () => fetchOverlayGeojson(key),
      enabled: overlays.includes(key),
      staleTime: 60_000,
    })),
  });

  const out: Partial<Record<LiveOverlayStatusKey, OverlayHealth>> = {};
  LIVE_OVERLAY_STATUS_KEYS.forEach((key, index) => {
    if (!overlays.includes(key)) return;
    const query = queries[index];
    if (query.isError) {
      out[key] = "failed";
      return;
    }
    if (query.data) out[key] = query.data.health;
  });
  return out;
}

export function strongestLiveOverlayAlert(
  healthByKey: Partial<Record<LiveOverlayStatusKey, OverlayHealth>>,
): OverlayHealth | null {
  const values = Object.values(healthByKey);
  if (values.includes("upstream") || values.includes("failed")) return "upstream";
  if (values.includes("stale")) return "stale";
  return null;
}
