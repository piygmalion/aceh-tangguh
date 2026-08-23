export type Locale = "id" | "en";
export type Theme = "light" | "dark";
export type BasemapId = "positron" | "dark" | "satellite" | "streets";

export type HazardKind = "banjir" | "longsor" | "gempa" | "kebakaran" | "lainnya";
export type ClusterId =
  | "sar"
  | "logistik"
  | "pengungsian"
  | "kesehatan"
  | "pendidikan"
  | "pemulihan";

export type AreaLayerKey =
  | "villageDistribution"
  | "r3pDistribution"
  | "ngoDistribution"
  | "regencyFundAllocation"
  | "irbi2025";

export type MarkerLayerKey =
  | "disasterEvents"
  | "missingPersons"
  | "tendPoints"
  | "policeOffices"
  | "poskos"
  | "facHealth"
  | "facEducation"
  | "facGov"
  | "facReligious"
  | "infraRoadBridge"
  | "helipad"
  | "starlink"
  | "citizenReports";

export type ReportTopic =
  | "banjir"
  | "longsor"
  | "hunian"
  | "perlindungan"
  | "logistik"
  | "kesehatan"
  | "lainnya";

export type FeatureId = string;

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface LiveStats {
  activeIncidents: number;
  poskoCount: number;
  reportsLast24h: number;
  updatedAt: string;
}

export interface HazardStatus {
  kind: HazardKind;
  label: string;
  count: number;
  severity?: "low" | "med" | "high";
}

export interface GeoFeatureSummary {
  id: FeatureId;
  layer: MarkerLayerKey | AreaLayerKey | "boundary";
  title: string;
  subtitle?: string;
  status?: string;
  coords?: [number, number];
  properties: Record<string, unknown>;
}

export interface MapUrlState {
  view: MapViewState;
  basemap: BasemapId;
  areaLayer: AreaLayerKey | null;
  markerLayers: MarkerLayerKey[];
  hazard?: HazardKind;
  cluster?: ClusterId;
  selectedId?: FeatureId;
}

export interface CreateReportBody {
  topic: ReportTopic;
  description: string;
  longitude: number;
  latitude: number;
  placeName?: string;
  consentMapDisplay: boolean;
}

export interface CreateReportResponse {
  id: FeatureId;
  status: "queued" | "published";
}

export interface LegendModel {
  title: string;
  items: { color: string; label: string }[];
}

export const DEFAULT_VIEW: MapViewState = {
  longitude: 96.5,
  latitude: 4.3,
  zoom: 7,
};

/** Raster XYZ basemaps — no API key; more reliable than vector CDN in sandboxed browsers. */
export type BasemapStyle = string | Record<string, unknown>;

export const BASEMAP_STYLES: Record<BasemapId, BasemapStyle> = {
  positron: {
    version: 8,
    name: "positron",
    sources: {
      raster: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© CARTO © OpenStreetMap",
      },
    },
    layers: [{ id: "raster", type: "raster", source: "raster", minzoom: 0, maxzoom: 19 }],
  },
  dark: {
    version: 8,
    name: "dark",
    sources: {
      raster: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© CARTO © OpenStreetMap",
      },
    },
    layers: [{ id: "raster", type: "raster", source: "raster", minzoom: 0, maxzoom: 19 }],
  },
  streets: {
    version: 8,
    name: "streets",
    sources: {
      raster: {
        type: "raster",
        tiles: [
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [{ id: "raster", type: "raster", source: "raster", minzoom: 0, maxzoom: 19 }],
  },
  satellite: {
    version: 8,
    name: "satellite",
    sources: {
      raster: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Tiles © Esri",
      },
    },
    layers: [{ id: "raster", type: "raster", source: "raster", minzoom: 0, maxzoom: 19 }],
  }
};
