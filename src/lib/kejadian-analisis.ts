import { DISASTER_JENIS } from "./disaster-jenis";
import { buildFacets, filterKejadianRows, parseHariTanggal } from "./kejadian-query";
import type {
  KejadianFacets,
  KejadianFixture,
  KejadianQuery,
  KejadianRow,
} from "./kejadian-types";

export type RumahRusakCounts = {
  rr: number;
  rs: number;
  rb: number;
};

export type KorbanCounts = {
  lukaRingan: number;
  lukaBerat: number;
  meninggal: number;
  hilang: number;
};

export type KejadianImpact = RumahRusakCounts & KorbanCounts;

export type JenisCount = {
  jenis: string;
  count: number;
};

export type MonthlyPoint = {
  month: number;
  count: number;
};

const MS_PER_DAY = 86_400_000;
const YEAR_SPAN_DAYS = 300;

function asCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "-") return 0;
    const n = Number(trimmed.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readRumahRusak(row: KejadianRow): RumahRusakCounts {
  const block = asRecord(row.kerusakan_dan_korban);
  if (!block) return { rr: 0, rs: 0, rb: 0 };
  const rumah = asRecord(block.rumah);
  if (rumah) {
    return {
      rr: asCount(rumah.rusak_ringan),
      rs: asCount(rumah.rusak_sedang),
      rb: asCount(rumah.rusak_berat),
    };
  }
  return {
    rr: asCount(block.rumah_rusak_ringan ?? block.rr ?? block.RR),
    rs: asCount(block.rumah_rusak_sedang ?? block.rs ?? block.RS),
    rb: asCount(block.rumah_rusak_berat ?? block.rb ?? block.RB),
  };
}

export function readKorban(row: KejadianRow): KorbanCounts {
  const korban = row.jumlah_korban;
  return {
    lukaRingan: asCount(korban?.luka_ringan),
    lukaBerat: asCount(korban?.luka_berat),
    meninggal: asCount(korban?.meninggal),
    hilang: asCount(korban?.hilang),
  };
}

export function readImpact(row: KejadianRow): KejadianImpact {
  return { ...readRumahRusak(row), ...readKorban(row) };
}

export function aggregateImpact(rows: KejadianRow[]): KejadianImpact {
  const total: KejadianImpact = {
    rr: 0,
    rs: 0,
    rb: 0,
    lukaRingan: 0,
    lukaBerat: 0,
    meninggal: 0,
    hilang: 0,
  };
  for (const row of rows) {
    const impact = readImpact(row);
    total.rr += impact.rr;
    total.rs += impact.rs;
    total.rb += impact.rb;
    total.lukaRingan += impact.lukaRingan;
    total.lukaBerat += impact.lukaBerat;
    total.meninggal += impact.meninggal;
    total.hilang += impact.hilang;
  }
  return total;
}

export function countByJenis(rows: KejadianRow[]): JenisCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const jenis = (row.jenis_bencana || "").trim();
    if (!jenis) continue;
    counts.set(jenis, (counts.get(jenis) ?? 0) + 1);
  }

  const catalogIndex = new Map<string, number>(
    DISASTER_JENIS.map((jenis, i) => [jenis, i])
  );

  return Array.from(counts.entries())
    .map(([jenis, count]) => ({ jenis, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const ia = catalogIndex.get(a.jenis) ?? Number.MAX_SAFE_INTEGER;
      const ib = catalogIndex.get(b.jenis) ?? Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return a.jenis.localeCompare(b.jenis, "id");
    });
}

function parseIsoYear(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})-/);
  if (!m) return null;
  const year = Number(m[1]);
  return year >= 1900 && year <= 2100 ? year : null;
}

export function resolveTrendYear(
  rows: KejadianRow[],
  from?: string,
  to?: string,
  fallbackYear = new Date().getUTCFullYear()
): number {
  const toYear = parseIsoYear(to);
  if (toYear) return toYear;
  const fromYear = parseIsoYear(from);
  if (fromYear) return fromYear;

  const byYear = new Map<number, number>();
  for (const row of rows) {
    const parsed = parseHariTanggal(row.hari_tanggal);
    const year = (parsed.start ?? parsed.end)?.getUTCFullYear();
    if (!year) continue;
    byYear.set(year, (byYear.get(year) ?? 0) + 1);
  }

  let bestYear = fallbackYear;
  let bestCount = -1;
  byYear.forEach((count, year) => {
    if (count > bestCount || (count === bestCount && year > bestYear)) {
      bestYear = year;
      bestCount = count;
    }
  });
  return bestYear;
}

function eventMonthForYear(row: KejadianRow, year: number): number | null {
  const parsed = parseHariTanggal(row.hari_tanggal);
  const start = parsed.start;
  if (!start) return null;
  if (start.getUTCFullYear() !== year) return null;

  const end = parsed.end;
  if (end) {
    const spanDays = (end.getTime() - start.getTime()) / MS_PER_DAY;
    const fullYear =
      spanDays >= YEAR_SPAN_DAYS &&
      start.getUTCMonth() === 0 &&
      end.getUTCMonth() === 11;
    if (fullYear) return null;
  }

  return start.getUTCMonth();
}

export function monthlyTrend(rows: KejadianRow[], year: number): MonthlyPoint[] {
  const counts = Array.from({ length: 12 }, () => 0);
  for (const row of rows) {
    const month = eventMonthForYear(row, year);
    if (month == null) continue;
    counts[month] += 1;
  }
  return counts.map((count, month) => ({ month, count }));
}

