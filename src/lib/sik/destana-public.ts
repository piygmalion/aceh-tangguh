import type { TypedSupabaseClient } from "@/lib/supabase/server";

export const DESTANA_PUBLIC_PAGE_SIZE_DEFAULT = 200;
export const DESTANA_PUBLIC_PAGE_SIZE_MAX = 200;
export const DESTANA_UNAVAILABLE_ID = "Penilaian Destana belum tersedia";
export const DESTANA_UNAVAILABLE_EN = "Destana assessment is not available yet";

const TEXT_MAX = 80;
const ITEM_COLUMNS =
  "id, nama, kabupaten, kecamatan, kode_desa_kelurahan, destana_level, destana_indeks, destana_tahun";

export type DestanaLevelCounts = {
  belum: number;
  pratama: number;
  madya: number;
  utama: number;
  lain?: number;
};

export type DestanaPublicItem = {
  id: string;
  nama: string;
  kabupaten: string | null;
  kecamatan: string | null;
  kode_desa_kelurahan: string | null;
  destana_level: string | null;
  destana_indeks: number | null;
  destana_tahun: number | null;
};

export type DestanaPublicPayload = {
  items: DestanaPublicItem[];
  counts: DestanaLevelCounts;
  total: number;
  listTotal: number;
  assessed: boolean;
  partial: boolean;
  page: number;
  pageSize: number;
};

export type DestanaPublicQuery = {
  kabupaten: string;
  q: string;
  page: number;
  pageSize: number;
};

type LevelFilter = "all" | "null" | "pratama" | "madya" | "utama";

export function sumDestanaLevelCounts(counts: DestanaLevelCounts): number {
  return counts.belum + counts.pratama + counts.madya + counts.utama + (counts.lain ?? 0);
}

export function isDestanaAssessed(payload: {
  assessed?: boolean;
  counts?: { pratama?: number; madya?: number; utama?: number; lain?: number } | null;
}): boolean {
  if (payload.assessed === false) return false;
  if (payload.assessed === true) return true;
  const counts = payload.counts;
  if (!counts) return false;
  return (counts.pratama ?? 0) + (counts.madya ?? 0) + (counts.utama ?? 0) + (counts.lain ?? 0) > 0;
}

export function emptyDestanaPublicPayload(): DestanaPublicPayload {
  return {
    items: [],
    counts: { belum: 0, pratama: 0, madya: 0, utama: 0 },
    total: 0,
    listTotal: 0,
    assessed: false,
    partial: false,
    page: 1,
    pageSize: DESTANA_PUBLIC_PAGE_SIZE_DEFAULT,
  };
}

export function destanaPublicFixture(): DestanaPublicPayload & { source: "fixture" } {
  return { ...emptyDestanaPublicPayload(), source: "fixture" };
}

export function destanaPublicApiPath(input: {
  kabupaten?: string;
  q?: string;
  page?: number;
}): string {
  const params = new URLSearchParams({ kind: "destana" });
  const kabupaten = input.kabupaten?.trim();
  const q = input.q?.trim();
  if (kabupaten) params.set("kabupaten", kabupaten);
  if (q) params.set("q", q);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  return `/api/sik/public?${params.toString()}`;
}

export function parseDestanaPublicQuery(params: URLSearchParams): DestanaPublicQuery {
  const requested = positiveInt(params.get("pageSize"), DESTANA_PUBLIC_PAGE_SIZE_DEFAULT);
  return {
    kabupaten: clampText(params.get("kabupaten")),
    q: clampText(params.get("q") ?? params.get("nama")),
    page: positiveInt(params.get("page"), 1),
    pageSize: Math.min(DESTANA_PUBLIC_PAGE_SIZE_MAX, requested),
  };
}

export function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

export async function loadDestanaPublic(
  client: TypedSupabaseClient,
  query: DestanaPublicQuery,
): Promise<DestanaPublicPayload> {
  const [total, belum, pratama, madya, utama, listTotal, items] = await Promise.all([
    exactCount(client, query.kabupaten, "all"),
    exactCount(client, query.kabupaten, "null"),
    exactCount(client, query.kabupaten, "pratama"),
    exactCount(client, query.kabupaten, "madya"),
    exactCount(client, query.kabupaten, "utama"),
    query.q ? exactListCount(client, query.kabupaten, query.q) : Promise.resolve(-1),
    listItems(client, query),
  ]);

  const known = belum + pratama + madya + utama;
  const lain = total - known;
  const counts: DestanaLevelCounts = {
    belum,
    pratama,
    madya,
    utama,
    ...(lain > 0 ? { lain } : {}),
  };
  const resolvedListTotal = listTotal < 0 ? total : listTotal;
  return {
    items,
    counts,
    total,
    listTotal: resolvedListTotal,
    assessed: total - belum > 0,
    partial: items.length < resolvedListTotal,
    page: query.page,
    pageSize: query.pageSize,
  };
}

async function exactCount(
  client: TypedSupabaseClient,
  kabupaten: string,
  level: LevelFilter,
): Promise<number> {
  let request = client.from("profil_desa").select("id", { count: "exact", head: true });
  if (kabupaten) request = request.eq("kabupaten", kabupaten);
  if (level === "null") request = request.is("destana_level", null);
  else if (level !== "all") request = request.eq("destana_level", level);
  const { count, error } = await request;
  if (error || count == null) {
    throw new Error(error?.message ?? "destana_count_missing");
  }
  return count;
}

async function exactListCount(
  client: TypedSupabaseClient,
  kabupaten: string,
  q: string,
): Promise<number> {
  let request = client.from("profil_desa").select("id", { count: "exact", head: true });
  if (kabupaten) request = request.eq("kabupaten", kabupaten);
  request = request.ilike("nama", `%${escapeIlike(q)}%`);
  const { count, error } = await request;
  if (error || count == null) {
    throw new Error(error?.message ?? "destana_count_missing");
  }
  return count;
}

async function listItems(
  client: TypedSupabaseClient,
  query: DestanaPublicQuery,
): Promise<DestanaPublicItem[]> {
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  let request = client.from("profil_desa").select(ITEM_COLUMNS).order("nama", { ascending: true });
  if (query.kabupaten) request = request.eq("kabupaten", query.kabupaten);
  if (query.q) request = request.ilike("nama", `%${escapeIlike(query.q)}%`);
  const { data, error } = await request.range(from, to);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    nama: row.nama,
    kabupaten: row.kabupaten,
    kecamatan: row.kecamatan,
    kode_desa_kelurahan: row.kode_desa_kelurahan,
    destana_level: row.destana_level,
    destana_indeks: row.destana_indeks,
    destana_tahun: row.destana_tahun,
  }));
}

function positiveInt(raw: string | null, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

function clampText(raw: string | null): string {
  return (raw ?? "").trim().slice(0, TEXT_MAX);
}
