import { readFile } from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";
import type {
  KabWeatherRegistry,
  KabWeatherRegistryEntry,
  WeatherApiResponse,
  WeatherForecastKab,
  WeatherSource,
} from "@/lib/weather-types";
import { kabupatenIndexKeys } from "@/lib/irbi-by-kab";
import { createServerClient } from "@/lib/supabase/server";
import { fetchBmkgForecast } from "./bmkg";
import {
  classifyWeatherCache,
  expiredWeatherApiResponse,
  weatherApiFromFreshRows,
  type WeatherCacheRow,
} from "./cache-read";
import { fetchOpenMeteoForecast } from "./open-meteo";

type IrbiKab = {
  kabupaten_kota?: string;
  kabupaten_kota_kode?: string;
  ir_cuaca_ekstrem?: number;
  kelas_cuaca_ekstrem?: string;
};

async function loadRegistry(): Promise<KabWeatherRegistryEntry[]> {
  const file = path.join(
    process.cwd(),
    "public/fixtures/kab-weather-registry.json",
  );
  const raw = await readFile(file, "utf8");
  const data = JSON.parse(raw) as KabWeatherRegistry;
  return data.kabupaten_kota;
}

async function loadIrbiCuacaMap(): Promise<
  Map<string, { ir: number; kelas: string }>
> {
  const file = path.join(process.cwd(), "public/fixtures/irbi-2025.json");
  const raw = await readFile(file, "utf8");
  const data = JSON.parse(raw) as { kabupaten_kota?: IrbiKab[] };
  const map = new Map<string, { ir: number; kelas: string }>();
  for (const kab of data.kabupaten_kota ?? []) {
    if (typeof kab.ir_cuaca_ekstrem !== "number" || !kab.kelas_cuaca_ekstrem) {
      continue;
    }
    const value = {
      ir: kab.ir_cuaca_ekstrem,
      kelas: kab.kelas_cuaca_ekstrem,
    };
    for (const key of kabupatenIndexKeys(kab)) {
      if (!map.has(key)) map.set(key, value);
    }
  }
  return map;
}

async function loadFixtureSnapshot(): Promise<WeatherApiResponse | null> {
  try {
    const file = path.join(
      process.cwd(),
      "public/fixtures/weather-snapshot.json",
    );
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as WeatherApiResponse;
  } catch {
    return null;
  }
}

function mergeIrbi(
  forecast: WeatherForecastKab,
  irbiMap: Map<string, { ir: number; kelas: string }>,
): WeatherForecastKab {
  let irbi: { ir: number; kelas: string } | undefined;
  for (const key of kabupatenIndexKeys(forecast)) {
    irbi = irbiMap.get(key);
    if (irbi) break;
  }
  if (!irbi) return forecast;
  return {
    ...forecast,
    ir_cuaca_ekstrem: irbi.ir,
    kelas_cuaca_ekstrem: irbi.kelas,
  };
}

async function fetchKabForecast(
  entry: KabWeatherRegistryEntry,
): Promise<WeatherForecastKab | null> {
  if (entry.adm4) {
    try {
      const bmkg = await fetchBmkgForecast(entry);
      if (bmkg) return bmkg;
    } catch {
      // fall through to Open-Meteo
    }
  }
  try {
    return await fetchOpenMeteoForecast(entry);
  } catch {
    return null;
  }
}

async function fetchAllForecastsLive(): Promise<WeatherApiResponse> {
  const registry = await loadRegistry();
  const irbiMap = await loadIrbiCuacaMap();
  const providers = new Set<string>();

  const results = await Promise.all(
    registry.map(async (entry) => {
      const forecast = await fetchKabForecast(entry);
      if (!forecast) return null;
      providers.add(forecast.source);
      return mergeIrbi(forecast, irbiMap);
    }),
  );

  const kabupaten_kota = results.filter(
    (r): r is WeatherForecastKab => r !== null,
  );
  const fetchedAt = new Date().toISOString();
  let source: WeatherSource = "open-meteo";
  if (providers.has("bmkg") && providers.size === 1) source = "bmkg";
  if (providers.size > 1) source = "cached";

  return {
    metadata: {
      total_kabupaten_kota: kabupaten_kota.length,
      fetched_at: fetchedAt,
      source,
      providers: Array.from(providers),
    },
    kabupaten_kota,
  };
}

const getCachedForecasts = unstable_cache(
  fetchAllForecastsLive,
  ["weather-all-aceh"],
  { revalidate: 3600, tags: ["weather"] },
);

export type OfficialWeatherRead =
  | { kind: "current"; body: WeatherApiResponse }
  | { kind: "expired"; body: WeatherApiResponse }
  | { kind: "fallback"; body: WeatherApiResponse };

async function loadWeatherCacheRows(): Promise<WeatherCacheRow[] | null> {
  const supabase = createServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("weather_forecasts")
    .select("payload, source, fetched_at, expires_at")
    .order("kabupaten_kota");

  if (error || !data) return null;
  return data.map((row) => ({
    payload: row.payload,
    source: row.source,
    fetched_at: row.fetched_at,
    expires_at: row.expires_at,
  }));
}

export async function getOfficialWeatherRead(nowMs = Date.now()): Promise<OfficialWeatherRead> {
  const rows = await loadWeatherCacheRows();
  const decision = classifyWeatherCache(rows, nowMs);
  if (decision.kind === "fresh") {
    return { kind: "current", body: weatherApiFromFreshRows(decision.rows) };
  }
  if (decision.kind === "expired") {
    return { kind: "expired", body: expiredWeatherApiResponse() };
  }
  return { kind: "fallback", body: await loadWeatherFallback() };
}

export async function getWeatherForecasts(): Promise<WeatherApiResponse> {
  const read = await getOfficialWeatherRead();
  return read.body;
}

async function loadWeatherFallback(): Promise<WeatherApiResponse> {
  try {
    const live = await getCachedForecasts();
    if (live.kabupaten_kota.length > 0) return live;
  } catch {
    // fall through
  }

  const fixture = await loadFixtureSnapshot();
  if (fixture) {
    fixture.metadata.source = "fixture";
    return fixture;
  }

  return {
    metadata: {
      total_kabupaten_kota: 0,
      fetched_at: new Date().toISOString(),
      source: "fixture",
      providers: [],
    },
    kabupaten_kota: [],
  };
}

export async function getWeatherBySlug(slug: string): Promise<WeatherForecastKab | null> {
  const all = await getWeatherForecasts();
  return all.kabupaten_kota.find((k) => k.slug === slug) ?? null;
}

export { loadRegistry };
