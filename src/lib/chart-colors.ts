/**
 * Chart + choropleth fills from Sistem Warna tokens.
 * HEX lives in globals.css. Do not introduce a rainbow palette here.
 */

export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export function chartSeries(index: number): string {
  return CHART_SERIES[((index % CHART_SERIES.length) + CHART_SERIES.length) % CHART_SERIES.length];
}

/** Forest scale 200 / 400 / 700 — light / mid / deep. Not lime. */
export const FOREST_SCALE = {
  200: "#C5D2B8",
  400: "#4F7336",
  700: "#1F4C15",
} as const;

export const STATUS_FILL = {
  aman: "var(--status-aman)",
  waspada: "var(--status-waspada)",
  siaga: "var(--status-siaga)",
  awas: "var(--status-awas)",
} as const;

/** Resolved HEX for MapLibre / legends (CSS vars do not interpolate in expressions). */
export const STATUS_HEX = {
  RENDAH: "#1F4C15",
  SEDANG: "#C4A35A",
  TINGGI: "#FF7722",
  AWAS: "#B42318",
} as const;

export const KELAS_FILL: Record<string, string> = {
  RENDAH: "var(--status-aman)",
  SEDANG: "var(--status-waspada)",
  TINGGI: "var(--status-siaga)",
  AWAS: "var(--status-awas)",
};

export function kelasFill(kelas: string | undefined | null): string {
  if (!kelas) return "var(--text)";
  return KELAS_FILL[kelas.toUpperCase()] ?? "var(--text)";
}

/** MapLibre needs resolved HEX (CSS vars do not interpolate in expressions). */
export const JENIS_HEX = {
  water: "#2F6B66",
  fire: "#FF7722",
  fireDeep: "#C7460C",
  quake: "#C7460C",
  drought: "#C4A35A",
  slide: "#1F4C15",
  slideSoft: "#8A9A5B",
  wind: "#8A9A5B",
  other: "#52524B",
} as const;
