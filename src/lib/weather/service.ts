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
import { createServerClient } from "@/lib/supabase/server";
import { fetchBmkgForecast } from "./bmkg";
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
    const key = (
      kab.kabupaten_kota_kode ??
      kab.kabupaten_kota ??
      ""
    ).toUpperCase();
    if (!key) continue;
    if (typeof kab.ir_cuaca_ekstrem === "number" && kab.kelas_cuaca_ekstrem) {
      map.set(key, {
        ir: kab.ir_cuaca_ekstrem,
        kelas: kab.kelas_cuaca_ekstrem,
      });
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
  const irbi = irbiMap.get(forecast.kabupaten_kota_kode);
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

async function loadFromSupabase(): Promise<WeatherApiResponse | null> {
  const supabase = createServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("weather_forecasts")
    .select("kabupaten_kota, payload, source, fetched_at")
    .order("kabupaten_kota");

  if (error || !data || data.length === 0) return null;

  const kabupaten_kota = data.map(
    (row) => row.payload as unknown as WeatherForecastKab,
  );
  const providers = new Set(
    data.map((row) => row.source).filter(Boolean),
  );

  return {
    metadata: {
      total_kabupaten_kota: kabupaten_kota.length,
      fetched_at: data[0]?.fetched_at ?? new Date().toISOString(),
      source: "cached",
      providers: Array.from(providers),
    },
    kabupaten_kota,
  };
}

export async function getWeatherForecasts(): Promise<WeatherApiResponse> {
  const supabaseData = await loadFromSupabase();
  if (supabaseData && supabaseData.kabupaten_kota.length >= 20) {
    return supabaseData;
  }

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
