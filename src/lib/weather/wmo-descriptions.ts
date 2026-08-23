/** WMO weather interpretation codes (WW) used by Open-Meteo. */
const WMO_MAP: Record<number, { id: string; en: string }> = {
  0: { id: "Cerah", en: "Clear" },
  1: { id: "Cerah", en: "Mainly clear" },
  2: { id: "Cerah Berawan", en: "Partly cloudy" },
  3: { id: "Berawan", en: "Overcast" },
  45: { id: "Kabut", en: "Fog" },
  48: { id: "Kabut", en: "Depositing rime fog" },
  51: { id: "Hujan Ringan", en: "Light drizzle" },
  53: { id: "Hujan Ringan", en: "Moderate drizzle" },
  55: { id: "Hujan Sedang", en: "Dense drizzle" },
  56: { id: "Hujan Ringan", en: "Light freezing drizzle" },
  57: { id: "Hujan Sedang", en: "Dense freezing drizzle" },
  61: { id: "Hujan Ringan", en: "Slight rain" },
  63: { id: "Hujan Sedang", en: "Moderate rain" },
  65: { id: "Hujan Lebat", en: "Heavy rain" },
  66: { id: "Hujan Ringan", en: "Light freezing rain" },
  67: { id: "Hujan Sedang", en: "Heavy freezing rain" },
  71: { id: "Hujan Ringan", en: "Slight snow" },
  73: { id: "Hujan Sedang", en: "Moderate snow" },
  75: { id: "Hujan Lebat", en: "Heavy snow" },
  77: { id: "Hujan Ringan", en: "Snow grains" },
  80: { id: "Hujan Ringan", en: "Slight rain showers" },
  81: { id: "Hujan Sedang", en: "Moderate rain showers" },
  82: { id: "Hujan Lebat", en: "Violent rain showers" },
  85: { id: "Hujan Ringan", en: "Slight snow showers" },
  86: { id: "Hujan Lebat", en: "Heavy snow showers" },
  95: { id: "Petir", en: "Thunderstorm" },
  96: { id: "Petir", en: "Thunderstorm with slight hail" },
  99: { id: "Petir", en: "Thunderstorm with heavy hail" },
};

export function wmoDescription(code: number): { id: string; en: string } {
  return WMO_MAP[code] ?? { id: "Tidak diketahui", en: "Unknown" };
}
