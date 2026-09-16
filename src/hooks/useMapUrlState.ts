"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
  createMapUrlWriter,
  type MapUrlPatch,
} from "@/lib/map-url-sync";
import {
  encodeNasaNrtLayers,
  parseNasaDate,
  parseNasaNrtLayers,
} from "@/lib/nasa-nrt/layers";
import type { NasaNrtLayerKey } from "@/lib/nasa-nrt/types";

export { DEFAULT_LAYERS } from "@/lib/map-url-aliases";

const VIEW_SYNC_MS = 250;

export function useMapUrlState() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routerSearch = searchParams.toString();
  const [searchOverride, setSearchOverride] = useState<string | null>(null);
  const search = searchOverride ?? routerSearch;

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const searchRef = useRef(search);
  searchRef.current = search;

  const writerRef = useRef<ReturnType<typeof createMapUrlWriter> | null>(null);

  useEffect(() => {
    setSearchOverride(null);
  }, [routerSearch]);

  useEffect(() => {
    const writer = createMapUrlWriter({
      getLivePathname: () =>
        typeof window !== "undefined" ? window.location.pathname : pathnameRef.current,
      getHash: () => (typeof window !== "undefined" ? window.location.hash : ""),
      replaceState: (href) => {
        if (typeof window === "undefined") return;
        window.history.replaceState(window.history.state, "", href);
      },
    });
    writerRef.current = writer;
    const unbind =
      typeof document === "undefined" ? () => {} : writer.bindDocumentClick(document);
    return () => {
      unbind();
      writer.cancel();
      writerRef.current = null;
    };
  }, []);

  const params = useMemo(() => new URLSearchParams(search), [search]);

  const resolved = useMemo(
    () =>
      resolveMapUrlAliases({
        cluster: params.get("cluster"),
        hazard: params.get("hazard"),
        layersRaw: params.get("layers"),
        disasterJenisRaw: params.get("disasterJenis"),
        areaRaw: params.get("area"),
      }),
    [params]
  );

  const state: MapUrlState = useMemo(() => {
    const lat = Number(params.get("lat") ?? DEFAULT_VIEW.latitude);
    const lng = Number(params.get("lng") ?? DEFAULT_VIEW.longitude);
    const z = Number(params.get("z") ?? DEFAULT_VIEW.zoom);
    const basemap = (params.get("basemap") as BasemapId) || "positron";
    return {
      view: {
        latitude: Number.isFinite(lat) ? lat : DEFAULT_VIEW.latitude,
        longitude: Number.isFinite(lng) ? lng : DEFAULT_VIEW.longitude,
        zoom: Number.isFinite(z) ? z : DEFAULT_VIEW.zoom,
      },
      basemap: isBasemapId(basemap) ? basemap : "positron",
      preferVector: params.get("vector") === "1",
      areaLayer: resolved.areaLayer,
      markerLayers: resolved.markerLayers,
      disasterJenis: resolved.disasterJenis,
      hazard: parseHazardKind(params.get("hazard")),
      cluster: parseClusterId(params.get("cluster")),
      krbJenis: parseKrbJenis(params.get("krbJenis")),
      overlays: parseOverlayLayers(params.get("overlays")),
      nasaLayers: parseNasaNrtLayers(params.get("nasa")),
      nasaDate: parseNasaDate(params.get("nasaDate")),
    };
  }, [resolved, params]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const push = useCallback((patch: MapUrlPatch) => {
    const writer = writerRef.current;
    if (!writer) return;
    const plan = writer.write({
      currentPathname: pathnameRef.current,
      currentSearch: searchRef.current,
      patch,
    });
    if (plan.method === "replaceState") {
      setSearchOverride(plan.search);
    }
  }, []);

  const setView = useCallback((v: Partial<MapViewState>) => {
    const writer = writerRef.current;
    if (!writer) return;
    writer.schedule(
      () => {
        const view = stateRef.current.view;
        return {
          currentPathname: pathnameRef.current,
          currentSearch: searchRef.current,
          patch: {
            lat: String(v.latitude ?? view.latitude),
            lng: String(v.longitude ?? view.longitude),
            z: String(v.zoom ?? view.zoom),
          },
        };
      },
      VIEW_SYNC_MS,
      (plan) => {
        if (plan.method === "replaceState") setSearchOverride(plan.search);
      }
    );
  }, []);

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
