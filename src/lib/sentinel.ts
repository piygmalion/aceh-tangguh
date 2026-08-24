import { ACEH_BBOX, SENTINEL_CLOUDLESS_TILES, SENTINEL_CLOUDLESS_YEAR } from "./basemap";

const STAC_SEARCH = "https://earth-search.aws.element84.com/v1/search";

export type SentinelStatus = {
  mosaic: {
    product: "s2cloudless";
    provider: "EOX";
    year: number;
    tileUrl: string;
    cadence: "annual";
  };
  latestScene: {
    id: string;
    datetime: string;
    cloudCover: number | null;
    platform: string | null;
  } | null;
  bbox: [number, number, number, number];
  fetchedAt: string;
  source: "stac" | "fixture";
};

type StacFeature = {
  id?: string;
  properties?: {
    datetime?: string;
    "eo:cloud_cover"?: number;
    platform?: string;
  };
};

type StacResponse = {
  features?: StacFeature[];
};

export async function fetchSentinelStatus(
  init?: RequestInit
): Promise<SentinelStatus> {
  const body = {
    collections: ["sentinel-2-l2a"],
    bbox: ACEH_BBOX,
    limit: 1,
    sortby: [{ field: "properties.datetime", direction: "desc" }],
  };

  const res = await fetch(STAC_SEARCH, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 21_600 },
    ...init,
  });

  if (!res.ok) {
    throw new Error(`STAC search failed (${res.status})`);
  }

  const json = (await res.json()) as StacResponse;
  const feature = json.features?.[0];
  const props = feature?.properties;

  return {
    mosaic: {
      product: "s2cloudless",
      provider: "EOX",
      year: SENTINEL_CLOUDLESS_YEAR,
      tileUrl: SENTINEL_CLOUDLESS_TILES,
      cadence: "annual",
    },
    latestScene: feature
      ? {
          id: String(feature.id ?? ""),
          datetime: String(props?.datetime ?? ""),
          cloudCover:
            typeof props?.["eo:cloud_cover"] === "number"
              ? Math.round(props["eo:cloud_cover"] * 10) / 10
              : null,
          platform: props?.platform ? String(props.platform) : null,
        }
      : null,
    bbox: ACEH_BBOX,
    fetchedAt: new Date().toISOString(),
    source: "stac",
  };
}

export function formatSceneDate(iso: string | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}
