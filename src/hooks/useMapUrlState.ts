"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_VIEW,
  type AreaLayerKey,
  type BasemapId,
  type MapUrlState,
  type MapViewState,
  type MarkerLayerKey,
} from "@/lib/types";

const DEFAULT_LAYERS: MarkerLayerKey[] = ["disasterEvents", "facHealth", "citizenReports"];

function parseLayers(raw: string | null): MarkerLayerKey[] {
  if (!raw) return DEFAULT_LAYERS;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as MarkerLayerKey[];
}

export function useMapUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state: MapUrlState = useMemo(() => {
    const lat = Number(searchParams.get("lat") ?? DEFAULT_VIEW.latitude);
    const lng = Number(searchParams.get("lng") ?? DEFAULT_VIEW.longitude);
    const z = Number(searchParams.get("z") ?? DEFAULT_VIEW.zoom);
    const basemap = (searchParams.get("basemap") as BasemapId) || "positron";
    const area = searchParams.get("area") as AreaLayerKey | null;
    return {
      view: {
        latitude: Number.isFinite(lat) ? lat : DEFAULT_VIEW.latitude,
        longitude: Number.isFinite(lng) ? lng : DEFAULT_VIEW.longitude,
        zoom: Number.isFinite(z) ? z : DEFAULT_VIEW.zoom,
      },
      basemap: ["positron", "dark", "satellite", "streets"].includes(basemap)
        ? basemap
        : "positron",
      areaLayer: area,
      markerLayers: parseLayers(searchParams.get("layers")),
      hazard: (searchParams.get("hazard") as MapUrlState["hazard"]) || undefined,
      cluster: (searchParams.get("cluster") as MapUrlState["cluster"]) || undefined,
      selectedId: searchParams.get("selected") || undefined,
    };
  }, [searchParams]);

  const push = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      });
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setView = useCallback(
    (v: Partial<MapViewState>) => {
      push({
        lat: String(v.latitude ?? state.view.latitude),
        lng: String(v.longitude ?? state.view.longitude),
        z: String(v.zoom ?? state.view.zoom),
      });
    },
    [push, state.view]
  );

  const setBasemap = useCallback((b: BasemapId) => push({ basemap: b }), [push]);

  const setAreaLayer = useCallback(
    (k: AreaLayerKey | null) => push({ area: k }),
    [push]
  );

  const toggleMarkerLayer = useCallback(
    (k: MarkerLayerKey) => {
      const set = new Set(state.markerLayers);
      if (set.has(k)) set.delete(k);
      else set.add(k);
      push({ layers: Array.from(set).join(",") || null });
    },
    [push, state.markerLayers]
  );

  return { state, setView, setBasemap, setAreaLayer, toggleMarkerLayer };
}
