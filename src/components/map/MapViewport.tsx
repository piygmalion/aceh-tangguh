"use client";

import { useQuery } from "@tanstack/react-query";
import { Protocol } from "pmtiles";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { fetchKrb, joinKelasOntoIrbiFeatures, kawasanPoints } from "@/lib/krb-by-kab";
import type {
  AreaLayerKey,
  BasemapId,
  LegendModel,
  MapViewState,
  MarkerLayerKey,
  OverlayLayerKey,
} from "@/lib/types";
import { getBasemapStyle, isBrandBasemapId } from "@/lib/basemap";
import {
  ACEH_OSM_PMTILES_FILENAME,
  configuredAcehOsmPmtilesUrl,
  overlayPmtilesUrl,
} from "@/lib/tiles-url";
import type { FeatureCollection, Feature, Point } from "geojson";
import { DISASTER_JENIS_COLORS } from "@/lib/disaster-jenis";
import type { VillageClickSelection } from "@/lib/profil-desa";
import type { FilterSpecification, GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import { FOREST_SCALE } from "@/lib/chart-colors";
import { CLUSTER_COLORS, COLOR_TOKENS, LAYER_COLORS } from "@/lib/layer-colors";
import { markerIconImageId } from "@/lib/layer-icons";
import {
  AREA_FILL_LAYER_IDS,
  AREA_HIGHLIGHT_FILL,
  AREA_HIGHLIGHT_FILL_OPACITY,
  AREA_HIGHLIGHT_LAYER_IDS,
  AREA_HIGHLIGHT_LINE,
  KAB_OVERVIEW_AREA_KEY,
  KECAMATAN_OVERVIEW_MAX_ZOOM,
  PMTILES_KECAMATAN,
  PMTILES_VILLAGE,
  VILLAGE_MESH_FILL,
  VILLAGE_MESH_FILL_OPACITY,
  VILLAGE_MESH_MIN_ZOOM,
  adminLodBand,
  areaFillUsesMeshWash,
  areaHighlightFilter,
  areaHighlightLayerId,
  areaOutlinePaint,
  geometryBounds,
  isAdminLodArea,
  isAreaFillLayerId,
  isKabAreaFeature,
  isKecamatanAreaFeature,
  lodFocusFromSelection,
  overlayBeforeId,
  rebucketVillageKabFeature,
  readVillageSelection,
  unionBounds,
  villageLayerFilter,
  villageLodShowsKecamatanLayer,
  villageLodShowsVillageLayer,
} from "@/lib/village-distribution-lod";
import {
  MAP_CLUSTER_COUNT_TEXT_PX,
  MAP_CLUSTER_FILL,
  MAP_CLUSTER_MAX_ZOOM,
  MAP_CLUSTER_RADIUS,
  MAP_CLUSTER_RING_WIDTH_PX,
  MAP_DOT_MAX_ZOOM,
  MAP_DOT_RADIUS_PX,
  MAP_DOT_STROKE_PX,
  MAP_ICON_MIN_ZOOM,
  clusterCircleRadiusExpr,
  clusterCountTextColor,
  clusterRingColorExpr,
  markerHaloStroke,
  markerRenderMode,
  parseStackItems,
  stackSharedCentroidDisasterEvents,
} from "@/lib/map-marker-chrome";
import { registerMapChromeIcons } from "@/lib/map-symbol-images";
import { MapFeatureCard, fetchFeatureCard } from "@/components/map/MapFeatureCard";
import { MapFeatureSheet } from "@/components/map/MapFeatureSheet";
import { acceptFeatureCard, loadFeatureCard } from "@/lib/feature-card-query";
import { toFeatureCard, type FeatureCard } from "@/lib/feature-card";
import { useTranslations } from "next-intl";
import {
  MapOverlays,
  overlayInteractiveLayerIds,
  pickOverlayHit,
  type OverlayHit,
} from "@/components/map/MapOverlays";
import {
  NasaNrtOverlays,
  nasaNrtInteractiveLayerIds,
  pickNasaFirmsHit,
} from "@/components/map/NasaNrtOverlays";
import { defaultGibsDate } from "@/lib/nasa-nrt/layers";
import type { FirmsFeature, NasaNrtLayerKey } from "@/lib/nasa-nrt/types";
import { readCoordQuality } from "@/lib/coord-quality";

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

/** IRBI kelas risiko stays on the source palette, not the hybrid status scale. */
const IRBI_FILL: Record<string, string> = {
  rendah: COLOR_TOKENS.forest,
  sedang: COLOR_TOKENS.gold,
  tinggi: COLOR_TOKENS.orange,
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
  irbi2025: {
    url: overlayPmtilesUrl("irbi-2025.pmtiles"),
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

async function fetchKecamatanDistribution(): Promise<AreaResponse> {
  const res = await fetch(withBasePath("/fixtures/areas/kecamatanDistribution.geojson"), {
    cache: "force-cache",
  });
  if (!res.ok) throw new Error("Failed to load kecamatan layer");
  return res.json();
}

async function pmtilesExists(path: string): Promise<boolean> {
  try {
    const res = await fetch(withBasePath(path), { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function pmtilesProtocolUrl(path: string): string | null {
  if (typeof window === "undefined") return null;
  return `pmtiles://${new URL(withBasePath(path), window.location.origin).href}`;
}

function overlayLayerId(base: string, prefix?: string): string {
  return prefix ? `${base}-${prefix}` : base;
}

function MarkerClusterSource({
  data,
  haloStroke,
  chromeIconsReady,
}: {
  data: FeatureCollection;
  haloStroke: string;
  chromeIconsReady: boolean;
}) {
  return (
    <Source
      id="markers"
      type="geojson"
      data={data}
      generateId
      cluster
      clusterMaxZoom={MAP_CLUSTER_MAX_ZOOM}
      clusterRadius={MAP_CLUSTER_RADIUS}
    >
      <Layer
        id="marker-clusters"
        type="circle"
        filter={["has", "point_count"]}
        paint={{
          "circle-color": MAP_CLUSTER_FILL,
          "circle-radius": clusterCircleRadiusExpr() as never,
          "circle-stroke-width": MAP_CLUSTER_RING_WIDTH_PX,
          "circle-stroke-color": clusterRingColorExpr() as never,
          "circle-opacity": 0.96,
        }}
      />
      <Layer
        id="marker-cluster-count"
        type="symbol"
        filter={["has", "point_count"]}
        layout={{
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": MAP_CLUSTER_COUNT_TEXT_PX,
          "text-font": ["Noto Sans Regular"],
        }}
        paint={{
          "text-color": clusterCountTextColor(),
        }}
      />
      <Layer
        id="marker-dots"
        type="circle"
        maxzoom={chromeIconsReady ? MAP_DOT_MAX_ZOOM : 24}
        filter={[
          "all",
          ["!", ["has", "point_count"]],
          ["!=", ["get", "renderMode"], "stack"],
        ]}
        paint={{
          "circle-color": ["coalesce", ["get", "color"], COLOR_TOKENS.ink],
          "circle-radius": MAP_DOT_RADIUS_PX,
          "circle-stroke-width": MAP_DOT_STROKE_PX,
          "circle-stroke-color": haloStroke,
          "circle-opacity": 0.95,
        }}
      />
      <Layer
        id="marker-approx"
        type="circle"
        filter={[
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "renderMode"], "approx"],
        ]}
        paint={{
          "circle-color": ["coalesce", ["get", "color"], COLOR_TOKENS.ink],
          "circle-radius": MAP_DOT_RADIUS_PX,
          "circle-stroke-width": MAP_DOT_STROKE_PX,
          "circle-stroke-color": haloStroke,
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
          "circle-stroke-color": haloStroke,
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
          "text-size": MAP_CLUSTER_COUNT_TEXT_PX,
          "text-font": ["Noto Sans Regular"],
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
          "icon-image": [
            "coalesce",
            ["image", ["get", "icon"]],
            ["image", "layer:disasterEvents"],
          ],
          "icon-size": 1,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        }}
      />
    </Source>
  );
}

function AreaHighlightLayers({
  idPrefix,
  source,
  sourceLayer,
  selection,
  beforeId,
  minzoom,
  maxzoom,
}: {
  idPrefix?: string;
  source?: string;
  sourceLayer?: string;
  selection: VillageClickSelection | null;
  beforeId?: string;
  minzoom?: number;
  maxzoom?: number;
}) {
  const filter = areaHighlightFilter(selection);
  const layerProps = sourceLayer ? { "source-layer": sourceLayer } : {};
  const before = beforeId ? { beforeId } : {};
  const sourceProp = source ? { source } : {};
  const zoomRange = {
    ...(minzoom != null ? { minzoom } : {}),
    ...(maxzoom != null ? { maxzoom } : {}),
  };
  return (
    <>
      <Layer
        id={areaHighlightLayerId("fill", idPrefix)}
        type="fill"
        {...sourceProp}
        {...layerProps}
        {...before}
        {...zoomRange}
        filter={filter}
        paint={{
          "fill-color": AREA_HIGHLIGHT_FILL,
          "fill-opacity": AREA_HIGHLIGHT_FILL_OPACITY,
        }}
      />
      <Layer
        id={areaHighlightLayerId("line", idPrefix)}
        type="line"
        {...sourceProp}
        {...layerProps}
        {...before}
        {...zoomRange}
        filter={filter}
        paint={{
          "line-color": AREA_HIGHLIGHT_LINE,
          "line-width": 2.25,
          "line-opacity": 0.95,
        }}
      />
    </>
  );
}

function AreaOverlayLayers({
  idPrefix,
  source,
  sourceLayer,
  areaLayer,
  outlineKind,
  filter,
  beforeId,
  minzoom,
  maxzoom,
  villageSelection,
  villageClickEnabled,
  basemap,
}: {
  idPrefix?: string;
  /** Injected by react-map-gl <Source> via cloneElement. */
  source?: string;
  sourceLayer?: string;
  areaLayer: AreaLayerKey | null;
  outlineKind: "kab" | "kecamatan" | "village";
  basemap?: BasemapId;
  filter?: FilterSpecification;
  beforeId?: string;
  minzoom?: number;
  maxzoom?: number;
  villageSelection: VillageClickSelection | null;
  villageClickEnabled: boolean;
}) {
  const layerProps = sourceLayer ? { "source-layer": sourceLayer } : {};
  const before = beforeId ? { beforeId } : {};
  const sourceProp = source ? { source } : {};
  const filterProp = filter ? { filter } : {};
  const zoomRange = {
    ...(minzoom != null ? { minzoom } : {}),
    ...(maxzoom != null ? { maxzoom } : {}),
  };
  const fillPaint = areaFillUsesMeshWash(outlineKind)
    ? {
        "fill-color": VILLAGE_MESH_FILL,
        "fill-opacity": VILLAGE_MESH_FILL_OPACITY,
      }
    : sourceLayer
      ? {
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
        }
      : {
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
        };
  return (
    <>
      <Layer
        id={overlayLayerId("area-fill", idPrefix)}
        type="fill"
        {...sourceProp}
        {...layerProps}
        {...before}
        {...filterProp}
        {...zoomRange}
        paint={fillPaint as never}
      />
      <Layer
        id={overlayLayerId("area-outline", idPrefix)}
        type="line"
        {...sourceProp}
        {...layerProps}
        {...before}
        {...filterProp}
        minzoom={minzoom ?? 0}
        {...(maxzoom != null ? { maxzoom } : {})}
        paint={areaOutlinePaint(outlineKind, basemap) as never}
      />
      {villageClickEnabled && (
        <AreaHighlightLayers
          idPrefix={idPrefix}
          source={source}
          sourceLayer={sourceLayer}
          selection={villageSelection}
          beforeId={beforeId}
          minzoom={minzoom}
          maxzoom={maxzoom}
        />
      )}
    </>
  );
}

function fitRenderedAreaBounds(
  map: maplibregl.Map,
  feature: { geometry?: unknown; properties?: Record<string, unknown> | null },
  fillLayerId: string,
  match: (props: Record<string, unknown>) => boolean,
  maxZoom: number,
) {
  const queryLayers = map.getLayer(fillLayerId) ? [fillLayerId] : [...AREA_FILL_LAYER_IDS];
  const siblings = map.queryRenderedFeatures(undefined, { layers: queryLayers }).filter((f) => {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    return match(p);
  });
  const bounds = unionBounds(
    (siblings.length ? siblings : [feature]).map((f) =>
      geometryBounds((f as { geometry?: never }).geometry as never)
    )
  );
  if (bounds) {
    map.fitBounds(bounds, {
      padding: 48,
      duration: 600,
      maxZoom,
    });
  }
}

export function MapViewport({
  view,
  onViewChange,
  basemap,
  preferVector = false,
  markerLayers,
  areaLayer,
  krbJenis = null,
  disasterJenis = [],
  villageSelection = null,
  onVillageClick,
  overlays = [],
  nasaLayers = [],
  nasaDate,
  onFeaturePopupChange,
}: {
  view: MapViewState;
  onViewChange: (v: Partial<MapViewState>) => void;
  basemap: BasemapId;
  /** Opt-in OpenFreeMap vector; Carto raster is the default and the fallback. */
  preferVector?: boolean;
  markerLayers: MarkerLayerKey[];
  areaLayer: AreaLayerKey | null;
  krbJenis?: string | null;
  disasterJenis?: string[];
  villageSelection?: VillageClickSelection | null;
  onVillageClick?: (sel: VillageClickSelection) => void;
  overlays?: OverlayLayerKey[];
  nasaLayers?: NasaNrtLayerKey[];
  nasaDate?: string;
  onFeaturePopupChange?: (open: boolean) => void;
}) {
  const t = useTranslations("map");
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<{
    lng: number;
    lat: number;
    id: string;
    layer: string;
    stack?: { id: string; title: string }[];
    localCard?: FeatureCard;
  } | null>(null);

  const popupWasOpen = useRef(false);
  const skipCanvasFocus = useRef(false);
  useEffect(() => {
    const open = popup != null;
    if (popupWasOpen.current && !open) {
      if (skipCanvasFocus.current) skipCanvasFocus.current = false;
      else mapRef.current?.getCanvas()?.focus();
    }
    popupWasOpen.current = open;
    onFeaturePopupChange?.(open);
  }, [popup, onFeaturePopupChange]);
  const [cardId, setCardId] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const [overlayPopup, setOverlayPopup] = useState<OverlayHit | null>(null);
  const [nasaFirmsPopup, setNasaFirmsPopup] = useState<FirmsFeature | null>(null);
  useEffect(() => {
    const closeFromPanel = () => {
      setPopup((current) => {
        if (current) skipCanvasFocus.current = true;
        return null;
      });
      setCardId(null);
      setOverlayPopup(null);
      setNasaFirmsPopup(null);
    };
    window.addEventListener("aceh:close-feature-popup", closeFromPanel);
    return () => window.removeEventListener("aceh:close-feature-popup", closeFromPanel);
  }, []);
  const [cursor, setCursor] = useState<string>("auto");
  const [vectorFailed, setVectorFailed] = useState(false);
  const [chromeIconsReady, setChromeIconsReady] = useState(false);
  const [overlaySlot, setOverlaySlot] = useState<string | undefined>();
  const villageClickEnabled = isAdminLodArea(areaLayer);

  const syncOverlayBeforeId = useCallback(() => {
    const map = mapRef.current?.getMap();
    setOverlaySlot(
      overlayBeforeId((id) => Boolean(map?.getLayer(id)))
    );
  }, []);

  useEffect(() => {
    ensurePmtilesProtocol();
  }, []);

  useEffect(() => {
    setVectorFailed(false);
  }, [basemap, preferVector]);

  const acehOsmConfigured = configuredAcehOsmPmtilesUrl();
  const acehOsmCandidate =
    acehOsmConfigured ?? overlayPmtilesUrl(ACEH_OSM_PMTILES_FILENAME);
  const { data: acehOsmPresent } = useQuery({
    queryKey: ["pmtiles-exists", acehOsmCandidate],
    queryFn: () => pmtilesExists(acehOsmCandidate),
    enabled: isBrandBasemapId(basemap) && !acehOsmConfigured,
    staleTime: 60_000,
  });

  const mapStyle = useMemo(() => {
    return getBasemapStyle(basemap, {
      preferVector: preferVector && !vectorFailed,
      rasterFallback: vectorFailed,
      acehOsmUrl: acehOsmConfigured,
      localAcehOsmPresent: acehOsmConfigured ? undefined : acehOsmPresent === true,
    });
  }, [basemap, preferVector, vectorFailed, acehOsmConfigured, acehOsmPresent]);

  const haloStroke = useMemo(() => markerHaloStroke(basemap), [basemap]);

  const loadChromeIcons = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    setChromeIconsReady(false);
    const ready = await registerMapChromeIcons(map, haloStroke);
    setChromeIconsReady(ready);
    syncOverlayBeforeId();
  }, [haloStroke, syncOverlayBeforeId]);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    void loadChromeIcons();
  }, [loadChromeIcons]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const onStyle = () => {
      void loadChromeIcons();
    };
    map.on("style.load", onStyle);
    return () => {
      map.off("style.load", onStyle);
    };
  }, [mapStyle, loadChromeIcons]);

  const overlayInteractiveIds = useMemo(
    () => overlayInteractiveLayerIds(overlays, { pointAsSymbol: chromeIconsReady }),
    [overlays, chromeIconsReady]
  );
  const nasaInteractiveIds = useMemo(
    () => nasaNrtInteractiveLayerIds(nasaLayers),
    [nasaLayers],
  );
  const resolvedNasaDate = nasaDate ?? defaultGibsDate();

  const sortedKeys = useMemo(
    () => [...markerLayers].sort(),
    [markerLayers]
  );

  const disasterJenisSet = useMemo(() => {
    if (disasterJenis.length === 0) return null; // null = all jenis
    return new Set(disasterJenis);
  }, [disasterJenis]);

  const villageLod = isAdminLodArea(areaLayer);
  const lodFocus = useMemo(
    () => (villageLod ? lodFocusFromSelection(villageSelection) : null),
    [villageLod, villageSelection]
  );
  const lodBand = adminLodBand(lodFocus);

  const villageFilter = useMemo(
    () =>
      isAdminLodArea(areaLayer) ? villageLayerFilter(lodFocus) : undefined,
    [areaLayer, lodFocus]
  );

  const areaBeforeId = overlaySlot;

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !lodFocus?.kodeKecamatan) return;
    if (map.getZoom() < VILLAGE_MESH_MIN_ZOOM) {
      map.easeTo({ zoom: VILLAGE_MESH_MIN_ZOOM, duration: 400 });
    }
  }, [lodFocus?.kodeKecamatan]);

  const otherPmtilesMeta =
    areaLayer && !villageLod ? PMTILES_AREA[areaLayer] : undefined;

  const krbRecolor = areaLayer === "irbi2025" && Boolean(krbJenis);

  const { data: krbData } = useQuery({
    queryKey: qk.krb,
    queryFn: () => fetchKrb(),
    enabled: areaLayer === "irbi2025",
    staleTime: 60_000,
  });

  const showKecamatanLayer = Boolean(
    villageLod && villageLodShowsKecamatanLayer(lodBand) && !krbRecolor
  );
  const showVillageLayer = Boolean(
    villageLod && villageLodShowsVillageLayer(lodBand) && !krbRecolor
  );

  const { data: kecamatanPmtilesOk } = useQuery({
    queryKey: ["pmtiles-exists", PMTILES_KECAMATAN.url],
    queryFn: () => pmtilesExists(PMTILES_KECAMATAN.url),
    enabled: showKecamatanLayer,
    staleTime: 60_000,
  });

  const { data: villagePmtilesOk } = useQuery({
    queryKey: ["pmtiles-exists", PMTILES_VILLAGE.url],
    queryFn: () => pmtilesExists(PMTILES_VILLAGE.url),
    enabled: showVillageLayer,
    staleTime: 60_000,
  });

  const { data: otherPmtilesOk } = useQuery({
    queryKey: ["pmtiles-exists", otherPmtilesMeta?.url ?? "none"],
    queryFn: () =>
      otherPmtilesMeta ? pmtilesExists(otherPmtilesMeta.url) : Promise.resolve(false),
    enabled: Boolean(otherPmtilesMeta) && !krbRecolor,
    staleTime: 60_000,
  });

  const useKecamatanPmtiles = Boolean(showKecamatanLayer && kecamatanPmtilesOk !== false);
  const useVillagePmtiles = Boolean(showVillageLayer && villagePmtilesOk !== false);
  const useOtherPmtiles = Boolean(otherPmtilesMeta && otherPmtilesOk && !krbRecolor);

  const needKabGeojson = Boolean(villageLod && lodBand === "kabupaten" && !krbRecolor);
  const needKecamatanGeojson = Boolean(showKecamatanLayer && kecamatanPmtilesOk === false);
  const needVillageGeojson = Boolean(showVillageLayer && villagePmtilesOk === false);
  const needAreaGeojson =
    areaLayer != null &&
    (krbRecolor ||
      (!villageLod && (otherPmtilesMeta ? otherPmtilesOk === false : true)));

  const { data } = useQuery({
    queryKey: qk.markers(sortedKeys),
    queryFn: () => fetchMarkers(sortedKeys),
    enabled: sortedKeys.length > 0,
  });

  const fetchRemoteCard = Boolean(popup && cardId && !popup.localCard);
  const { data: featureCard, isFetching: cardLoading, isError: cardError } = useQuery({
    queryKey: qk.featureCard(cardId ?? "", popup?.layer ?? ""),
    queryFn: ({ signal, queryKey }) =>
      loadFeatureCard(
        String(queryKey[2] ?? ""),
        String(queryKey[3] ?? "") || undefined,
        signal,
        fetchFeatureCard,
      ),
    enabled: fetchRemoteCard,
  });
  const shownFeatureCard = acceptFeatureCard(cardId, featureCard) ? featureCard : null;

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
          id: String(f.id ?? ""),
          layer,
          title: String(f.properties?.title ?? "Titik"),
          status: f.properties?.status ? String(f.properties.status) : "",
          jenisBencana: layer === "disasterEvents" ? jenis : "",
          color: markerColor(layer, jenis),
          coordQuality: quality ?? "",
          coord_quality: quality ?? "",
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
    enabled: needAreaGeojson,
  });

  const { data: kabAreaData } = useQuery({
    queryKey: qk.area(KAB_OVERVIEW_AREA_KEY),
    queryFn: () => fetchArea(KAB_OVERVIEW_AREA_KEY),
    enabled: needKabGeojson,
    staleTime: 60 * 60_000,
  });

  const { data: kecamatanAreaData } = useQuery({
    queryKey: ["layers", "area", "kecamatanDistribution"],
    queryFn: fetchKecamatanDistribution,
    enabled: needKecamatanGeojson,
    staleTime: 60 * 60_000,
  });

  const { data: villageAreaData } = useQuery({
    queryKey: qk.area("villageDistribution"),
    queryFn: () => fetchArea("villageDistribution"),
    enabled: needVillageGeojson,
    staleTime: 60 * 60_000,
  });

  const paintAreaFeatures = useCallback(
    (features: FeatureCollection["features"] | undefined, rebucketKab: boolean) => {
      if (!features) return null;
      return {
        type: "FeatureCollection" as const,
        features: features.map((f) => {
          const props = rebucketKab
            ? rebucketVillageKabFeature(f.properties as Record<string, unknown>)
            : (f.properties ?? {});
          return {
            ...f,
            properties: {
              ...props,
              fillColor:
                bucketFillFor(areaLayer)[String(props.bucket ?? "")] ?? FOREST_SCALE[200],
            },
          };
        }),
      };
    },
    [areaLayer]
  );

  const areaGeojson = useMemo(() => {
    if (!areaData?.features) return null;
    const joined =
      krbRecolor && krbJenis && krbData?.wilayah
        ? joinKelasOntoIrbiFeatures(areaData.features, krbData.wilayah, krbJenis)
        : areaData.features;
    return paintAreaFeatures(joined, false);
  }, [areaData, krbRecolor, krbJenis, krbData, paintAreaFeatures]);

  const kabGeojson = useMemo(
    () =>
      paintAreaFeatures(
        kabAreaData?.features,
        areaLayer === "villageDistribution"
      ),
    [kabAreaData, areaLayer, paintAreaFeatures]
  );

  const kecamatanFallbackGeojson = useMemo(
    () => paintAreaFeatures(kecamatanAreaData?.features, false),
    [kecamatanAreaData, paintAreaFeatures]
  );

  const villageFallbackGeojson = useMemo(
    () => paintAreaFeatures(villageAreaData?.features, false),
    [villageAreaData, paintAreaFeatures]
  );

  const kawasanGeojson = useMemo(() => {
    if (areaLayer !== "irbi2025" || !krbData?.kawasan?.length) return null;
    const fc = kawasanPoints(krbData.kawasan);
    return fc.features.length ? fc : null;
  }, [areaLayer, krbData]);

  const kecamatanPmtilesUrl = useMemo(
    () => (useKecamatanPmtiles ? pmtilesProtocolUrl(PMTILES_KECAMATAN.url) : null),
    [useKecamatanPmtiles]
  );
  const villagePmtilesUrl = useMemo(
    () => (useVillagePmtiles ? pmtilesProtocolUrl(PMTILES_VILLAGE.url) : null),
    [useVillagePmtiles]
  );
  const otherPmtilesUrl = useMemo(
    () =>
      useOtherPmtiles && otherPmtilesMeta
        ? pmtilesProtocolUrl(otherPmtilesMeta.url)
        : null,
    [useOtherPmtiles, otherPmtilesMeta]
  );

  useEffect(() => {
    syncOverlayBeforeId();
  }, [sortedKeys, overlays, nasaLayers, areaLayer, useKecamatanPmtiles, useVillagePmtiles, useOtherPmtiles, syncOverlayBeforeId]);

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
        const id = String(props.id ?? pointFeat.id ?? "");
        setPopup({
          lng,
          lat,
          id,
          layer: String(props.layer ?? "disasterEvents"),
          stack:
            stackItems.length > 1
              ? stackItems.map((item) => ({ id: item.id, title: item.title }))
              : undefined,
        });
        setCardId(id);
        setOverlayPopup(null);
        setNasaFirmsPopup(null);
        return;
      }

      const firmsHit = pickNasaFirmsHit(e.features);
      if (firmsHit) {
        setPopup(null);
        setOverlayPopup(null);
        setNasaFirmsPopup(firmsHit);
        return;
      }

      const overlayHit = pickOverlayHit(e.features, e.lngLat);
      if (overlayHit) {
        setPopup(null);
        setNasaFirmsPopup(null);
        setOverlayPopup(overlayHit);
        return;
      }

      const kawasanFeat = e.features?.find((f) => f.layer?.id === "krb-kawasan-circles");
      if (kawasanFeat && kawasanFeat.geometry.type === "Point") {
        const [lng, lat] = kawasanFeat.geometry.coordinates as [number, number];
        const props = kawasanFeat.properties ?? {};
        const kawasanId = String(props.id ?? props.title ?? "kawasan");
        const localCard = toFeatureCard({
          type: "Feature",
          id: kawasanId,
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: {
            layer: "irbiKawasan",
            title: String(props.title ?? t("krbKawasan")),
            status: props.zona ? String(props.zona) : undefined,
            jenis_bahaya: props.jenis_bahaya,
            kabupaten: props.kabupaten,
          },
        });
        setPopup({
          lng,
          lat,
          id: kawasanId,
          layer: "irbiKawasan",
          localCard,
        });
        setCardId(kawasanId);
        setOverlayPopup(null);
        setNasaFirmsPopup(null);
        return;
      }

      if (!villageClickEnabled) return;
      const feature = e.features?.find((f) => isAreaFillLayerId(f.layer?.id));
      if (!feature) return;
      const fillLayerId = feature.layer?.id ?? "area-fill";
      const props = feature.properties as Record<string, unknown> | null;
      const sel = readVillageSelection(props);
      const map = mapRef.current?.getMap();

      if (isKabAreaFeature(props, lodBand)) {
        if (sel) onVillageClick?.(sel);
        if (map) {
          const kode = String(props?.kode_kab ?? props?.kode_kabupaten ?? "");
          const name = String(props?.name ?? props?.kabupaten ?? "");
          fitRenderedAreaBounds(
            map,
            feature,
            fillLayerId,
            (p) =>
              Boolean(
                (kode &&
                  (String(p.kode_kab ?? "") === kode ||
                    String(p.kode_kabupaten ?? "") === kode)) ||
                  (name &&
                    (String(p.name ?? "") === name || String(p.kabupaten ?? "") === name))
              ),
            10
          );
        }
        return;
      }

      if (isKecamatanAreaFeature(props)) {
        const kodeKecamatan = String(props?.kode_kecamatan ?? "").trim();
        if (sel) onVillageClick?.(sel);
        if (map) {
          fitRenderedAreaBounds(
            map,
            feature,
            fillLayerId,
            (p) => String(p.kode_kecamatan ?? "") === kodeKecamatan,
            13
          );
        }
        return;
      }

      if (sel) onVillageClick?.(sel);
    },
    [villageClickEnabled, onVillageClick, lodBand, t]
  );

  const onMoveEnd = useCallback(
    (e: ViewStateChangeEvent) => {
      onViewChange({
        longitude: e.viewState.longitude,
        latitude: e.viewState.latitude,
        zoom: e.viewState.zoom,
      });
      window.dispatchEvent(new Event("aceh:map-move"));
    },
    [onViewChange]
  );

  const onMapMove = useCallback(() => {
    window.dispatchEvent(new Event("aceh:map-move"));
  }, []);

  return (
    <div className="map-stage absolute inset-0 pt-24 pb-[4.25rem] md:pb-0 md:pr-[20.5rem]">
      <Map
        ref={mapRef}
        initialViewState={view}
        mapStyle={mapStyle as never}
        style={{ width: "100%", height: "100%", background: "#d4dce4" }}
        cursor={cursor as never}
        interactiveLayerIds={[
          "marker-clusters",
          ...POINT_LAYER_IDS,
          "krb-kawasan-circles",
          ...overlayInteractiveIds,
          ...nasaInteractiveIds,
          ...(villageClickEnabled ? [...AREA_FILL_LAYER_IDS, ...AREA_HIGHLIGHT_LAYER_IDS] : []),
        ]}
        onLoad={onMapLoad}
        onClick={onMapClick}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("auto")}
        onMove={onMapMove}
        onMoveEnd={onMoveEnd}
        onError={(e) => {
          const msg = e.error?.message ?? "";
          const allowFallback = preferVector || isBrandBasemapId(basemap);
          if (allowFallback && !vectorFailed && /style|fetch|network|failed/i.test(msg)) {
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
        {kawasanGeojson && (
          <Source id="krb-kawasan" type="geojson" data={kawasanGeojson}>
            <Layer
              id="krb-kawasan-circles"
              type="circle"
              {...(overlaySlot ? { beforeId: overlaySlot } : {})}
              paint={{
                "circle-radius": 7,
                "circle-color": COLOR_TOKENS.orange,
                "circle-stroke-width": 2,
                "circle-stroke-color": haloStroke,
                "circle-opacity": 0.92,
              }}
            />
          </Source>
        )}
        {needKabGeojson && kabGeojson && (
          <Source id="area-layer-kab" type="geojson" data={kabGeojson} generateId>
            <AreaOverlayLayers
              idPrefix="kab"
              areaLayer={areaLayer}
              outlineKind="kab"
              beforeId={areaBeforeId}
              villageSelection={villageSelection}
              villageClickEnabled={villageClickEnabled}
              basemap={basemap}
            />
          </Source>
        )}
        {kecamatanPmtilesUrl && (
          <Source id="area-layer-kecamatan" type="vector" url={kecamatanPmtilesUrl}>
            <AreaOverlayLayers
              idPrefix="kecamatan"
              sourceLayer={PMTILES_KECAMATAN.sourceLayer}
              areaLayer={areaLayer}
              outlineKind="kecamatan"
              filter={villageFilter}
              beforeId={areaBeforeId}
              maxzoom={KECAMATAN_OVERVIEW_MAX_ZOOM}
              villageSelection={villageSelection}
              villageClickEnabled={villageClickEnabled}
              basemap={basemap}
            />
          </Source>
        )}
        {needKecamatanGeojson && kecamatanFallbackGeojson && (
          <Source id="area-layer-kecamatan-geojson" type="geojson" data={kecamatanFallbackGeojson} generateId>
            <AreaOverlayLayers
              idPrefix="kecamatan"
              areaLayer={areaLayer}
              outlineKind="kecamatan"
              filter={villageFilter}
              beforeId={areaBeforeId}
              maxzoom={KECAMATAN_OVERVIEW_MAX_ZOOM}
              villageSelection={villageSelection}
              villageClickEnabled={villageClickEnabled}
              basemap={basemap}
            />
          </Source>
        )}
        {villagePmtilesUrl && (
          <Source id="area-layer-village" type="vector" url={villagePmtilesUrl}>
            <AreaOverlayLayers
              idPrefix="village"
              sourceLayer={PMTILES_VILLAGE.sourceLayer}
              areaLayer={areaLayer}
              outlineKind="village"
              filter={villageFilter}
              beforeId={areaBeforeId}
              minzoom={VILLAGE_MESH_MIN_ZOOM}
              villageSelection={villageSelection}
              villageClickEnabled={villageClickEnabled}
              basemap={basemap}
            />
          </Source>
        )}
        {needVillageGeojson && villageFallbackGeojson && (
          <Source id="area-layer-village-geojson" type="geojson" data={villageFallbackGeojson} generateId>
            <AreaOverlayLayers
              idPrefix="village"
              areaLayer={areaLayer}
              outlineKind="village"
              filter={villageFilter}
              beforeId={areaBeforeId}
              minzoom={VILLAGE_MESH_MIN_ZOOM}
              villageSelection={villageSelection}
              villageClickEnabled={villageClickEnabled}
              basemap={basemap}
            />
          </Source>
        )}
        {otherPmtilesUrl && otherPmtilesMeta && (
          <Source id="area-layer-pmtiles" type="vector" url={otherPmtilesUrl}>
            <AreaOverlayLayers
              sourceLayer={otherPmtilesMeta.sourceLayer}
              areaLayer={areaLayer}
              outlineKind="kab"
              beforeId={areaBeforeId}
              villageSelection={villageSelection}
              villageClickEnabled={false}
              basemap={basemap}
            />
          </Source>
        )}
        {needAreaGeojson && areaGeojson && (
          <Source id="area-layer" type="geojson" data={areaGeojson} generateId>
            <AreaOverlayLayers
              areaLayer={areaLayer}
              outlineKind="kab"
              beforeId={areaBeforeId}
              villageSelection={villageSelection}
              villageClickEnabled={false}
              basemap={basemap}
            />
          </Source>
        )}
        {sortedKeys.length > 0 && markerGeojson.features.length > 0 && (
          <MarkerClusterSource
            data={markerGeojson}
            haloStroke={haloStroke}
            chromeIconsReady={chromeIconsReady}
          />
        )}
        {overlays.length > 0 && (
          <MapOverlays
            keys={overlays}
            beforeId={overlaySlot}
            popup={overlayPopup}
            onPopupClose={() => setOverlayPopup(null)}
            iconsReady={chromeIconsReady}
          />
        )}
        {nasaLayers.length > 0 ? (
          <NasaNrtOverlays
            layers={nasaLayers}
            nasaDate={resolvedNasaDate}
            beforeId={overlaySlot}
            popup={nasaFirmsPopup}
            onPopupClose={() => setNasaFirmsPopup(null)}
          />
        ) : null}
        {popup && !narrow ? (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="top"
            offset={14}
            maxWidth="22rem"
            className="map-feature-popup"
            closeButton={false}
            onClose={() => {
              setPopup(null);
              setCardId(null);
            }}
            closeOnClick={false}
          >
            <MapFeatureCard
              layout="popup"
              card={
                popup.localCard ??
                (shownFeatureCard
                  ? { ...shownFeatureCard, stack: popup.stack ?? shownFeatureCard.stack }
                  : null)
              }
              loading={cardLoading && !popup.localCard}
              error={cardError && !popup.localCard}
              onClose={() => {
                setPopup(null);
                setCardId(null);
              }}
              onSelectStack={(id) => setCardId(id)}
            />
          </Popup>
        ) : null}
      </Map>
      {popup && narrow ? (
        <MapFeatureSheet
          onClose={() => {
            setPopup(null);
            setCardId(null);
          }}
        >
          <MapFeatureCard
            layout="sheet"
            card={
              popup.localCard ??
              (shownFeatureCard
                ? { ...shownFeatureCard, stack: popup.stack ?? shownFeatureCard.stack }
                : null)
            }
            loading={cardLoading && !popup.localCard}
            error={cardError && !popup.localCard}
            onClose={() => {
              setPopup(null);
              setCardId(null);
            }}
            onSelectStack={(id) => setCardId(id)}
          />
        </MapFeatureSheet>
      ) : null}
    </div>
  );
}
