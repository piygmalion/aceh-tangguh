import {
  EMPTY_DIBI_METRICS,
  type DibiAcehPayload,
  type DibiMetrics,
  type DibiTahunRow,
} from "./dibi-types";

const METRIC_KEYS = [
  "kejadian",
  "meninggal",
  "hilang",
  "luka_sakit",
  "menderita_mengungsi",
  "rumah_rusak_berat",
  "rumah_rusak_sedang",
  "rumah_rusak_ringan",
  "rumah_terendam",
  "estimasi_kerugian_rumah",
] as const satisfies readonly (keyof DibiMetrics)[];

export type DibiBerandaFilter = {
  yearFrom?: number | null;
  yearTo?: number | null;
  kabupaten?: string | null;
  jenis?: string | null;
};

export type DibiCounterScope = "year-range" | "kabupaten" | "jenis" | "unavailable";

export type DibiBerandaView = {
  years: number[];
  yearFrom: number | null;
  yearTo: number | null;
  kabupatenOptions: string[];
  jenisOptions: string[];
  trend: DibiTahunRow[];
  /** Year series is province-wide. A kabupaten pick does not slice it. */
  trendIgnoresKabupaten: boolean;
  /** Year series is all hazard types. A jenis pick does not slice it. */
  trendIgnoresJenis: boolean;
  counters: {
    scope: DibiCounterScope;
    metrics: DibiMetrics | null;
    respectsYearFilter: boolean;
  };
  kabChart: {
    rows: { kabupaten: string; kejadian: number }[];
    stackedByJenis: false;
    respectsYearFilter: false;
    respectsJenisFilter: false;
  };
  kejadianTerbaru: [];
  incidentLevelAvailable: false;
  /** Kabupaten × jenis matrix is not in the DIBI Aceh extract. */
  crossTabAvailable: false;
};

function cleanName(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function copyMetrics(row: DibiMetrics): DibiMetrics {
  const out: DibiMetrics = { ...EMPTY_DIBI_METRICS };
  for (const key of METRIC_KEYS) {
    const n = row[key];
    out[key] = typeof n === "number" && Number.isFinite(n) ? n : 0;
  }
  return out;
}

function sumMetrics(rows: readonly DibiMetrics[]): DibiMetrics {
  const out: DibiMetrics = { ...EMPTY_DIBI_METRICS };
  for (const row of rows) {
    const metrics = copyMetrics(row);
    for (const key of METRIC_KEYS) out[key] += metrics[key];
  }
  return out;
}

/**
 * Slice the existing DIBI Aceh extract for the homepage filters.
 * Year rows can be summed. Kabupaten and jenis rows cannot be crossed
 * with each other or with a year window: those slices are published separately.
 */
export function aggregateDibiBeranda(
  payload: DibiAcehPayload,
  filter: DibiBerandaFilter = {},
): DibiBerandaView {
  const years = payload.by_tahun
    .map((row) => row.tahun)
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b);
  const minYear = years[0] ?? null;
  const maxYear = years[years.length - 1] ?? null;

  let yearFrom = filter.yearFrom ?? minYear;
  let yearTo = filter.yearTo ?? maxYear;
  if (yearFrom != null && yearTo != null && yearFrom > yearTo) {
    const swap = yearFrom;
    yearFrom = yearTo;
    yearTo = swap;
  }

  const trend = payload.by_tahun
    .filter((row) => {
      if (!Number.isFinite(row.tahun)) return false;
      if (yearFrom != null && row.tahun < yearFrom) return false;
      if (yearTo != null && row.tahun > yearTo) return false;
      return true;
    })
    .map((row) => ({ ...row, ...copyMetrics(row) }))
    .sort((a, b) => a.tahun - b.tahun);

  const kabupaten = cleanName(filter.kabupaten);
  const jenis = cleanName(filter.jenis);
  const kabRow = kabupaten
    ? payload.by_kabupaten.find((row) => row.kabupaten === kabupaten)
    : undefined;
  const jenisRow = jenis
    ? payload.by_kategori.find((row) => row.kategori_bencana === jenis)
    : undefined;

  let counters: DibiBerandaView["counters"];
  if (kabupaten && jenis) {
    counters = { scope: "unavailable", metrics: null, respectsYearFilter: false };
  } else if (kabupaten) {
    counters = kabRow
      ? { scope: "kabupaten", metrics: copyMetrics(kabRow), respectsYearFilter: false }
      : { scope: "unavailable", metrics: null, respectsYearFilter: false };
  } else if (jenis) {
    counters = jenisRow
      ? { scope: "jenis", metrics: copyMetrics(jenisRow), respectsYearFilter: false }
      : { scope: "unavailable", metrics: null, respectsYearFilter: false };
  } else {
    counters = {
      scope: "year-range",
      metrics: sumMetrics(trend),
      respectsYearFilter: true,
    };
  }

  return {
    years,
    yearFrom,
    yearTo,
    kabupatenOptions: payload.by_kabupaten.map((row) => row.kabupaten),
    jenisOptions: payload.by_kategori.map((row) => row.kategori_bencana),
    trend,
    trendIgnoresKabupaten: Boolean(kabupaten),
    trendIgnoresJenis: Boolean(jenis),
    counters,
    kabChart: {
      rows: payload.by_kabupaten.map((row) => ({
        kabupaten: row.kabupaten,
        kejadian: copyMetrics(row).kejadian,
      })),
      stackedByJenis: false,
      respectsYearFilter: false,
      respectsJenisFilter: false,
    },
    kejadianTerbaru: [],
    incidentLevelAvailable: false,
    crossTabAvailable: false,
  };
}

