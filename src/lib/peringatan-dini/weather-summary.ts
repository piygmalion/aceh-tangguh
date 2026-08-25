import type { WeatherApiResponse, WeatherForecastKab } from "@/lib/weather-types";
import type { CuacaHighlight, CuacaWarningCard, PeringatanTone } from "@/lib/peringatan-dini-types";
import { CUACA_HREF } from "@/lib/peringatan-dini-types";

type ScoredKab = {
  kab: WeatherForecastKab;
  score: number;
  tone: PeringatanTone;
  kondisi: string[];
  rainMm: number | null;
  periode: string | null;
  sourceLabel: string;
};

const HEAVY_RAIN_CODES = new Set([65, 82]);
const MODERATE_RAIN_CODES = new Set([63, 67, 81]);
const STORM_CODES = new Set([95, 96, 99]);

const EXTREME_WORDS =
  /hujan ekstrem|hujan lebat|angin kencang|gelombang|thunderstorm|violent rain|heavy rain|petir/i;

function maxRainMm(kab: WeatherForecastKab): { value: number; periode: string | null } {
  const daily = kab.daily[0];
  const dailyMm = daily && typeof daily.precipitation_mm === "number" ? daily.precipitation_mm : 0;
  const currentMm =
    typeof kab.current.precipitation_mm === "number" ? kab.current.precipitation_mm : 0;
  const hourlyMax = kab.hourly.reduce(
    (acc, slot) => Math.max(acc, slot.precipitation_mm || 0),
    0,
  );
  const value = Math.max(dailyMm, currentMm, hourlyMax);
  return {
    value,
    periode: daily?.date ?? kab.analysis_date ?? null,
  };
}

function codesToWatch(kab: WeatherForecastKab): number[] {
  const codes = [kab.current.weather_code];
  for (const slot of kab.hourly) codes.push(slot.weather_code);
  if (kab.daily[0]) codes.push(kab.daily[0].weather_code);
  return codes;
}

function sourceLabel(kab: WeatherForecastKab, providers: string[]): string {
  if (kab.source === "bmkg") return "BMKG";
  if (kab.source === "open-meteo") return "Open-Meteo";
  const set = new Set(providers.map((p) => p.toLowerCase()));
  if (set.has("bmkg") && !set.has("open-meteo")) return "BMKG";
  if (set.has("open-meteo") && !set.has("bmkg")) return "Open-Meteo";
  if (set.has("bmkg")) return "BMKG / Open-Meteo";
  return "BMKG";
}

function scoreKab(kab: WeatherForecastKab, providers: string[]): ScoredKab | null {
  const { value: rainMm, periode } = maxRainMm(kab);
  const wind = kab.current.wind_speed_kmh ?? 0;
  const codes = codesToWatch(kab);
  const desc = `${kab.current.weather_desc_id} ${kab.current.weather_desc_en}`;
  const kondisi: string[] = [];
  let score = 0;
  let tone: PeringatanTone = "neutral";

  if (codes.some((c) => STORM_CODES.has(c)) || /petir|thunderstorm/i.test(desc)) {
    score += 90;
    tone = "danger";
    kondisi.push("Petir");
  }
  if (codes.some((c) => HEAVY_RAIN_CODES.has(c)) || /hujan lebat|hujan ekstrem|violent rain|heavy rain/i.test(desc)) {
    score += 80;
    tone = "danger";
    kondisi.push("Hujan lebat");
  } else if (codes.some((c) => MODERATE_RAIN_CODES.has(c)) && rainMm >= 10) {
    score += 45;
    if (tone === "neutral") tone = "warn";
    kondisi.push("Hujan sedang");
  }

  if (rainMm >= 50) {
    score += 70;
    tone = "danger";
    if (!kondisi.includes("Hujan lebat")) kondisi.push("Hujan ekstrem");
  } else if (rainMm >= 20) {
    score += 50;
    if (tone === "neutral") tone = "warn";
    if (!kondisi.some((k) => /hujan/i.test(k))) kondisi.push("Hujan lebat");
  }

  if (wind >= 60) {
    score += 70;
    tone = "danger";
    kondisi.push("Angin kencang");
  } else if (wind >= 40) {
    score += 40;
    if (tone === "neutral") tone = "warn";
    kondisi.push("Angin kencang");
  }

  if (EXTREME_WORDS.test(desc) && score < 40) {
    score += 40;
    if (tone === "neutral") tone = "warn";
    if (!kondisi.length) kondisi.push(kab.current.weather_desc_id);
  }

  if (score < 40) return null;

  return {
    kab,
    score,
    tone,
    kondisi: kondisi.length ? kondisi : [kab.current.weather_desc_id],
    rainMm: Number.isFinite(rainMm) ? Math.round(rainMm * 10) / 10 : null,
    periode,
    sourceLabel: sourceLabel(kab, providers),
  };
}

function worstTone(items: ScoredKab[]): PeringatanTone {
  if (items.some((i) => i.tone === "danger")) return "danger";
  if (items.some((i) => i.tone === "warn")) return "warn";
  return "neutral";
}

export function summarizeWeatherWarning(
  data: WeatherApiResponse,
  href = CUACA_HREF,
): CuacaWarningCard {
  const providers = data.metadata.providers ?? [];
  const scored = data.kabupaten_kota
    .map((kab) => scoreKab(kab, providers))
    .filter((row): row is ScoredKab => row !== null)
    .sort((a, b) => b.score - a.score || (b.rainMm ?? 0) - (a.rainMm ?? 0));

  const top = scored.slice(0, 2);
  const highlights: CuacaHighlight[] = top.map((row) => ({
    kabupaten: row.kab.kabupaten_kota,
    kondisi: row.kondisi.join(" · "),
    curah_hujan_mm: row.rainMm,
    periode: row.periode,
    source_label: row.sourceLabel,
  }));

  return {
    kind: "cuaca",
    tone: worstTone(scored),
    empty: scored.length === 0,
    highlights,
    extra_count: Math.max(0, scored.length - highlights.length),
    fetched_at: data.metadata.fetched_at,
    providers,
    href,
    stale: data.metadata.source === "fixture",
    source: data.metadata.source === "fixture" ? "fixture" : "live",
  };
}
