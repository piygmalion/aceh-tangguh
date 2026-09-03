export type Locale = "id" | "en";
export type Theme = "light" | "dark";
export type RasterBasemapId =
  | "positron"
  | "dark"
  | "satellite"
  | "streets"
  | "sentinel";
export type BrandBasemapId = "brand-light" | "brand-dark" | "brand-grey";
export type BasemapId = RasterBasemapId | BrandBasemapId;

export type HazardKind =
  | "banjir"
  | "longsor"
  | "gempa"
  | "kebakaran"
  | "karhutla"
  | "puting_beliung"
  | "lainnya";
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
  | "laporanKejadian"
  | "laporanPenanganan"
  | "tatonasStations";

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
  /** Absent until a real inventory exists. Never seed or invent a count. */
  poskoCount?: number | null;
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
  /** Opt-in OpenFreeMap vector (`?vector=1`). Default is Carto raster. */
  preferVector: boolean;
  areaLayer: AreaLayerKey | null;
  markerLayers: MarkerLayerKey[];
  /** Active jenis_bencana filters; empty = all jenis when disasterEvents is on. */
  disasterJenis: string[];
  hazard?: HazardKind;
  cluster?: ClusterId;
  selectedId?: FeatureId;
  /** IRBI hazard overlay when area=irbi2025. Empty = overall kab class. */
  krbJenis: string | null;
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