export function rowsForJenis(rows: KejadianRow[], jenis: string): KejadianRow[] {
  const wanted = jenis.trim().toLowerCase();
  if (!wanted) return rows;
  return rows.filter((row) => (row.jenis_bencana || "").trim().toLowerCase() === wanted);
}

export const ANALISIS_SAMPLE_LIMIT = 10;

export type AnalisisMetric = "kejadian" | "rumah" | "korban";

export type KabupatenCount = {
  kabupaten: string;
  count: number;
  value: number;
};

export type YearPoint = {
  year: number;
  count: number;
  value: number;
};

export type MonthPoint = {
  year: number;
  month: number;
  count: number;
  value: number;
};

export type JenisValue = JenisCount & { value: number };

export type KejadianAnalisisSample = {
  id: string;
  jenis: string;
  hari_tanggal: string;
  kabupaten: string;
};

export type KejadianAnalisisQuery = KejadianQuery & {
  metric?: AnalisisMetric;
};

export type KejadianAnalisisPayload = {
  source: "supabase" | "fixture";
  total: number;
  range: { from?: string; to?: string };
  metric: AnalisisMetric;
  byJenis: JenisValue[];
  byKabupaten: KabupatenCount[];
  byMonth: MonthPoint[];
  byYear: YearPoint[];
  impact: KejadianImpact;
  facets: KejadianFacets;
  sample: KejadianAnalisisSample[];
};

export function parseAnalisisMetric(raw: string | null | undefined): AnalisisMetric {
  if (raw === "rumah" || raw === "korban") return raw;
  return "kejadian";
}

export function metricValue(row: KejadianRow, metric: AnalisisMetric): number {
  if (metric === "rumah") {
    const rumah = readRumahRusak(row);
    return rumah.rr + rumah.rs + rumah.rb;
  }
  if (metric === "korban") {
    const korban = readKorban(row);
    return korban.lukaRingan + korban.lukaBerat + korban.meninggal + korban.hilang;
  }
  return 1;
}

function kabLabel(row: KejadianRow): string {
  return (row.lokasi?.kabupaten || row.lokasi?.kabupaten_kota || "").trim();
}

export function countByKabupaten(
  rows: KejadianRow[],
  metric: AnalisisMetric = "kejadian"
): KabupatenCount[] {
  const map = new Map<string, { count: number; value: number }>();
  for (const row of rows) {
    const kabupaten = kabLabel(row);
    if (!kabupaten) continue;
    const cur = map.get(kabupaten) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += metricValue(row, metric);
    map.set(kabupaten, cur);
  }
  return Array.from(map.entries())
    .map(([kabupaten, stats]) => ({ kabupaten, ...stats }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.kabupaten.localeCompare(b.kabupaten, "id");
    });
}

export function yearlyTrend(
  rows: KejadianRow[],
  metric: AnalisisMetric = "kejadian"
): YearPoint[] {
  const byYear = new Map<number, { count: number; value: number }>();
  for (const row of rows) {
    const parsed = parseHariTanggal(row.hari_tanggal);
    const year = (parsed.start ?? parsed.end)?.getUTCFullYear();
    if (!year) continue;
    const cur = byYear.get(year) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += metricValue(row, metric);
    byYear.set(year, cur);
  }
  return Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, stats]) => ({ year, ...stats }));
}

function yearOfIso(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})-/);
  if (!m) return null;
  const year = Number(m[1]);
  return year >= 1900 && year <= 2100 ? year : null;
}

export function monthlySeries(
  rows: KejadianRow[],
  metric: AnalisisMetric,
  from?: string,
  to?: string
): MonthPoint[] {
  const years = yearlyTrend(rows, metric).map((point) => point.year);
  const startYear = yearOfIso(from) ?? years[0];
  const endYear = yearOfIso(to) ?? years[years.length - 1];
  if (startYear == null || endYear == null) return [];

  const bucket = new Map<string, { count: number; value: number }>();
  for (const row of rows) {
    const start = parseHariTanggal(row.hari_tanggal).start;
    if (!start) continue;
    const year = start.getUTCFullYear();
    const month = start.getUTCMonth();
    if (year < startYear || year > endYear) continue;
    const key = `${year}-${month}`;
    const cur = bucket.get(key) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += metricValue(row, metric);
    bucket.set(key, cur);
  }

  const points: MonthPoint[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      const stats = bucket.get(`${year}-${month}`) ?? { count: 0, value: 0 };
      points.push({ year, month, ...stats });
    }
  }
  return points;
}

function sampleRows(rows: KejadianRow[]): KejadianAnalisisSample[] {
  return rows.slice(0, ANALISIS_SAMPLE_LIMIT).map((item) => ({
    id: item.id,
    jenis: item.jenis_bencana,
    hari_tanggal: item.hari_tanggal,
    kabupaten: kabLabel(item),
  }));
}

export function buildKejadianAnalisis(
  data: KejadianFixture,
  query: KejadianAnalisisQuery,
  source: "supabase" | "fixture"
): KejadianAnalisisPayload {
  const metric = query.metric ?? "kejadian";
  const filtered = filterKejadianRows(data.kejadian, query);
  const byJenis = countByJenis(filtered).map((row) => ({
    ...row,
    value: rowsForJenis(filtered, row.jenis).reduce(
      (sum, item) => sum + metricValue(item, metric),
      0
    ),
  }));

  return {
    source,
    total: filtered.length,
    range: {
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
    },
    metric,
    byJenis,
    byKabupaten: countByKabupaten(filtered, metric),
    byMonth: monthlySeries(filtered, metric, query.from, query.to),
    byYear: yearlyTrend(filtered, metric),
    impact: aggregateImpact(filtered),
    facets: buildFacets(data.kejadian),
    sample: sampleRows(filtered),
  };
}
