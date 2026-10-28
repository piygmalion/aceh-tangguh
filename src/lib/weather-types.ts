export type WeatherSource = "bmkg" | "open-meteo" | "cached" | "fixture";

export interface WeatherCurrent {
  temperature_c: number;
  humidity_pct: number;
  weather_code: number;
  weather_desc_id: string;
  weather_desc_en: string;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  precipitation_mm: number;
  image_url?: string;
}

export interface WeatherHourly {
  datetime_local: string;
  temperature_c: number;
  precipitation_mm: number;
  weather_code: number;
  weather_desc_id: string;
  weather_desc_en: string;
}

export interface WeatherDaily {
  date: string;
  temp_min_c: number;
  temp_max_c: number;
  precipitation_mm: number;
  weather_code: number;
  weather_desc_id: string;
  weather_desc_en: string;
}

export interface WeatherForecastKab {
  slug: string;
  kabupaten_kota: string;
  kabupaten_kota_kode: string;
  latitude: number;
  longitude: number;
  adm2: string;
  adm4?: string;
  is_kota: boolean;
  current: WeatherCurrent;
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
  ir_cuaca_ekstrem?: number;
  kelas_cuaca_ekstrem?: string;
  source: WeatherSource;
  fetched_at: string;
  analysis_date?: string;
}

export interface WeatherApiResponse {
  metadata: {
    total_kabupaten_kota: number;
    fetched_at: string | null;
    source: WeatherSource;
    providers: string[];
  };
  kabupaten_kota: WeatherForecastKab[];
}

export interface KabWeatherRegistryEntry {
  slug: string;
  kabupaten_kota: string;
  kabupaten_kota_kode: string;
  adm2: string;
  adm4?: string;
  latitude: number;
  longitude: number;
  is_kota: boolean;
}

export interface KabWeatherRegistry {
  metadata: Record<string, unknown>;
  kabupaten_kota: KabWeatherRegistryEntry[];
}