/**
 * A year string from the homepage selects. Empty or unknown years are ignored
 * so a blank change cannot collapse the default span onto year 0.
 */
export function yearPick(raw: string, years: readonly number[]): number | null {
  const next = Number(raw);
  if (!Number.isFinite(next) || !years.includes(next)) return null;
  return next;
}

/**
 * Counters for the number band. An empty year window has no rows to sum, so
 * the band shows the missing state instead of a sourced zero.
 */
export function displayedBandMetrics(view: DibiBerandaView): DibiMetrics | null {
  const metrics = view.counters.metrics;
  if (!metrics) return null;
  if (view.counters.scope === "year-range" && view.trend.length === 0) return null;
  return metrics;
}

/** Hero bar that is red. The count is read from the row, never a constant. */
export const HERO_BAR_HIGHLIGHT_YEAR = 2020;

/** Open year. Hatched on the hero bar and on every sparkline. */
export const BERJALAN_YEAR = 2026;

/** Impact series whose peak, when it falls on this year, is marked. Not red. */
export const IMPACT_PEAK_YEAR = 2025;

export const SPARKLINE_KEYS = [
  "kejadian",
  "meninggal",
  "luka_sakit",
  "menderita_mengungsi",
  "estimasi_kerugian_rumah",
] as const;

export type SparklineKey = (typeof SPARKLINE_KEYS)[number];

export type MetricPoint = { tahun: number; value: number };

export function seriesPerMetric(
  trend: readonly DibiTahunRow[],
  key: keyof DibiMetrics,
): MetricPoint[] {
  return trend.map((row) => ({
    tahun: row.tahun,
    value: typeof row[key] === "number" && Number.isFinite(row[key]) ? row[key] : 0,
  }));
}

/** Highest value in one metric. Ties keep the earlier year. */
export function peakPoint(series: readonly MetricPoint[]): MetricPoint | null {
  if (series.length === 0) return null;
  return series.reduce((best, point) => (point.value > best.value ? point : best));
}

/**
 * Sparklines share the year-range totals. A kabupaten or jenis total has no
 * year series in this extract, so the band must not draw a province spark next to it.
 */
export function bandShowsSparklines(view: DibiBerandaView): boolean {
  return view.counters.scope === "year-range" && view.trend.length > 0;
}
