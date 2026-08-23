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
import {
  DISASTER_JENIS,
  encodeDisasterJenis,
  parseDisasterJenis,
} from "@/lib/disaster-jenis";

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
      disasterJenis: parseDisasterJenis(searchParams.get("disasterJenis")),
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
      if (k === "disasterEvents") {
        if (set.has(k)) {
          set.delete(k);
          push({
            layers: Array.from(set).join(",") || null,
            disasterJenis: null,
          });
        } else {
          set.add(k);
          // Parent ON → all jenis (empty disasterJenis)
          push({
            layers: Array.from(set).join(",") || null,
            disasterJenis: null,
          });
        }
        return;
      }
      if (set.has(k)) set.delete(k);
      else set.add(k);
      push({ layers: Array.from(set).join(",") || null });
    },
    [push, state.markerLayers]
  );

  const toggleDisasterJenis = useCallback(
    (jenis: string) => {
      const parentOn = state.markerLayers.includes("disasterEvents");
      if (!parentOn) return;

      const all = DISASTER_JENIS as readonly string[];
      const current = state.disasterJenis;
      // empty = all active
      const active = current.length === 0 ? new Set(all) : new Set(current);

      if (active.has(jenis)) {
        active.delete(jenis);
        if (active.size === 0) {
          // Last child off → turn parent off
          const layers = state.markerLayers.filter((l) => l !== "disasterEvents");
          push({
            layers: layers.join(",") || null,
            disasterJenis: null,
          });
          return;
        }
      } else {
        active.add(jenis);
      }

      // If resulting set equals all jenis, clear param (empty = all)
      if (active.size === all.length && all.every((j) => active.has(j))) {
        push({ disasterJenis: null });
        return;
      }
      push({ disasterJenis: encodeDisasterJenis(Array.from(active)) });
    },
    [push, state.disasterJenis, state.markerLayers]
  );

  return {
    state,
    setView,
    setBasemap,
    setAreaLayer,
    toggleMarkerLayer,
    toggleDisasterJenis,
  };
}
