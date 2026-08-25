"use client";

import { useQuery } from "@tanstack/react-query";
import { Protocol } from "pmtiles";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { withBasePath } from "@/lib/preview/env";
import { qk } from "@/lib/qk";
import type {
  AreaLayerKey,
  BasemapId,
  LegendModel,
  MapViewState,
  MarkerLayerKey,
} from "@/lib/types";
import { getBasemapStyle } from "@/lib/basemap";
import type { FeatureCollection, Feature, Point } from "geojson";
import { DISASTER_JENIS_COLORS } from "@/lib/disaster-jenis";
import { type VillageClickSelection } from "@/lib/profil-desa";
import type { FilterSpecification, GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import { FOREST_SCALE, STATUS_HEX } from "@/lib/chart-colors";
import { CLUSTER_COLORS, COLOR_TOKENS, LAYER_COLORS } from "@/lib/layer-colors";
import { markerIconImageId } from "@/lib/layer-icons";
import {
  MAP_CLUSTER_MAX_ZOOM,
  MAP_DOT_MAX_ZOOM,
  MAP_DOT_RADIUS_PX,
  MAP_DOT_STROKE_PX,
  MAP_ICON_MIN_ZOOM,
  MAP_PAPER_STROKE,
  markerRenderMode,
  parseStackItems,
  stackSharedCentroidDisasterEvents,
  type StackMember,
} from "@/lib/map-marker-chrome";
import { registerMapChromeIcons } from "@/lib/map-symbol-images";
import { Chip } from "@/components/ui/Chip";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTranslations } from "next-intl";
import {
  COORD_QUALITY_OFFSHORE,
  COORD_QUALITY_TRUNCATED,
  readCoordQuality,
  type CoordQuality,
} from "@/lib/coord-quality";

const POINT_LAYER_IDS = [
  "marker-dots",
  "marker-approx",
  "marker-icons",
  "marker-stacks",
] as const;

export { LAYER_COLORS };

/** Village / R3P / NGO quantity terciles: forest-200 / 400 / 700 (not lime). */
const QUANTITY_FILL: Record<string, string> = {
  rendah: FOREST_SCALE[200],
  sedang: FOREST_SCALE[400],
  tinggi: FOREST_SCALE[700],
  tahap1: "#E6D3A0",
  tahap2: "#FF8F42",
};

/** IRBI kelas risiko — status tokens, not the quantity forest scale. */
const IRBI_FILL: Record<string, string> = {
  rendah: STATUS_HEX.RENDAH,
  sedang: STATUS_HEX.SEDANG,
  tinggi: STATUS_HEX.TINGGI,
};

function bucketFillFor(layer: AreaLayerKey | null | undefined): Record<string, string> {
  if (layer === "irbi2025") return { ...QUANTITY_FILL, ...IRBI_FILL };
  return QUANTITY_FILL;
}

function fillColorExpr(layer: AreaLayerKey | null | undefined) {
  const fill = bucketFillFor(layer);
  return [
    "match",
    ["get", "bucket"],
    "rendah",
    fill.rendah,
    "sedang",
    fill.sedang,
    "tinggi",
    fill.tinggi,
    "tahap1",
    fill.tahap1,
    "tahap2",
    fill.tahap2,
    fill.rendah,
  ] as unknown as string;
}

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

let pmtilesProtocolReady = false;
function ensurePmtilesProtocol() {
  if (pmtilesProtocolReady || typeof window === "undefined") return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesProtocolReady = true;
}

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

function markerColor(layer: MarkerLayerKey, jenis: string): string {
  if (layer === "disasterEvents") {
    return DISASTER_JENIS_COLORS[jenis] ?? LAYER_COLORS.disasterEvents;
  }
  return (LAYER_COLORS as Record<string, string>)[layer] ?? COLOR_TOKENS.ink;
}

type AreaResponse = FeatureCollection & { legend?: LegendModel };

async function fetchMarkers(keys: MarkerLayerKey[]): Promise<FeatureCollection> {
  const qs = keys.length ? `?keys=${keys.join(",")}` : "";
  const res = await fetchPublicApi(`/api/layers/markers${qs}`);
  if (!res.ok) throw new Error("Failed to load markers");
  return res.json();
}

async function fetchArea(key: AreaLayerKey): Promise<AreaResponse> {
  const res = await fetchPublicApi(`/api/layers/areas/${key}`);
  if (!res.ok) throw new Error("Failed to load area layer");
  return res.json();
}

