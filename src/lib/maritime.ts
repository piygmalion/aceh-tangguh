import { readFile } from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { ACEH_PERAIRAN_CODES } from "@/lib/overlay-layers";
import { COLOR_TOKENS } from "@/lib/layer-colors";
import { readMaritimeWarningIndex } from "@/lib/maritime-warning-index";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const BMKG_MARINE_BASE = "https://maritim.bmkg.go.id/marine2026-data";
const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; BMKG Maritim)";

export type MaritimeJenis = "perairan" | "pelabuhan";

export type MaritimeHourSlot = {
  time?: string;
  weather?: string;
  temp_avg?: number;
  rh_avg?: number;
  wind_from?: string;
  wind_speed?: number;
  wind_gust?: number;
  visibility?: number;
  tides?: number;
  wave_cat?: string;
  wave_height?: number;
  current_to?: string;
  current_speed?: number;
};

export type MaritimeForecast = {
  code: string;
  name?: string;
  issued?: string;
  valid_from?: string;
  valid_to?: string;
  nama_stasiun?: string;
  forecast_day1?: MaritimeHourSlot[];
  "forecast_day2-4"?: MaritimeHourSlot[];
};

export type MaritimeSlotSummary = {
  kode: string;
  name: string;
  issued: string | null;
  stale: boolean;
  weather: string | null;
  wave_cat: string | null;
  wave_height: number | null;
  wind_from: string | null;
  wind_speed: number | null;
  fillColor: string;
};

const WAVE_FILL: Record<string, string> = {
  tenang: COLOR_TOKENS.sage,
  rendah: COLOR_TOKENS.teal,
  sedang: COLOR_TOKENS.gold,
  tinggi: COLOR_TOKENS.orange,
  "sangat tinggi": COLOR_TOKENS.awas,
  ekstrem: COLOR_TOKENS.awas,
  "sangat ekstrem": COLOR_TOKENS.awas,
};

export function waveCatFill(cat: string | null | undefined): string {
  if (!cat) return COLOR_TOKENS.teal;
  return WAVE_FILL[cat.trim().toLowerCase()] ?? COLOR_TOKENS.teal;
}

const OUTLOOK_RANK: Record<string, number> = {
  tenang: 0,
  rendah: 1,
  sedang: 2,
  tinggi: 3,
  "sangat tinggi": 4,
  ekstrem: 5,
  "sangat ekstrem": 5,
};

/** Peak category on later slots. Text only — does not replace slot fillColor. */
export function outlookPeakWaveCat(slots: MaritimeHourSlot[]): string | null {
  let best: string | null = null;
  let bestRank = -1;
  for (const slot of slots) {
    const cat = slot.wave_cat ? String(slot.wave_cat).trim() : "";
    if (!cat) continue;
    const rank = OUTLOOK_RANK[cat.toLowerCase()] ?? -1;
    if (rank > bestRank) {
      bestRank = rank;
      best = cat;
    }
  }
  return best;
}

export function pickCurrentSlot(forecast: MaritimeForecast, now = Date.now()): MaritimeHourSlot | null {
  const day1 = Array.isArray(forecast.forecast_day1) ? forecast.forecast_day1 : [];
  const later = Array.isArray(forecast["forecast_day2-4"]) ? forecast["forecast_day2-4"] : [];
  const slots = [...day1, ...later];
  if (slots.length === 0) return null;
  const upcoming = slots.find((s) => {
    const ms = Date.parse(String(s.time ?? "").replace(" UTC", "Z"));
    return Number.isFinite(ms) && ms >= now - 60 * 60 * 1000;
  });
  return upcoming ?? slots[0] ?? null;
}

async function fetchForecastJson(jenis: MaritimeJenis, kode: string): Promise<MaritimeForecast> {
  const url = `${BMKG_MARINE_BASE}/${jenis}/${encodeURIComponent(kode)}.json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BMKG maritim ${jenis}/${kode} ${res.status}`);
  const data = (await res.json()) as MaritimeForecast;
  if (!data || typeof data !== "object") throw new Error("BMKG maritim unreadable");
  return { ...data, code: data.code || kode };
}

function summarize(forecast: MaritimeForecast, stale: boolean): MaritimeSlotSummary {
  const slot = pickCurrentSlot(forecast);
  const waveCat = slot?.wave_cat ? String(slot.wave_cat) : null;
  return {
    kode: forecast.code,
    name: forecast.name || forecast.code,
    issued: forecast.issued ?? null,
    stale,
    weather: slot?.weather ? String(slot.weather) : null,
    wave_cat: waveCat,
    wave_height: typeof slot?.wave_height === "number" ? slot.wave_height : null,
    wind_from: slot?.wind_from ? String(slot.wind_from) : null,
    wind_speed: typeof slot?.wind_speed === "number" ? slot.wind_speed : null,
    fillColor: waveCatFill(waveCat),
  };
}

