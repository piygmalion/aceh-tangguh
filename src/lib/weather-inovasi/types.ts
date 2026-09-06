export const WEATHER_INOVASI_KIND = "inovasi" as const;
export const WEATHER_INOVASI_MODEL = "weathernext-3" as const;

export type WeatherInovasiStatus =
  | "ok"
  | "stale"
  | "unconfigured"
  | "upstream";

export interface WeatherInovasiPoint {
  slug: string;
  kabupaten_kota: string;
  latitude: number;
  longitude: number;
  temperature_c: number | null;
  temperature_p10_c: number | null;
  temperature_p90_c: number | null;
  humidity_pct: number | null;
  precipitation_mm: number | null;
  precipitation_p90_mm: number | null;
  wind_speed_kmh: number | null;
  forecast_hour: number | null;
  valid_time: string | null;
}

export interface WeatherInovasiMetadata {
  kind: typeof WEATHER_INOVASI_KIND;
  model: typeof WEATHER_INOVASI_MODEL;
  official: false;
  status: WeatherInovasiStatus;
  fetched_at: string | null;
  init_time: string | null;
  providers: string[];
}

export interface WeatherInovasiResponse {
  metadata: WeatherInovasiMetadata;
  kabupaten_kota: WeatherInovasiPoint[];
}

export function emptyInovasiResponse(
  status: WeatherInovasiStatus,
  fetchedAt: string | null = null,
): WeatherInovasiResponse {
  return {
    metadata: {
      kind: WEATHER_INOVASI_KIND,
      model: WEATHER_INOVASI_MODEL,
      official: false,
      status,
      fetched_at: fetchedAt,
      init_time: null,
      providers: [WEATHER_INOVASI_MODEL],
    },
    kabupaten_kota: [],
  };
}

export function isInovasiResponse(value: unknown): value is WeatherInovasiResponse {
  if (!value || typeof value !== "object") return false;
  const meta = (value as WeatherInovasiResponse).metadata;
  return (
    meta?.kind === WEATHER_INOVASI_KIND &&
    meta.official === false &&
    Array.isArray((value as WeatherInovasiResponse).kabupaten_kota)
  );
}
