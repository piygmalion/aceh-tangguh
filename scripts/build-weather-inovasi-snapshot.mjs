/**
 * Build WeatherNext 3 inovasi snapshot for 23 kab/kota centroids.
 * Without Earth Engine allowlist, writes unconfigured + empty points.
 * Usage: node scripts/build-weather-inovasi-snapshot.mjs
 *
 * Bbox matches src/lib/basemap.ts ACEH_BBOX (not laporan ACEH_BOUNDS).
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { ACEH_BBOX } from "./lib/aceh-scope.mjs";
import {
  humidityFromTandTd,
  kelvinToC,
  metersToMm,
  msToKmh,
} from "./lib/weather-inovasi-convert.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** [minLon, minLat, maxLon, maxLat] — ACEH_BBOX */
export const ACEH_INOVASI_BBOX = ACEH_BBOX;

export const EE_STATION =
  "projects/gcp-public-data-weathernext/assets/weathernext_3_0_0_0p05deg";
export const EE_GRID =
  "projects/gcp-public-data-weathernext/assets/weathernext_3_0_0_0p1deg";

const OUT = path.join(root, "public/fixtures/weather-inovasi-snapshot.json");

export function isEarthEngineConfigured(env = process.env) {
  return Boolean(
    env.WEATHERNEXT_EE_PROJECT &&
      (env.GOOGLE_APPLICATION_CREDENTIALS ||
        env.WEATHERNEXT_EE_ACCESS_TOKEN ||
        env.WEATHERNEXT_EE_RAW_PATH),
  );
}

export function unconfiguredSnapshot() {
  return {
    metadata: {
      kind: "inovasi",
      model: "weathernext-3",
      official: false,
      status: "unconfigured",
      fetched_at: null,
      init_time: null,
      providers: ["weathernext-3"],
    },
    kabupaten_kota: [],
  };
}

export function convertRawPoint(entry, raw) {
  const temperature_c = kelvinToC(raw.temperature_k);
  const dew_c = kelvinToC(raw.dewpoint_k);
  return {
    slug: entry.slug,
    kabupaten_kota: entry.kabupaten_kota,
    latitude: entry.latitude,
    longitude: entry.longitude,
    temperature_c,
    temperature_p10_c: kelvinToC(raw.temperature_p10_k),
    temperature_p90_c: kelvinToC(raw.temperature_p90_k),
    humidity_pct: humidityFromTandTd(temperature_c, dew_c),
    precipitation_mm: metersToMm(raw.precip_m),
    precipitation_p90_mm: metersToMm(raw.precip_p90_m),
    wind_speed_kmh: msToKmh(raw.wind_ms),
    forecast_hour: raw.forecast_hour ?? null,
    valid_time: raw.valid_time ?? null,
  };
}

async function loadRegistry() {
  const file = path.join(root, "public/fixtures/kab-weather-registry.json");
  const data = JSON.parse(await readFile(file, "utf8"));
  return data.kabupaten_kota;
}

async function loadRawOverride(env) {
  const rawPath = env.WEATHERNEXT_EE_RAW_PATH;
  if (!rawPath) return null;
  const abs = path.isAbsolute(rawPath) ? rawPath : path.join(root, rawPath);
  return JSON.parse(await readFile(abs, "utf8"));
}

async function writeSnapshot(snapshot) {
  await writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

async function main() {
  if (!isEarthEngineConfigured()) {
    await writeSnapshot(unconfiguredSnapshot());
    console.log(
      "WeatherNext 3 unconfigured (no WEATHERNEXT_EE_PROJECT + token/raw). Wrote empty inovasi fixture.",
    );
    return;
  }

  const registry = await loadRegistry();
  const rawBundle = await loadRawOverride(process.env);
  if (!rawBundle?.points || typeof rawBundle.points !== "object") {
    console.error(
      "Earth Engine live fetch is not implemented in this script without WEATHERNEXT_EE_RAW_PATH. Refusing to invent points.",
    );
    process.exit(1);
  }

  const points = [];
  for (const entry of registry) {
    const raw = rawBundle.points[entry.slug];
    if (!raw) continue;
    points.push(convertRawPoint(entry, raw));
  }

  if (points.length === 0) {
    console.error("Raw override had no matching kab slugs. Refusing empty-as-success weather.");
    process.exit(1);
  }

  const snapshot = {
    metadata: {
      kind: "inovasi",
      model: "weathernext-3",
      official: false,
      status: "ok",
      fetched_at: new Date().toISOString(),
      init_time: rawBundle.init_time ?? null,
      providers: ["weathernext-3"],
    },
    kabupaten_kota: points,
  };
  await writeSnapshot(snapshot);
  console.log(`Wrote ${points.length} inovasi points (raw override).`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
