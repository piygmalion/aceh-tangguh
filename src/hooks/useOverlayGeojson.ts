"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import type { FeatureCollection } from "geojson";
import { overlayVectorApiPath } from "@/lib/overlay-paths";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import type { OverlayLayerKey } from "@/lib/types";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

/** Live overlay keys that must surface BE-1 stale / upstream — not static InaRISK fixtures. */
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
  const res = await fetchPublicApi(overlayVectorApiPath(key));
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

export function liveOverlayKeysForRetry(
  overlays: readonly OverlayLayerKey[],
): LiveOverlayStatusKey[] {
  return LIVE_OVERLAY_STATUS_KEYS.filter((key) => overlays.includes(key));
}

export type LiveOverlayStatus = {
  healthByKey: Partial<Record<LiveOverlayStatusKey, OverlayHealth>>;
  alert: OverlayHealth | null;
  pending: boolean;
  fetching: boolean;
  refetch: () => void;
};

export function useLiveOverlayStatus(overlays: OverlayLayerKey[]): LiveOverlayStatus {
  const queryClient = useQueryClient();
  const queries = useQueries({
    queries: LIVE_OVERLAY_STATUS_KEYS.map((key) => ({
      queryKey: qk.overlay(key),
      queryFn: () => fetchOverlayGeojson(key),
      enabled: overlays.includes(key),
      staleTime: 60_000,
    })),
  });

  const healthByKey: Partial<Record<LiveOverlayStatusKey, OverlayHealth>> = {};
  let pending = false;
  let fetching = false;
  LIVE_OVERLAY_STATUS_KEYS.forEach((key, index) => {
    if (!overlays.includes(key)) return;
    const query = queries[index];
    if (query.isPending) pending = true;
    if (query.isFetching) fetching = true;
    if (query.isError) {
      healthByKey[key] = "failed";
      return;
    }
    if (query.data) healthByKey[key] = query.data.health;
  });

  return {
    healthByKey,
    alert: strongestLiveOverlayAlert(healthByKey),
    pending,
    fetching,
    refetch: () => {
      for (const key of liveOverlayKeysForRetry(overlays)) {
        void queryClient.invalidateQueries({ queryKey: qk.overlay(key) });
      }
    },
  };
}

export function useLiveOverlayHealth(
  overlays: OverlayLayerKey[],
): Partial<Record<LiveOverlayStatusKey, OverlayHealth>> {
  return useLiveOverlayStatus(overlays).healthByKey;
}

export function strongestLiveOverlayAlert(
  healthByKey: Partial<Record<LiveOverlayStatusKey, OverlayHealth>>,
): OverlayHealth | null {
  const values = Object.values(healthByKey);
  if (values.includes("upstream") || values.includes("failed")) return "upstream";
  if (values.includes("stale")) return "stale";
  return null;
}
