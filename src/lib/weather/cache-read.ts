import type { WeatherApiResponse, WeatherForecastKab } from "@/lib/weather-types";

/** Same gate as the previous Supabase short-circuit in `getWeatherForecasts`. */
export const WEATHER_CACHE_MIN_ROWS = 20;

export type WeatherCacheRow = {
  payload: unknown;
  source: string | null;
  fetched_at: string | null;
  expires_at: string | null;
};

export type WeatherCacheClass =
  | { kind: "miss" }
  | { kind: "fresh"; rows: WeatherCacheRow[] }
  | { kind: "expired" };

/** Future `expires_at` only. Past, equal, blank, or unparseable rows are not current. */
export function weatherCacheRowIsFresh(
  expiresAt: string | null | undefined,
  nowMs: number,
): boolean {
  if (typeof expiresAt !== "string" || expiresAt.trim() === "") return false;
  const ms = Date.parse(expiresAt);
  return Number.isFinite(ms) && ms > nowMs;
}

export function classifyWeatherCache(
  rows: readonly WeatherCacheRow[] | null | undefined,
  nowMs: number,
): WeatherCacheClass {
  if (!rows || rows.length === 0) return { kind: "miss" };
  const fresh = rows.filter((row) => weatherCacheRowIsFresh(row.expires_at, nowMs));
  if (fresh.length >= WEATHER_CACHE_MIN_ROWS) return { kind: "fresh", rows: fresh };
  if (fresh.length < rows.length) return { kind: "expired" };
  return { kind: "miss" };
}

export function weatherApiFromFreshRows(rows: readonly WeatherCacheRow[]): WeatherApiResponse {
  const kabupaten_kota = rows.map((row) => row.payload as WeatherForecastKab);
  const providers = Array.from(
    new Set(rows.map((row) => row.source).filter((source): source is string => Boolean(source))),
  );
  return {
    metadata: {
      total_kabupaten_kota: kabupaten_kota.length,
      fetched_at: rows[0]?.fetched_at ?? null,
      source: "cached",
      providers,
    },
    kabupaten_kota,
  };
}

/** Expired cache is not a forecast. No ledger exists, so no fetch stamp is invented. */
export function expiredWeatherApiResponse(): WeatherApiResponse {
  return {
    metadata: {
      total_kabupaten_kota: 0,
      fetched_at: null,
      source: "cached",
      providers: [],
    },
    kabupaten_kota: [],
  };
}
