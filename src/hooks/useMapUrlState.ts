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
  type OverlayLayerKey,
} from "@/lib/types";
import { isBasemapId } from "@/lib/basemap";
import { nextDisasterJenisToggle } from "@/lib/disaster-jenis";
import {
  canonicalMapUrlPatch,
  parseClusterId,
  parseHazardKind,
  resolveMapUrlAliases,
} from "@/lib/map-url-aliases";
import { FASILITAS_UMUM_LAYER_KEYS } from "@/lib/map-layers-catalog";
import { parseKrbJenis } from "@/lib/krb-by-kab";
import {
  encodeOverlayLayers,
  parseOverlayLayers,
} from "@/lib/overlay-layers";
import {
  encodeNasaNrtLayers,
  parseNasaDate,
  parseNasaNrtLayers,
} from "@/lib/nasa-nrt/layers";
import type { NasaNrtLayerKey } from "@/lib/nasa-nrt/types";

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
      krbJenis: parseKrbJenis(searchParams.get("krbJenis")),
      overlays: parseOverlayLayers(searchParams.get("overlays")),
      nasaLayers: parseNasaNrtLayers(searchParams.get("nasa")),
      nasaDate: parseNasaDate(searchParams.get("nasaDate")),
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
      const next = nextDisasterJenisToggle(
        {
          markerLayers: state.markerLayers,
          disasterJenis: state.disasterJenis,
        },
        jenis
      );
      push({
        layers: next.markerLayers.join(",") || null,
        disasterJenis: next.disasterJenisEncoded,
      });
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

  const toggleOverlay = useCallback(
    (key: OverlayLayerKey) => {
      const next = new Set(state.overlays);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      push({ overlays: encodeOverlayLayers(Array.from(next)) });
    },
    [push, state.overlays]
  );

  const toggleNasaLayer = useCallback(
    (key: NasaNrtLayerKey) => {
      const next = new Set(state.nasaLayers);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      push({ nasa: encodeNasaNrtLayers(Array.from(next)) });
    },
    [push, state.nasaLayers],
  );

  const setNasaDate = useCallback(
    (ymd: string) => push({ nasaDate: parseNasaDate(ymd) }),
    [push],
  );

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
    toggleOverlay,
    toggleNasaLayer,
    setNasaDate,
  };
}
