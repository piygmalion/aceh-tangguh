"use client";

import { useQuery } from "@tanstack/react-query";
import { Protocol } from "pmtiles";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { qk } from "@/lib/qk";
import {
  BASEMAP_STYLES,
  type AreaLayerKey,
  type BasemapId,
  type LegendModel,
  type MapViewState,
  type MarkerLayerKey,
} from "@/lib/types";
import type { FeatureCollection, Point } from "geojson";

export const LAYER_COLORS: Record<MarkerLayerKey, string> = {
  missingPersons: "#dc2626",
  tendPoints: "#0ea5e9",
  policeOffices: "#1d4ed8",
  poskos: "#2e9e4e",
  facHealth: "#e11d48",
  facEducation: "#7c3aed",
  facGov: "#475569",
  facReligious: "#0d9488",
  infraRoadBridge: "#a16207",
  helipad: "#0891b2",
  starlink: "#6366f1",
  citizenReports: "#f59e0b",
};

const BUCKET_FILL: Record<string, string> = {
  rendah: "#c7f0d2",
  sedang: "#6bcf8e",
  tinggi: "#2e9e4e",
  tahap1: "#fed7aa",
  tahap2: "#fb923c",
};

/** tippecanoe layer name + public URL for PMTiles-backed area layers */
const PMTILES_AREA: Partial<
  Record<AreaLayerKey, { url: string; sourceLayer: string }>
> = {
  r3pDistribution: {
    url: "/tiles/r3p-kab.pmtiles",
    sourceLayer: "r3p",
  },
  villageDistribution: {
    url: "/tiles/village-r3p.pmtiles",
    sourceLayer: "village",
  },
  irbi2025: {
    url: "/tiles/irbi-2025.pmtiles",
    sourceLayer: "irbi",
  },
};

const FILL_COLOR_EXPR = [
  "match",
  ["get", "bucket"],
  "rendah",
  BUCKET_FILL.rendah,
  "sedang",
  BUCKET_FILL.sedang,
  "tinggi",
  BUCKET_FILL.tinggi,
  "tahap1",
  BUCKET_FILL.tahap1,
  "tahap2",
  BUCKET_FILL.tahap2,
  BUCKET_FILL.rendah,
] as unknown as string;

let pmtilesProtocolReady = false;
function ensurePmtilesProtocol() {
  if (pmtilesProtocolReady || typeof window === "undefined") return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesProtocolReady = true;
}

type AreaResponse = FeatureCollection & { legend?: LegendModel };

async function fetchMarkers(keys: MarkerLayerKey[]): Promise<FeatureCollection> {
  const qs = keys.length ? `?keys=${keys.join(",")}` : "";
  const res = await fetch(`/api/layers/markers${qs}`);
  if (!res.ok) throw new Error("Failed to load markers");
  return res.json();
}

async function fetchArea(key: AreaLayerKey): Promise<AreaResponse> {
  const res = await fetch(`/api/layers/areas/${key}`);
  if (!res.ok) throw new Error("Failed to load area layer");
  return res.json();
}

async function pmtilesExists(path: string): Promise<boolean> {
  try {
    const res = await fetch(path, { method: "HEAD", cache: "force-cache" });
    return res.ok;
  } catch {
    return false;
  }
}

