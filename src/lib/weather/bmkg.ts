import type {
  KabWeatherRegistryEntry,
  WeatherCurrent,
  WeatherDaily,
  WeatherForecastKab,
  WeatherHourly,
} from "@/lib/weather-types";

type BmkgCuacaSlot = {
  local_datetime?: string;
  t?: number;
  hu?: number;
  tp?: number;
  weather?: number;
  weather_desc?: string;
  weather_desc_en?: string;
  ws?: number;
  wd_deg?: number;
  image?: string;
  analysis_date?: string;
};

type BmkgResponse = {
  lokasi?: {
    lat?: number;
    lon?: number;
    kotkab?: string;
  };
  data?: Array<{
    cuaca?: BmkgCuacaSlot[][];
  }>;
};

export async function fetchBmkgForecast(
  entry: KabWeatherRegistryEntry,
): Promise<WeatherForecastKab | null> {
  if (!entry.adm4) return null;

  const res = await fetch(
    `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${entry.adm4}`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as BmkgResponse;
  const days = data.data?.[0]?.cuaca;
  if (!days || days.length === 0) return null;

  const allSlots: BmkgCuacaSlot[] = [];
  for (const day of days) {
    if (Array.isArray(day)) {
      for (const slot of day) {
        if (slot && typeof slot === "object") allSlots.push(slot);
      }
    }
  }
  if (allSlots.length === 0) return null;

  const now = Date.now();
  let currentSlot = allSlots[0];
  let closestDiff = Infinity;
  for (const slot of allSlots) {
    if (!slot.local_datetime) continue;
    const t = new Date(slot.local_datetime.replace(" ", "T")).getTime();
    const diff = Math.abs(t - now);
    if (diff < closestDiff) {
      closestDiff = diff;
      currentSlot = slot;
    }
  }

  const fetchedAt = new Date().toISOString();
  const current: WeatherCurrent = {
    temperature_c: currentSlot.t ?? 0,
    humidity_pct: currentSlot.hu ?? 0,
    weather_code: currentSlot.weather ?? 0,
    weather_desc_id: currentSlot.weather_desc ?? "Tidak diketahui",
    weather_desc_en: currentSlot.weather_desc_en ?? "Unknown",
    wind_speed_kmh: currentSlot.ws ?? 0,
    wind_direction_deg: currentSlot.wd_deg ?? 0,
    precipitation_mm: currentSlot.tp ?? 0,
    image_url: currentSlot.image,
  };

  const hourly: WeatherHourly[] = allSlots.slice(0, 24).map((slot) => ({
    datetime_local: slot.local_datetime ?? "",
    temperature_c: slot.t ?? 0,
    precipitation_mm: slot.tp ?? 0,
    weather_code: slot.weather ?? 0,
    weather_desc_id: slot.weather_desc ?? "Tidak diketahui",
    weather_desc_en: slot.weather_desc_en ?? "Unknown",
  }));

  const daily: WeatherDaily[] = days.slice(0, 3).map((daySlots, dayIndex) => {
    const slots = Array.isArray(daySlots) ? daySlots : [];
    const temps = slots.map((s) => s.t ?? 0).filter((t) => t > 0);
    const precip = slots.reduce((sum, s) => sum + (s.tp ?? 0), 0);
    const mid = slots[Math.floor(slots.length / 2)] ?? slots[0];
    const date =
      slots[0]?.local_datetime?.split(" ")[0] ??
      new Date(Date.now() + dayIndex * 86400000).toISOString().slice(0, 10);
    return {
      date,
      temp_min_c: temps.length ? Math.min(...temps) : 0,
      temp_max_c: temps.length ? Math.max(...temps) : 0,
      precipitation_mm: precip,
      weather_code: mid?.weather ?? 0,
      weather_desc_id: mid?.weather_desc ?? "Tidak diketahui",
      weather_desc_en: mid?.weather_desc_en ?? "Unknown",
    };
  });

  return {
    slug: entry.slug,
    kabupaten_kota: entry.kabupaten_kota,
    kabupaten_kota_kode: entry.kabupaten_kota_kode,
    latitude: data.lokasi?.lat ?? entry.latitude,
    longitude: data.lokasi?.lon ?? entry.longitude,
    adm2: entry.adm2,
    adm4: entry.adm4,
    is_kota: entry.is_kota,
    current,
    hourly,
    daily,
    source: "bmkg",
    fetched_at: fetchedAt,
    analysis_date: currentSlot.analysis_date,
  };
}
