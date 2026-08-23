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
import { DISASTER_JENIS_COLORS } from "@/lib/disaster-jenis";
import { type VillageClickSelection } from "@/lib/profil-desa";
import type { FilterSpecification, MapLayerMouseEvent } from "maplibre-gl";
import { LAYER_COLORS } from "@/lib/layer-colors";
import { Chip } from "@/components/ui/Chip";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTranslations } from "next-intl";
import {
  COORD_QUALITY_OFFSHORE,
  COORD_QUALITY_TRUNCATED,
  readCoordQuality,
  type CoordQuality,
} from "@/lib/coord-quality";
import { MapMarkerPin } from "@/components/map/MapMarkerPin";

export { LAYER_COLORS };

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

function highlightFilter(sel: VillageClickSelection | null): FilterSpecification {
  if (!sel) return ["==", ["get", "name"], "__none__"];
  const byName: FilterSpecification = [
    "all",
    ["==", ["get", "name"], sel.name],
    ["==", ["get", "kecamatan"], sel.kecamatan],
  ];
  if (!sel.kodeDesa) return byName;
  return [
    "any",
    ["==", ["get", "kode_desa_kelurahan"], sel.kodeDesa],
    byName,
  ];
}

function AreaHighlightLayers({
  sourceLayer,
  selection,
}: {
  sourceLayer?: string;
  selection: VillageClickSelection | null;
}) {
  const filter = highlightFilter(selection);
  const layerProps = sourceLayer ? { "source-layer": sourceLayer } : {};
  return (
    <>
      <Layer
        id="area-highlight-fill"
        type="fill"
        {...layerProps}
        filter={filter}
        paint={{
          "fill-color": "#f59e0b",
          "fill-opacity": 0.22,
        }}
      />
      <Layer
        id="area-highlight-line"
        type="line"
        {...layerProps}
        filter={filter}
        paint={{
          "line-color": "#ea580c",
          "line-width": 2.25,
          "line-opacity": 0.95,
        }}
      />
    </>
  );
}

function readVillageSelection(
  props: Record<string, unknown> | null | undefined
): VillageClickSelection | null {
  if (!props) return null;
  const name = String(props.name ?? "").trim();
  const kabupaten = String(props.kabupaten ?? "").trim();
  const kecamatan = String(props.kecamatan ?? "").trim();
  if (!name && !kecamatan && !kabupaten) return null;
  const kodeDesa = props.kode_desa_kelurahan
    ? String(props.kode_desa_kelurahan)
    : undefined;
  const kodeKecamatan = props.kode_kecamatan
    ? String(props.kode_kecamatan)
    : undefined;
  return {
    name,
    kabupaten,
    kecamatan,
    kodeDesa,
    kodeKecamatan,
    level: props.level ? String(props.level) : "desa",
  };
}

export function MapViewport({
  view,
  onViewChange,
  basemap,
  markerLayers,
  areaLayer,
  disasterJenis = [],
  villageSelection = null,
  onVillageClick,
}: {
  view: MapViewState;
  onViewChange: (v: Partial<MapViewState>) => void;
  basemap: BasemapId;
  markerLayers: MarkerLayerKey[];
  areaLayer: AreaLayerKey | null;
  disasterJenis?: string[];
  villageSelection?: VillageClickSelection | null;
  onVillageClick?: (sel: VillageClickSelection) => void;
}) {
  const t = useTranslations("map");
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<{
    lng: number;
    lat: number;
    title: string;
    status?: string;
    layer?: MarkerLayerKey;
    coordQuality?: CoordQuality | null;
  } | null>(null);
  const [cursor, setCursor] = useState<string>("auto");
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const villageClickEnabled = areaLayer === "villageDistribution";

  useEffect(() => {
    ensurePmtilesProtocol();
  }, []);

  const sortedKeys = useMemo(
    () => [...markerLayers].sort(),
    [markerLayers]
  );

  const disasterJenisSet = useMemo(() => {
    if (disasterJenis.length === 0) return null; // null = all jenis
    return new Set(disasterJenis);
  }, [disasterJenis]);

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

  const onAreaClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!villageClickEnabled || !onVillageClick) return;
      const feature = e.features?.find((f) => f.layer?.id === "area-fill");
      if (!feature) return;
      const sel = readVillageSelection(
        feature.properties as Record<string, unknown> | null
      );
      if (sel) onVillageClick(sel);
    },
    [villageClickEnabled, onVillageClick]
  );

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
    <div className="absolute inset-0 pt-24 pb-[4.25rem] md:pb-0 md:pr-[20.5rem]">
      <Map
        key={basemap}
        ref={mapRef}
        initialViewState={view}
        mapStyle={BASEMAP_STYLES[basemap] as never}
        style={{ width: "100%", height: "100%", background: "#d4dce4" }}
        cursor={cursor as never}
        interactiveLayerIds={villageClickEnabled ? ["area-fill"] : []}
        onClick={onAreaClick}
        onMouseEnter={
          villageClickEnabled ? () => setCursor("pointer") : undefined
        }
        onMouseLeave={
          villageClickEnabled ? () => setCursor("auto") : undefined
        }
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
            {villageClickEnabled && (
              <AreaHighlightLayers
                sourceLayer={pmtilesMeta.sourceLayer}
                selection={villageSelection}
              />
            )}
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
            {villageClickEnabled && (
              <AreaHighlightLayers selection={villageSelection} />
            )}
          </Source>
        )}
        {data?.features.map((f) => {
          if (f.geometry.type !== "Point") return null;
          const [lng, lat] = (f.geometry as Point).coordinates;
          const layer = (f.properties?.layer as MarkerLayerKey) || "disasterEvents";
          if (layer === "disasterEvents" && disasterJenisSet) {
            const jenis = String(f.properties?.jenis_bencana ?? "");
            if (!disasterJenisSet.has(jenis)) return null;
          }
          const title = String(f.properties?.title ?? "Titik");
          const status = f.properties?.status
            ? String(f.properties.status)
            : undefined;
          const jenisBencana =
            layer === "disasterEvents"
              ? String(f.properties?.jenis_bencana ?? "")
              : null;
          return (
            <Marker
              key={String(f.id ?? `${lng}-${lat}-${title}`)}
              longitude={lng}
              latitude={lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopup({
                  lng,
                  lat,
                  title,
                  status,
                  layer,
                  coordQuality: readCoordQuality(
                    f.properties as Record<string, unknown> | null
                  ),
                });
              }}
            >
              <MapMarkerPin
                layer={layer}
                jenisBencana={jenisBencana}
                title={title}
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
              <div className="mt-1.5">
                <StatusChip
                  raw={popup.status}
                  layer={popup.layer}
                  className="px-2 py-0.5 text-[0.65rem]"
                />
              </div>
              {popup.coordQuality === COORD_QUALITY_TRUNCATED && (
                <Chip
                  tone="warn"
                  className="mt-1.5 px-2 py-0.5 text-[0.65rem]"
                >
                  {t("coordApprox")}
                </Chip>
              )}
              {popup.coordQuality === COORD_QUALITY_OFFSHORE && (
                <Chip
                  tone="info"
                  className="mt-1.5 px-2 py-0.5 text-[0.65rem]"
                >
                  {t("coordOffshore")}
                </Chip>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
