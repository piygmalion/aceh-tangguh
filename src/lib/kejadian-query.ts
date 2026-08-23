import type {
  KejadianFacets,
  KejadianFixture,
  KejadianListResult,
  KejadianQuery,
  KejadianRow,
} from "./kejadian-types";
import { isRekapitulasiTahunan } from "./disaster-jenis";
import { normalizeStatus, orderedPresentKeys } from "./status-vocab";

const MONTHS_ID: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

export function parseHariTanggal(raw: string | undefined | null): {
  start: Date | null;
  end: Date | null;
  sortable: number | null;
} {
  if (!raw || !raw.trim()) {
    return { start: null, end: null, sortable: null };
  }
  const s = raw.trim();

  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (!Number.isNaN(dt.getTime())) {
      return { start: dt, end: dt, sortable: dt.getTime() };
    }
  }

  const rangeMatch = s.match(
    /^([A-Za-zÀ-ÿ]+)\s*-\s*([A-Za-zÀ-ÿ]+)\s+(\d{4})$/i
  );
  if (rangeMatch) {
    const m1 = MONTHS_ID[rangeMatch[1].toLowerCase()];
    const m2 = MONTHS_ID[rangeMatch[2].toLowerCase()];
    const y = Number(rangeMatch[3]);
    if (m1 && m2 && y) {
      const start = new Date(Date.UTC(y, m1 - 1, 1));
      const end = new Date(Date.UTC(y, m2, 0));
      return { start, end, sortable: end.getTime() };
    }
  }

  const monthYear = s.match(/^([A-Za-zÀ-ÿ]+)\s+(\d{4})$/i);
  if (monthYear) {
    const m = MONTHS_ID[monthYear[1].toLowerCase()];
    const y = Number(monthYear[2]);
    if (m && y) {
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m, 0));
      return { start, end, sortable: end.getTime() };
    }
  }

  const yearOnly = s.match(/\b(20\d{2})\b/);
  if (yearOnly) {
    const y = Number(yearOnly[1]);
    const start = new Date(Date.UTC(y, 0, 1));
    const end = new Date(Date.UTC(y, 11, 31));
    return { start, end, sortable: end.getTime() };
  }

  return { start: null, end: null, sortable: null };
}

function parseIsoDay(value: string | undefined): Date | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function rowMatchesDate(
  row: KejadianRow,
  from: Date | null,
  to: Date | null
): boolean {
  if (!from && !to) return true;
  const parsed = parseHariTanggal(row.hari_tanggal);
  if (!parsed.start && !parsed.end) {
    return true;
  }
  const rowStart = parsed.start ?? parsed.end!;
  const rowEnd = parsed.end ?? parsed.start!;
  if (from && rowEnd < from) return false;
  if (to && rowStart > to) return false;
  return true;
}

function norm(s: string | undefined | null): string {
  return (s ?? "").trim().toLowerCase();
}

function rowSearchBlob(row: KejadianRow): string {
  const parts = [
    row.id,
    row.jenis_bencana,
    row.hari_tanggal,
    row.jam,
    row.penyebab,
    row.kronologi,
    row.lokasi?.teks_lengkap,
    row.lokasi?.kabupaten,
    row.lokasi?.kecamatan,
    row.lokasi?.desa,
    row.penanganan?.langkah,
    row.penanganan?.status_proses,
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function uniqueSorted(values: Iterable<string>): string[] {
  const filtered = Array.from(values).filter((v) => v && v !== "-");
  return Array.from(new Set(filtered)).sort((a, b) => a.localeCompare(b, "id"));
}

export function buildFacets(rows: KejadianRow[]): KejadianFacets {
  const byKab = new Map<string, Set<string>>();
  for (const r of rows) {
    const kab = (r.lokasi?.kabupaten || r.lokasi?.kabupaten_kota || "").trim();
    const kec = (r.lokasi?.kecamatan || "").trim();
    if (!kab || !kec || kec === "-") continue;
    if (!byKab.has(kab)) byKab.set(kab, new Set());
    byKab.get(kab)!.add(kec);
  }
  const kecamatanByKabupaten: Record<string, string[]> = {};
  byKab.forEach((set, kab) => {
    kecamatanByKabupaten[kab] = Array.from(set).sort((a, b) =>
      a.localeCompare(b, "id")
    );
  });
  return {
    jenis: uniqueSorted(rows.map((r) => r.jenis_bencana)),
    kabupaten: uniqueSorted(
      rows.map((r) => r.lokasi?.kabupaten || r.lokasi?.kabupaten_kota || "")
    ),
    kecamatan: uniqueSorted(rows.map((r) => r.lokasi?.kecamatan || "")),
    kecamatanByKabupaten,
    status: orderedPresentKeys(
      "disaster",
      rows.map((r) => normalizeStatus(r.penanganan?.status_proses, "disasterEvents").key)
    ),
  };
}

function sortKey(row: KejadianRow): number {
  const parsed = parseHariTanggal(row.hari_tanggal);
  if (parsed.sortable != null) return parsed.sortable;
  const idYear = row.id.match(/(\d{4})/);
  if (idYear) return Date.UTC(Number(idYear[1]), 0, 1);
  return 0;
}

export function filterAndPaginateKejadian(
  data: KejadianFixture,
  query: KejadianQuery,
  source?: "supabase" | "fixture"
): KejadianListResult {
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
  const page = Math.max(1, query.page ?? 1);
  const from = parseIsoDay(query.from);
  const to = parseIsoDay(query.to);
  const toEnd = to
    ? new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 23, 59, 59, 999))
    : null;

  const q = norm(query.q);
  const jenis = norm(query.jenis);
  const kabupaten = norm(query.kabupaten);
  const kecamatan = norm(query.kecamatan);
  const statusKey = query.status
    ? normalizeStatus(query.status, "disasterEvents").key
    : "";

  let filtered = data.kejadian.filter((row) => {
    if (isRekapitulasiTahunan(row.jenis_bencana)) return false;
    if (jenis && norm(row.jenis_bencana) !== jenis) return false;
    const kab = norm(row.lokasi?.kabupaten || row.lokasi?.kabupaten_kota);
    if (kabupaten && kab !== kabupaten) return false;
    if (kecamatan && norm(row.lokasi?.kecamatan) !== kecamatan) return false;
    if (statusKey) {
      const rowStatus = normalizeStatus(
        row.penanganan?.status_proses,
        "disasterEvents"
      ).key;
      if (rowStatus !== statusKey) return false;
    }
    if (!rowMatchesDate(row, from, toEnd)) return false;
    if (q && !rowSearchBlob(row).includes(q)) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    const diff = sortKey(b) - sortKey(a);
    if (diff !== 0) return diff;
    return b.id.localeCompare(a.id);
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    facets: buildFacets(data.kejadian),
    meta: data.metadata ?? {},
    ...(source ? { source } : {}),
  };
}

export function findKejadianById(
  data: KejadianFixture,
  id: string
): KejadianRow | undefined {
  return data.kejadian.find((r) => r.id === id);
}
