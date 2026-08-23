import type {
  KabWeatherRegistryEntry,
  WeatherCurrent,
  WeatherDaily,
  WeatherForecastKab,
  WeatherHourly,
} from "@/lib/weather-types";
import { wmoDescription } from "./wmo-descriptions";

type OpenMeteoResponse = {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    weather_code: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
  };
};

export async function fetchOpenMeteoForecast(
  entry: KabWeatherRegistryEntry,
): Promise<WeatherForecastKab | null> {
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
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as OpenMeteoResponse;
  if (!data.current) return null;

  const fetchedAt = new Date().toISOString();
  const currentCode = data.current.weather_code;
  const currentDesc = wmoDescription(currentCode);

  const current: WeatherCurrent = {
    temperature_c: data.current.temperature_2m,
    humidity_pct: data.current.relative_humidity_2m,
    weather_code: currentCode,
    weather_desc_id: currentDesc.id,
    weather_desc_en: currentDesc.en,
    wind_speed_kmh: data.current.wind_speed_10m,
    wind_direction_deg: data.current.wind_direction_10m,
    precipitation_mm: data.current.precipitation,
  };

  const hourly: WeatherHourly[] = [];
  if (data.hourly?.time) {
    for (let i = 0; i < data.hourly.time.length && i < 24; i++) {
      const code = data.hourly.weather_code[i] ?? 0;
      const desc = wmoDescription(code);
      hourly.push({
        datetime_local: data.hourly.time[i],
        temperature_c: data.hourly.temperature_2m[i] ?? 0,
        precipitation_mm: data.hourly.precipitation[i] ?? 0,
        weather_code: code,
        weather_desc_id: desc.id,
        weather_desc_en: desc.en,
      });
    }
  }

  const daily: WeatherDaily[] = [];
  if (data.daily?.time) {
    for (let i = 0; i < data.daily.time.length; i++) {
      const code = data.daily.weather_code[i] ?? 0;
      const desc = wmoDescription(code);
      daily.push({
        date: data.daily.time[i],
        temp_min_c: data.daily.temperature_2m_min[i] ?? 0,
        temp_max_c: data.daily.temperature_2m_max[i] ?? 0,
        precipitation_mm: data.daily.precipitation_sum[i] ?? 0,
        weather_code: code,
        weather_desc_id: desc.id,
        weather_desc_en: desc.en,
      });
    }
  }

  return {
    slug: entry.slug,
    kabupaten_kota: entry.kabupaten_kota,
    kabupaten_kota_kode: entry.kabupaten_kota_kode,
    latitude: entry.latitude,
    longitude: entry.longitude,
    adm2: entry.adm2,
    adm4: entry.adm4,
    is_kota: entry.is_kota,
    current,
    hourly,
    daily,
    source: "open-meteo",
    fetched_at: fetchedAt,
  };
}
