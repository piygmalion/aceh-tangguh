"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_VIEW,
  type AreaLayerKey,
  type BasemapId,
  type MapUrlState,
  type MapViewState,
  type MarkerLayerKey,
} from "@/lib/types";
import { isBasemapId } from "@/lib/basemap";
import { DISASTER_JENIS, encodeDisasterJenis } from "@/lib/disaster-jenis";
import {
  canonicalMapUrlPatch,
  parseClusterId,
  parseHazardKind,
  resolveMapUrlAliases,
} from "@/lib/map-url-aliases";
import { FASILITAS_UMUM_LAYER_KEYS } from "@/lib/map-layers-catalog";
import { parseKrbJenis } from "@/lib/krb-by-kab";

export { DEFAULT_LAYERS } from "@/lib/map-url-aliases";

export function useMapUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolved = useMemo(
    () =>
      resolveMapUrlAliases({
        cluster: searchParams.get("cluster"),
        hazard: searchParams.get("hazard"),
        layersRaw: searchParams.get("layers"),
        disasterJenisRaw: searchParams.get("disasterJenis"),
        areaRaw: searchParams.get("area"),
      }),
    [searchParams]
  );

  const state: MapUrlState = useMemo(() => {
    const lat = Number(searchParams.get("lat") ?? DEFAULT_VIEW.latitude);
    const lng = Number(searchParams.get("lng") ?? DEFAULT_VIEW.longitude);
    const z = Number(searchParams.get("z") ?? DEFAULT_VIEW.zoom);
    const basemap = (searchParams.get("basemap") as BasemapId) || "positron";
    return {
      view: {
        latitude: Number.isFinite(lat) ? lat : DEFAULT_VIEW.latitude,
        longitude: Number.isFinite(lng) ? lng : DEFAULT_VIEW.longitude,
        zoom: Number.isFinite(z) ? z : DEFAULT_VIEW.zoom,
      },
      basemap: isBasemapId(basemap) ? basemap : "positron",
      preferVector: searchParams.get("vector") === "1",
      areaLayer: resolved.areaLayer,
      markerLayers: resolved.markerLayers,
      disasterJenis: resolved.disasterJenis,
      hazard: parseHazardKind(searchParams.get("hazard")),
      cluster: parseClusterId(searchParams.get("cluster")),
      selectedId: searchParams.get("selected") || undefined,
      krbJenis: parseKrbJenis(searchParams.get("krbJenis")),
    };
  }, [resolved, searchParams]);

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

  const setPreferVector = useCallback(
    (on: boolean) => push({ vector: on ? "1" : null }),
    [push]
  );

  const setAreaLayer = useCallback(
    (k: AreaLayerKey | null) =>
      push({ area: k, krbJenis: k === "irbi2025" ? state.krbJenis ?? null : null }),
    [push, state.krbJenis]
  );

  const setKrbJenis = useCallback(
    (jenis: string | null) => push({ krbJenis: jenis }),
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

  useEffect(() => {
    if (!resolved.needsCanonicalSync) return;
    push(canonicalMapUrlPatch(resolved));
  }, [push, resolved]);

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

  const toggleFasilitasUmum = useCallback(() => {
    const set = new Set(state.markerLayers);
    const anyOn = FASILITAS_UMUM_LAYER_KEYS.some((k) => set.has(k));
    if (anyOn) {
      for (const k of FASILITAS_UMUM_LAYER_KEYS) set.delete(k);
    } else {
      for (const k of FASILITAS_UMUM_LAYER_KEYS) set.add(k);
    }
    push({ layers: Array.from(set).join(",") || null });
  }, [push, state.markerLayers]);

  return {
    state,
    setView,
    setBasemap,
    setPreferVector,
    setAreaLayer,
    setKrbJenis,
    toggleMarkerLayer,
    toggleDisasterJenis,
    toggleFasilitasUmum,
  };
}
