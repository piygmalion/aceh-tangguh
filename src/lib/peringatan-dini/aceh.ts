import { ACEH_BBOX } from "@/lib/basemap";

/** Aceh kabupaten/kota names used to match MAGMA wilayah text. */
export const ACEH_WILAYAH_TERMS = [
  "aceh",
  "banda aceh",
  "sabang",
  "langsa",
  "lhokseumawe",
  "subulussalam",
  "simeulue",
  "aceh selatan",
  "aceh tenggara",
  "aceh timur",
  "aceh tengah",
  "aceh barat",
  "aceh besar",
  "pidie jaya",
  "pidie",
  "aceh utara",
  "aceh barat daya",
  "gayo lues",
  "aceh tamiang",
  "nagan raya",
  "aceh jaya",
  "bener meriah",
  "bireuen",
  "aceh singkil",
] as const;

export function isInsideAcehBbox(lon: number, lat: number): boolean {
  const [minLon, minLat, maxLon, maxLat] = ACEH_BBOX;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

export function mentionsAceh(text: string | null | undefined): boolean {
  if (!text) return false;
  const hay = text.toLowerCase();
  return ACEH_WILAYAH_TERMS.some((term) => hay.includes(term));
}

export function isAcehRelevant(opts: {
  lon?: number | null;
  lat?: number | null;
  texts?: Array<string | null | undefined>;
}): boolean {
  const { lon, lat, texts = [] } = opts;
  if (
    typeof lon === "number" &&
    Number.isFinite(lon) &&
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    isInsideAcehBbox(lon, lat)
  ) {
    return true;
  }
  return texts.some((t) => mentionsAceh(t));
}
