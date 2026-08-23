/**
 * Build weather snapshot fixture from Open-Meteo for all 23 kab/kota.
 * Usage: node scripts/build-weather-snapshot.mjs
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const WMO_MAP = {
  0: { id: "Cerah", en: "Clear" },
  1: { id: "Cerah", en: "Mainly clear" },
  2: { id: "Cerah Berawan", en: "Partly cloudy" },
  3: { id: "Berawan", en: "Overcast" },
  45: { id: "Kabut", en: "Fog" },
  48: { id: "Kabut", en: "Depositing rime fog" },
  51: { id: "Hujan Ringan", en: "Light drizzle" },
  53: { id: "Hujan Ringan", en: "Moderate drizzle" },
  55: { id: "Hujan Sedang", en: "Dense drizzle" },
  61: { id: "Hujan Ringan", en: "Slight rain" },
  63: { id: "Hujan Sedang", en: "Moderate rain" },
  65: { id: "Hujan Lebat", en: "Heavy rain" },
  80: { id: "Hujan Ringan", en: "Slight rain showers" },
  81: { id: "Hujan Sedang", en: "Moderate rain showers" },
  82: { id: "Hujan Lebat", en: "Violent rain showers" },
  95: { id: "Petir", en: "Thunderstorm" },
};

function wmo(code) {
  return WMO_MAP[code] ?? { id: "Tidak diketahui", en: "Unknown" };
}

async function fetchOpenMeteo(entry) {
  const params = new URLSearchParams({
    latitude: String(entry.latitude),
    longitude: String(entry.longitude),
    current:
      "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
    hourly: "temperature_2m,precipitation,weather_code",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
    timezone: "Asia/Jakarta",
    forecast_days: "3",
  });
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );
  if (!res.ok) throw new Error(`Open-Meteo failed for ${entry.slug}`);
  const data = await res.json();
  const fetchedAt = new Date().toISOString();
  const code = data.current.weather_code;
  const desc = wmo(code);
  return {
    slug: entry.slug,
    kabupaten_kota: entry.kabupaten_kota,
    kabupaten_kota_kode: entry.kabupaten_kota_kode,
    latitude: entry.latitude,
    longitude: entry.longitude,
    adm2: entry.adm2,
    adm4: entry.adm4,
    is_kota: entry.is_kota,
    current: {
      temperature_c: data.current.temperature_2m,
      humidity_pct: data.current.relative_humidity_2m,
      weather_code: code,
      weather_desc_id: desc.id,
      weather_desc_en: desc.en,
      wind_speed_kmh: data.current.wind_speed_10m,
      wind_direction_deg: data.current.wind_direction_10m,
      precipitation_mm: data.current.precipitation,
    },
    hourly: data.hourly.time.slice(0, 24).map((t, i) => {
      const c = data.hourly.weather_code[i];
      const d = wmo(c);
      return {
        datetime_local: t,
        temperature_c: data.hourly.temperature_2m[i],
        precipitation_mm: data.hourly.precipitation[i],
        weather_code: c,
        weather_desc_id: d.id,
        weather_desc_en: d.en,
      };
    }),
    daily: data.daily.time.map((t, i) => {
      const c = data.daily.weather_code[i];
      const d = wmo(c);
      return {
        date: t,
        temp_min_c: data.daily.temperature_2m_min[i],
        temp_max_c: data.daily.temperature_2m_max[i],
        precipitation_mm: data.daily.precipitation_sum[i],
        weather_code: c,
        weather_desc_id: d.id,
        weather_desc_en: d.en,
      };
    }),
    source: "open-meteo",
    fetched_at: fetchedAt,
  };
}

async function main() {
  const registryPath = path.join(
    root,
    "public/fixtures/kab-weather-registry.json",
  );
  const irbiPath = path.join(root, "public/fixtures/irbi-2025.json");
  const registry = JSON.parse(await readFile(registryPath, "utf8"));
  const irbi = JSON.parse(await readFile(irbiPath, "utf8"));
  const irbiMap = new Map();
  for (const kab of irbi.kabupaten_kota ?? []) {
    irbiMap.set(kab.kabupaten_kota_kode, kab);
  }

  const results = [];
  for (const entry of registry.kabupaten_kota) {
    process.stdout.write(`Fetching ${entry.slug}...`);
    const forecast = await fetchOpenMeteo(entry);
    const ir = irbiMap.get(entry.kabupaten_kota_kode);
    if (ir) {
      forecast.ir_cuaca_ekstrem = ir.ir_cuaca_ekstrem;
      forecast.kelas_cuaca_ekstrem = ir.kelas_cuaca_ekstrem;
    }
    results.push(forecast);
    console.log(" OK");
    await new Promise((r) => setTimeout(r, 300));
  }

  const snapshot = {
    metadata: {
      total_kabupaten_kota: results.length,
      fetched_at: new Date().toISOString(),
      source: "fixture",
      providers: ["open-meteo"],
    },
    kabupaten_kota: results,
  };

  const outPath = path.join(root, "public/fixtures/weather-snapshot.json");
  await writeFile(outPath, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`Written ${results.length} forecasts to weather-snapshot.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