export function MapViewport({
  view,
  onViewChange,
  basemap,
  markerLayers,
  areaLayer,
}: {
  view: MapViewState;
  onViewChange: (v: Partial<MapViewState>) => void;
  basemap: BasemapId;
  markerLayers: MarkerLayerKey[];
  areaLayer: AreaLayerKey | null;
}) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<{
    lng: number;
    lat: number;
    title: string;
    status?: string;
  } | null>(null);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ensurePmtilesProtocol();
  }, []);

  const sortedKeys = useMemo(
    () => [...markerLayers].sort(),
    [markerLayers]
  );

  const pmtilesMeta = areaLayer ? PMTILES_AREA[areaLayer] : undefined;

  const { data: pmtilesAvailable } = useQuery({
    queryKey: ["pmtiles-exists", pmtilesMeta?.url ?? "none"],
    queryFn: () =>
      pmtilesMeta ? pmtilesExists(pmtilesMeta.url) : Promise.resolve(false),
    enabled: !!pmtilesMeta,
    staleTime: 60_000,
  });

  const usePmtiles = Boolean(pmtilesMeta && pmtilesAvailable);

  const { data } = useQuery({
    queryKey: qk.markers(sortedKeys),
    queryFn: () => fetchMarkers(sortedKeys),
    enabled: sortedKeys.length > 0,
  });

  const { data: areaData } = useQuery({
    queryKey: qk.area(areaLayer ?? "villageDistribution"),
    queryFn: () => fetchArea(areaLayer!),
    // Wait for PMTiles HEAD; only fall back to GeoJSON API when tiles are missing
    enabled:
      areaLayer != null &&
      (pmtilesMeta ? pmtilesAvailable === false : true),
  });

  const areaGeojson = useMemo(() => {
    if (!areaData?.features) return null;
    return {
      type: "FeatureCollection" as const,
      features: areaData.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          fillColor:
            BUCKET_FILL[String(f.properties?.bucket ?? "")] ?? "#c7f0d2",
        },
      })),
    };
  }, [areaData]);

  const pmtilesUrl = useMemo(() => {
    if (!usePmtiles || !pmtilesMeta || typeof window === "undefined") return null;
    const abs = new URL(pmtilesMeta.url, window.location.origin).href;
    return `pmtiles://${abs}`;
  }, [usePmtiles, pmtilesMeta]);

  const onMoveEnd = useCallback(
    (e: ViewStateChangeEvent) => {
      if (moveTimer.current) clearTimeout(moveTimer.current);
      moveTimer.current = setTimeout(() => {
        onViewChange({
          longitude: e.viewState.longitude,
          latitude: e.viewState.latitude,
          zoom: e.viewState.zoom,
        });
      }, 250);
    },
    [onViewChange]
  );

  return (
    <div className="absolute inset-0 pt-[3.75rem] pb-[4.25rem] md:pb-0 md:pr-[20.5rem]">
      <Map
        key={basemap}
        ref={mapRef}
        initialViewState={view}
        mapStyle={BASEMAP_STYLES[basemap] as never}
        style={{ width: "100%", height: "100%", background: "#d4dce4" }}
        onMoveEnd={onMoveEnd}
        attributionControl
        reuseMaps={false}
      >
        <NavigationControl position="top-left" />
        {pmtilesUrl && pmtilesMeta && (
          <Source
            id="area-layer-pmtiles"
            type="vector"
            url={pmtilesUrl}
          >
            <Layer
              id="area-fill"
              type="fill"
              source-layer={pmtilesMeta.sourceLayer}
              paint={{
                "fill-color": FILL_COLOR_EXPR as never,
                "fill-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6,
                  0.35,
                  10,
                  0.5,
                ],
              }}
            />
            <Layer
              id="area-outline"
              type="line"
              source-layer={pmtilesMeta.sourceLayer}
              minzoom={areaLayer === "villageDistribution" ? 8 : 0}
              paint={{
                "line-color": "#14532d",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  7,
                  0.4,
                  11,
                  1.1,
                ],
                "line-opacity": 0.75,
              }}
            />
          </Source>
        )}
        {!usePmtiles && areaGeojson && (
          <Source id="area-layer" type="geojson" data={areaGeojson} generateId>
            <Layer
              id="area-fill"
              type="fill"
              paint={{
                "fill-color": ["get", "fillColor"],
                "fill-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6,
                  0.35,
                  10,
                  0.5,
                ],
              }}
            />
            <Layer
              id="area-outline"
              type="line"
              minzoom={areaLayer === "villageDistribution" ? 8 : 0}
              paint={{
                "line-color": "#14532d",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  7,
                  0.4,
                  11,
                  1.1,
                ],
                "line-opacity": 0.75,
              }}
            />
          </Source>
        )}
        {data?.features.map((f) => {
          if (f.geometry.type !== "Point") return null;
          const [lng, lat] = (f.geometry as Point).coordinates;
          const layer = (f.properties?.layer as MarkerLayerKey) || "poskos";
          const title = String(f.properties?.title ?? "Titik");
          const status = f.properties?.status
            ? String(f.properties.status)
            : undefined;
          return (
            <Marker
              key={String(f.id ?? `${lng}-${lat}-${title}`)}
              longitude={lng}
              latitude={lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopup({ lng, lat, title, status });
              }}
            >
              <button
                type="button"
                className="h-3.5 w-3.5 rounded-full border-2 border-white shadow-md ring-1 ring-black/10"
                style={{ background: LAYER_COLORS[layer] ?? "#999" }}
                aria-label={title}
              />
            </Marker>
          );
        })}
        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="top"
            onClose={() => setPopup(null)}
            closeOnClick={false}
          >
            <div className="text-sm">
              <div className="font-semibold text-[var(--text)]">{popup.title}</div>
              {popup.status && (
                <div className="text-xs text-[var(--text-dim)]">{popup.status}</div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