async function pmtilesExists(path: string): Promise<boolean> {
  try {
    const res = await fetch(withBasePath(path), { method: "HEAD", cache: "force-cache" });
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
          "fill-color": COLOR_TOKENS.gold,
          "fill-opacity": 0.22,
        }}
      />
      <Layer
        id="area-highlight-line"
        type="line"
        {...layerProps}
        filter={filter}
        paint={{
          "line-color": COLOR_TOKENS.orange,
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
  preferVector = false,
  markerLayers,
  areaLayer,
  disasterJenis = [],
  villageSelection = null,
  onVillageClick,
}: {
  view: MapViewState;
  onViewChange: (v: Partial<MapViewState>) => void;
  basemap: BasemapId;
  /** Opt-in OpenFreeMap vector; Carto raster is the default and the fallback. */
  preferVector?: boolean;
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
    stackItems?: StackMember[];
  } | null>(null);
  const [cursor, setCursor] = useState<string>("auto");
  const [vectorFailed, setVectorFailed] = useState(false);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const villageClickEnabled = areaLayer === "villageDistribution";

  useEffect(() => {
    ensurePmtilesProtocol();
  }, []);

  useEffect(() => {
    setVectorFailed(false);
  }, [basemap, preferVector]);

  const mapStyle = useMemo(
    () =>
      getBasemapStyle(basemap, {
        preferVector: preferVector && !vectorFailed,
      }),
    [basemap, preferVector, vectorFailed]
  );

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    void registerMapChromeIcons(map);
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const onStyle = () => {
      void registerMapChromeIcons(map);
    };
    map.on("style.load", onStyle);
    return () => {
      map.off("style.load", onStyle);
    };
  }, [mapStyle]);

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

  const markerGeojson = useMemo((): FeatureCollection => {
    if (!data?.features?.length) return EMPTY_FC;
    const prepared: Feature<Point>[] = [];
    for (const f of data.features) {
      if (f.geometry.type !== "Point") continue;
      const layer = (f.properties?.layer as MarkerLayerKey) || "disasterEvents";
      const jenis = String(f.properties?.jenis_bencana ?? "");
      if (layer === "disasterEvents" && disasterJenisSet && !disasterJenisSet.has(jenis)) {
        continue;
      }
      const quality = readCoordQuality(f.properties as Record<string, unknown> | null);
      const point = f.geometry as Point;
      const lon = point.coordinates[0];
      prepared.push({
        type: "Feature",
        id: f.id,
        geometry: point,
        properties: {
          layer,
          title: String(f.properties?.title ?? "Titik"),
          status: f.properties?.status ? String(f.properties.status) : "",
          jenisBencana: layer === "disasterEvents" ? jenis : "",
          color: markerColor(layer, jenis),
          coordQuality: quality ?? "",
          desa: f.properties?.desa ?? "",
          icon: markerIconImageId(layer, layer === "disasterEvents" ? jenis : null),
          renderMode: markerRenderMode({
            layer,
            lon,
            coordQuality: quality,
          }),
        },
      });
    }
    const stacked = stackSharedCentroidDisasterEvents(prepared);
    return {
      type: "FeatureCollection",
      features: stacked.map((feature) => {
        const lon = feature.geometry.coordinates[0];
        const mode = markerRenderMode({
          layer: String(feature.properties?.layer ?? ""),
          lon,
          coordQuality: feature.properties?.coordQuality,
          stackCount: feature.properties?.stackCount,
        });
        return {
          ...feature,
          properties: {
            ...feature.properties,
            renderMode: mode,
          },
        };
      }),
    };
  }, [data, disasterJenisSet]);

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
            bucketFillFor(areaLayer)[String(f.properties?.bucket ?? "")] ??
            FOREST_SCALE[200],
        },
      })),
    };
  }, [areaData, areaLayer]);

  const pmtilesUrl = useMemo(() => {
    if (!usePmtiles || !pmtilesMeta || typeof window === "undefined") return null;
    const abs = new URL(withBasePath(pmtilesMeta.url), window.location.origin).href;
    return `pmtiles://${abs}`;
  }, [usePmtiles, pmtilesMeta]);

  const onMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const clusterFeat = e.features?.find((f) => f.layer?.id === "marker-clusters");
      if (clusterFeat && clusterFeat.geometry.type === "Point") {
        const source = mapRef.current?.getSource("markers") as GeoJSONSource | undefined;
        const clusterId = clusterFeat.properties?.cluster_id as number | undefined;
        const center = clusterFeat.geometry.coordinates as [number, number];
        if (source && typeof clusterId === "number") {
          void source.getClusterExpansionZoom(clusterId).then((zoom) => {
            mapRef.current?.easeTo({ center, zoom, duration: 400 });
          });
        }
        return;
      }

      const pointFeat = e.features?.find((f) =>
        POINT_LAYER_IDS.includes(f.layer?.id as (typeof POINT_LAYER_IDS)[number])
      );
      if (pointFeat && pointFeat.geometry.type === "Point") {
        const [lng, lat] = pointFeat.geometry.coordinates as [number, number];
        const props = pointFeat.properties ?? {};
        const stackItems = parseStackItems(props.stackItems);
        setPopup({
          lng,
          lat,
          title:
            stackItems.length > 1
              ? `${stackItems.length} kejadian`
              : String(props.title ?? "Titik"),
          status: props.status ? String(props.status) : undefined,
          layer: (props.layer as MarkerLayerKey) || "disasterEvents",
          coordQuality: readCoordQuality(props as Record<string, unknown>),
          stackItems: stackItems.length > 1 ? stackItems : undefined,
        });
        return;
      }

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
        ref={mapRef}
        initialViewState={view}
        mapStyle={mapStyle as never}
        style={{ width: "100%", height: "100%", background: "#d4dce4" }}
        cursor={cursor as never}
        interactiveLayerIds={[
          "marker-clusters",
          ...POINT_LAYER_IDS,
          ...(villageClickEnabled ? (["area-fill"] as const) : []),
        ]}
        onLoad={onMapLoad}
        onClick={onMapClick}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("auto")}
        onMoveEnd={onMoveEnd}
        onError={(e) => {
          const msg = e.error?.message ?? "";
          if (preferVector && !vectorFailed && /style|fetch|network|failed/i.test(msg)) {
            setVectorFailed(true);
          }
        }}
        attributionControl
        reuseMaps
        dragRotate={false}
        pitchWithRotate={false}
        maxPitch={0}
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
                "fill-color": fillColorExpr(areaLayer) as never,
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
        {sortedKeys.length > 0 && (
          <Source
            id="markers"
            type="geojson"
            data={markerGeojson}
            cluster
            clusterMaxZoom={MAP_CLUSTER_MAX_ZOOM}
            clusterRadius={48}
          >
            <Layer
              id="marker-clusters"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": [
                  "step",
                  ["get", "point_count"],
                  CLUSTER_COLORS.low,
                  25,
                  CLUSTER_COLORS.high,
                ],
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  16,
                  25,
                  20,
                  80,
                  26,
                ],
                "circle-stroke-width": MAP_DOT_STROKE_PX,
                "circle-stroke-color": MAP_PAPER_STROKE,
                "circle-opacity": 0.92,
              }}
            />
            <Layer
              id="marker-cluster-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": ["get", "point_count_abbreviated"],
                "text-size": 12,
                "text-font": ["Noto Sans Regular", "Open Sans Regular"],
              }}
              paint={{
                "text-color": [
                  "step",
                  ["get", "point_count"],
                  CLUSTER_COLORS.textOnLow,
                  25,
                  CLUSTER_COLORS.textOnHigh,
                ],
              }}
            />
            <Layer
              id="marker-dots"
              type="circle"
              maxzoom={MAP_DOT_MAX_ZOOM}
              filter={[
                "all",
                ["!", ["has", "point_count"]],
                ["!=", ["get", "renderMode"], "stack"],
              ]}
              paint={{
                "circle-color": ["coalesce", ["get", "color"], COLOR_TOKENS.ink],
                "circle-radius": MAP_DOT_RADIUS_PX,
                "circle-stroke-width": MAP_DOT_STROKE_PX,
                "circle-stroke-color": MAP_PAPER_STROKE,
                "circle-opacity": 0.95,
              }}
            />
            <Layer
              id="marker-approx"
              type="circle"
              minzoom={MAP_ICON_MIN_ZOOM}
              filter={[
                "all",
                ["!", ["has", "point_count"]],
                ["==", ["get", "renderMode"], "approx"],
              ]}
              paint={{
                "circle-color": ["coalesce", ["get", "color"], COLOR_TOKENS.ink],
                "circle-radius": MAP_DOT_RADIUS_PX,
                "circle-stroke-width": MAP_DOT_STROKE_PX,
                "circle-stroke-color": MAP_PAPER_STROKE,
                "circle-opacity": 0.88,
              }}
            />
            <Layer
              id="marker-stacks"
              type="circle"
              filter={[
                "all",
                ["!", ["has", "point_count"]],
                ["==", ["get", "renderMode"], "stack"],
              ]}
              paint={{
                "circle-color": CLUSTER_COLORS.low,
                "circle-radius": [
                  "step",
                  ["get", "stackCount"],
                  14,
                  8,
                  18,
                  16,
                  22,
                ],
                "circle-stroke-width": MAP_DOT_STROKE_PX,
                "circle-stroke-color": MAP_PAPER_STROKE,
                "circle-opacity": 0.94,
              }}
            />
            <Layer
              id="marker-stack-count"
              type="symbol"
              filter={[
                "all",
                ["!", ["has", "point_count"]],
                ["==", ["get", "renderMode"], "stack"],
              ]}
              layout={{
                "text-field": ["to-string", ["get", "stackCount"]],
                "text-size": 12,
                "text-font": ["Noto Sans Regular", "Open Sans Regular"],
              }}
              paint={{ "text-color": CLUSTER_COLORS.textOnLow }}
            />
            <Layer
              id="marker-icons"
              type="symbol"
              minzoom={MAP_ICON_MIN_ZOOM}
              filter={[
                "all",
                ["!", ["has", "point_count"]],
                ["==", ["get", "renderMode"], "pin"],
              ]}
              layout={{
                "icon-image": ["get", "icon"],
                "icon-size": 1,
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
              }}
            />
          </Source>
        )}
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
              {popup.stackItems && popup.stackItems.length > 1 ? (
                <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-[0.75rem] text-[var(--text-dim)]">
                  {popup.stackItems.map((item) => (
                    <li key={item.id || item.title}>
                      {item.jenisBencana ? `${item.jenisBencana} — ` : ""}
                      {item.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