/** Same window as weather / overlay live cron. */
export const MARITIME_TTL_MS = 2 * 60 * 60 * 1000;

export function maritimeExpiresAt(nowMs: number = Date.now()): string {
  return new Date(nowMs + MARITIME_TTL_MS).toISOString();
}

export function isMaritimeCacheStale(
  expiresAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!expiresAt) return false;
  const ms = Date.parse(expiresAt);
  return Number.isFinite(ms) && ms < nowMs;
}

async function persistForecast(jenis: MaritimeJenis, forecast: MaritimeForecast): Promise<void> {
  const client = createServiceClient();
  if (!client) return;
  const now = new Date();
  await client.from("maritime_forecast_cache").upsert({
    kode: forecast.code,
    jenis,
    issued: forecast.issued ?? null,
    valid_from: forecast.valid_from ?? null,
    valid_to: forecast.valid_to ?? null,
    payload: forecast as unknown as Json,
    fetched_at: now.toISOString(),
    expires_at: maritimeExpiresAt(now.getTime()),
  });
}

async function readCachedForecast(kode: string): Promise<{
  forecast: MaritimeForecast;
  expires_at: string | null;
} | null> {
  const client = createServerClient();
  if (!client) return null;
  const { data, error } = await client
    .from("maritime_forecast_cache")
    .select("payload, expires_at")
    .eq("kode", kode)
    .maybeSingle();
  if (error || !data?.payload || typeof data.payload !== "object") return null;
  return {
    forecast: data.payload as MaritimeForecast,
    expires_at: data.expires_at ?? null,
  };
}

/** GET path: cache only. Cron writes via refreshMaritimeForecasts. */
export async function loadMaritimeForecast(
  _jenis: MaritimeJenis,
  kode: string,
): Promise<{ forecast: MaritimeForecast; stale: boolean } | null> {
  const cached = await readCachedForecast(kode);
  if (!cached) return null;
  return {
    forecast: cached.forecast,
    stale: isMaritimeCacheStale(cached.expires_at),
  };
}

export type MaritimeRefreshCode = {
  jenis: MaritimeJenis;
  kode: string;
  ok: boolean;
};

export async function refreshMaritimeForecasts(): Promise<{
  ok: number;
  failed: number;
  codes: MaritimeRefreshCode[];
}> {
  const ports = await allowedPelabuhanKodes();
  const jobs: Array<{ jenis: MaritimeJenis; kode: string }> = [
    ...ACEH_PERAIRAN_CODES.map((kode) => ({ jenis: "perairan" as const, kode })),
    ...Array.from(ports).map((kode) => ({ jenis: "pelabuhan" as const, kode })),
  ];
  const codes = await Promise.all(
    jobs.map(async ({ jenis, kode }): Promise<MaritimeRefreshCode> => {
      try {
        const forecast = await fetchForecastJson(jenis, kode);
        await persistForecast(jenis, forecast);
        return { jenis, kode, ok: true };
      } catch (err) {
        console.error("[maritime-refresh]", jenis, kode, err);
        return { jenis, kode, ok: false };
      }
    }),
  );
  return {
    ok: codes.filter((row) => row.ok).length,
    failed: codes.filter((row) => !row.ok).length,
    codes,
  };
}

const getCachedAcehWaterForecasts = unstable_cache(
  async () => {
    const entries = await Promise.all(
      ACEH_PERAIRAN_CODES.map(async (kode) => {
        const loaded = await loadMaritimeForecast("perairan", kode);
        return [kode, loaded] as const;
      }),
    );
    return Object.fromEntries(entries) as Record<
      string,
      { forecast: MaritimeForecast; stale: boolean } | null
    >;
  },
  ["maritime-perairan-aceh"],
  { revalidate: 3600, tags: ["maritime-perairan"] },
);

export async function loadPerairanGeojson(): Promise<FeatureCollection<Geometry>> {
  const file = path.join(process.cwd(), "public/fixtures/overlays/perairan-aceh.geojson");
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as FeatureCollection<Geometry>;
}

