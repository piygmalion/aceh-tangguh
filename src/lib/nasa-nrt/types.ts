import { ACEH_BBOX } from "@/lib/aceh-scope";

export const NASA_NRT_KIND = "nasa-nrt" as const;
export const NASA_NRT_VALIDATION = "unofficial_nrt" as const;

export const NASA_NRT_LAYER_KEYS = [
  "gibsTrueColor",
  "gibsThermal",
  "firmsHotspots",
] as const;

export type NasaNrtLayerKey = (typeof NASA_NRT_LAYER_KEYS)[number];

export type FirmsStatus = "ok" | "unconfigured" | "upstream";

export type FirmsMetadata = {
  kind: typeof NASA_NRT_KIND;
  official: false;
  validation: typeof NASA_NRT_VALIDATION;
  status: FirmsStatus;
  source: "firms-viirs-snpp-nrt";
  fetched_at: string | null;
  observed_at: string | null;
  href: string;
  bbox: [number, number, number, number];
};

export type FirmsProperties = {
  acq_date: string | null;
  acq_time: string | null;
  confidence: string | null;
  frp: number | null;
  satellite: string | null;
  daynight: string | null;
};

export type FirmsFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: FirmsProperties;
};

export type FirmsResponse = {
  type: "FeatureCollection";
  metadata: FirmsMetadata;
  features: FirmsFeature[];
};

export const FIRMS_CATALOG_HREF = "https://firms.modaps.eosdis.nasa.gov/api/";

export function emptyFirmsResponse(
  status: FirmsStatus,
  fetchedAt: string | null = null,
): FirmsResponse {
  return {
    type: "FeatureCollection",
    metadata: {
      kind: NASA_NRT_KIND,
      official: false,
      validation: NASA_NRT_VALIDATION,
      status,
      source: "firms-viirs-snpp-nrt",
      fetched_at: fetchedAt,
      observed_at: null,
      href: FIRMS_CATALOG_HREF,
      bbox: [...ACEH_BBOX],
    },
    features: [],
  };
}

export function firmsHttpStatus(body: FirmsResponse): number {
  if (body.metadata.status === "ok") return 200;
  return 503;
}