export async function loadPelabuhanGeojson(): Promise<FeatureCollection> {
  const file = path.join(
    process.cwd(),
    "public/fixtures/overlays/pelabuhan-aceh.geojson",
  );
  const raw = await readFile(file, "utf8");
  const fixture = JSON.parse(raw) as FeatureCollection;
  const client = createServerClient();
  if (!client) return fixture;
  try {
    const { data, error } = await client
      .from("overlay_static_features")
      .select("*")
      .eq("layer_key", "maritimePorts");
    if (error || !data?.length) return fixture;
    return {
      type: "FeatureCollection",
      features: data.map((row) => ({
        type: "Feature" as const,
        id: row.kode_bmkg || row.id,
        geometry: {
          type: "Point" as const,
          coordinates: [row.longitude, row.latitude],
        },
        properties: {
          ...(typeof row.properties === "object" && row.properties
            ? (row.properties as Record<string, unknown>)
            : {}),
          layer: "maritimePorts",
          title: row.name,
          kode_bmkg: row.kode_bmkg,
          code: row.kode_bmkg,
          name: row.name,
        },
      })),
    };
  } catch {
    return fixture;
  }
}

export async function getPerairanOverlay(): Promise<
  FeatureCollection<Geometry> & { stale: boolean; source: string }
> {
  const [fc, forecasts, warnings] = await Promise.all([
    loadPerairanGeojson(),
    getCachedAcehWaterForecasts(),
    readMaritimeWarningIndex(),
  ]);
  let anyStale = false;
  const features: Feature<Geometry>[] = fc.features.map((f) => {
    const kode = String(f.properties?.kode ?? f.properties?.ID_MAR ?? "");
    const loaded = forecasts[kode];
    if (!loaded) {
      const warning = warnings[kode];
      return {
        ...f,
        properties: {
          ...f.properties,
          fillColor: COLOR_TOKENS.teal,
          stale: true,
          in_warning: Boolean(warning),
          warning_cat: warning?.wave_cat ?? null,
        },
      };
    }
    anyStale = anyStale || loaded.stale;
    const summary = summarize(loaded.forecast, loaded.stale);
    const warning = warnings[kode];
    const outlook = outlookPeakWaveCat(
      Array.isArray(loaded.forecast["forecast_day2-4"]) ? loaded.forecast["forecast_day2-4"] : [],
    );
    return {
      ...f,
      properties: {
        ...f.properties,
        ...summary,
        title: summary.name,
        status: summary.wave_cat ?? summary.weather ?? "",
        in_warning: Boolean(warning),
        warning_cat: warning?.wave_cat ?? null,
        outlook_max_wave_cat: outlook,
      },
    };
  });
  return {
    type: "FeatureCollection",
    features,
    stale: anyStale,
    source: "bmkg-maritim",
  };
}

let pelabuhanKodeCache: Set<string> | null = null;

/**
 * Port codes we are willing to proxy to BMKG. Without this the route is an
 * open fetch proxy for any `{kode}.json` under the BMKG maritime base and
 * lets callers seed `maritime_forecast_cache` with arbitrary rows.
 */
export async function allowedPelabuhanKodes(): Promise<Set<string>> {
  if (pelabuhanKodeCache) return pelabuhanKodeCache;
  const fc = await loadPelabuhanGeojson();
  const set = new Set<string>();
  for (const feature of fc.features) {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const kode = String(props.kode_bmkg ?? props.code ?? "").trim().toUpperCase();
    if (kode) set.add(kode);
  }
  pelabuhanKodeCache = set;
  return set;
}

export async function getPelabuhanForecast(kode: string): Promise<{
  kode: string;
  name: string;
  issued: string | null;
  stale: boolean;
  slot: MaritimeHourSlot | null;
  forecast: MaritimeForecast | null;
}> {
  const loaded = await loadMaritimeForecast("pelabuhan", kode);
  if (!loaded) {
    return {
      kode,
      name: kode,
      issued: null,
      stale: true,
      slot: null,
      forecast: null,
    };
  }
  return {
    kode: loaded.forecast.code,
    name: loaded.forecast.name || kode,
    issued: loaded.forecast.issued ?? null,
    stale: loaded.stale,
    slot: pickCurrentSlot(loaded.forecast),
    forecast: loaded.forecast,
  };
}

export const MARITIME_WATER_LEGEND = [
  { color: COLOR_TOKENS.sage, label: "Tenang" },
  { color: COLOR_TOKENS.teal, label: "Rendah" },
  { color: COLOR_TOKENS.gold, label: "Sedang" },
  { color: COLOR_TOKENS.orange, label: "Tinggi" },
  { color: COLOR_TOKENS.awas, label: "Sangat tinggi / ekstrem" },
];
