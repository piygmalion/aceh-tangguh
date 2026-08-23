import type { Json, ProfilDesaRow } from "@/lib/supabase/types";

export type NullableCount = number | null;

export type ImpactBadge = "terdampak" | "tidak_terdampak" | "tidak_diketahui";

export type VillageClickSelection = {
  name: string;
  kabupaten: string;
  kecamatan: string;
  kodeDesa?: string;
  kodeKecamatan?: string;
  level?: string;
};

export type MetricBundle = {
  kk: NullableCount;
  populasi: NullableCount;
  kk_terdampak: NullableCount;
  populasi_terdampak: NullableCount;
  korban_meninggal: NullableCount;
  korban_hilang: NullableCount;
  rumah_rr: NullableCount;
  rumah_rs: NullableCount;
  rumah_rb: NullableCount;
  total_rumah_rusak: NullableCount;
};

export type DesaListItem = {
  id: string;
  kode: string | null;
  nama: string;
  kabupaten: string | null;
  kecamatan: string | null;
  badge: ImpactBadge;
  total_rumah_rusak: NullableCount;
};

export type ProfilSummary = {
  title: string;
  level: "kabupaten" | "kecamatan" | "desa";
  kabupaten: string | null;
  kecamatan: string | null;
  kode_kabupaten: string | null;
  kode_kecamatan: string | null;
  kode_desa: string | null;
  badge: ImpactBadge;
  desa_count: number;
  metrics: MetricBundle;
};

export type KecamatanProfilResponse = ProfilSummary & {
  desa: DesaListItem[];
  source: "supabase";
};

export type DesaProfilResponse = ProfilSummary & {
  id: string;
  kondisi_kode: string | null;
  source: "supabase";
};

export type KabupatenProfilResponse = ProfilSummary & {
  kecamatan_list: Array<{
    kecamatan: string;
    kode_kecamatan: string | null;
    desa_count: number;
    badge: ImpactBadge;
    total_rumah_rusak: NullableCount;
  }>;
  source: "supabase";
};

const UNKNOWN_KONDISI = new Set([
  "",
  "-",
  "n/a",
  "na",
  "null",
  "unknown",
  "tidak diketahui",
  "tidak_diketahui",
  "belum diketahui",
]);

export function asNumber(value: unknown): NullableCount {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".");
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function payloadRecord(payload: Json | null | undefined): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  return payload as Record<string, unknown>;
}

export function fieldNumber(
  row: ProfilDesaRow,
  key: keyof Pick<
    ProfilDesaRow,
    | "kk"
    | "populasi"
    | "kk_terdampak"
    | "populasi_terdampak"
    | "korban_meninggal"
    | "korban_hilang"
    | "rumah_rr"
    | "rumah_rs"
    | "rumah_rb"
    | "total_rumah_rusak"
  >
): NullableCount {
  const direct = asNumber(row[key]);
  if (direct != null) return direct;
  const payload = payloadRecord(row.payload);
  if (!payload) return null;
  return asNumber(payload[key]);
}

export function fieldString(
  row: ProfilDesaRow,
  key: keyof Pick<
    ProfilDesaRow,
    | "nama"
    | "kabupaten"
    | "kecamatan"
    | "kode_desa_kelurahan"
    | "kode_kabupaten"
    | "kode_kecamatan"
    | "kondisi_kode"
  >
): string | null {
  const direct = row[key];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const payload = payloadRecord(row.payload);
  if (!payload) return null;
  const extra = payload[key];
  return typeof extra === "string" && extra.trim() ? extra.trim() : null;
}

/** Sum non-null values. If every input is null, return null (Belum Diketahui). */
export function aggregateNullable(values: NullableCount[]): NullableCount {
  let saw = false;
  let sum = 0;
  for (const value of values) {
    if (value == null || Number.isNaN(value)) continue;
    saw = true;
    sum += value;
  }
  return saw ? sum : null;
}

export function rowTotalRusak(row: ProfilDesaRow): NullableCount {
  const total = fieldNumber(row, "total_rumah_rusak");
  if (total != null) return total;
  return aggregateNullable([
    fieldNumber(row, "rumah_rr"),
    fieldNumber(row, "rumah_rs"),
    fieldNumber(row, "rumah_rb"),
  ]);
}

function isUnknownKondisi(value: string | null | undefined): boolean {
  if (value == null) return true;
  return UNKNOWN_KONDISI.has(value.trim().toLowerCase());
}

export function impactBadge(input: {
  totalRumahRusak: NullableCount;
  korbanMeninggal: NullableCount;
  korbanHilang: NullableCount;
  kkTerdampak: NullableCount;
  populasiTerdampak: NullableCount;
  kondisiKodes: Array<string | null | undefined>;
}): ImpactBadge {
  const hit =
    (input.totalRumahRusak ?? 0) > 0 ||
    (input.korbanMeninggal ?? 0) > 0 ||
    (input.korbanHilang ?? 0) > 0 ||
    (input.kkTerdampak ?? 0) > 0 ||
    (input.populasiTerdampak ?? 0) > 0;
  if (hit) return "terdampak";
  const known = input.kondisiKodes.some((k) => !isUnknownKondisi(k ?? null));
  return known ? "tidak_terdampak" : "tidak_diketahui";
}

export function metricsFromRows(rows: ProfilDesaRow[]): MetricBundle {
  return {
    kk: aggregateNullable(rows.map((r) => fieldNumber(r, "kk"))),
    populasi: aggregateNullable(rows.map((r) => fieldNumber(r, "populasi"))),
    kk_terdampak: aggregateNullable(rows.map((r) => fieldNumber(r, "kk_terdampak"))),
    populasi_terdampak: aggregateNullable(
      rows.map((r) => fieldNumber(r, "populasi_terdampak"))
    ),
    korban_meninggal: aggregateNullable(
      rows.map((r) => fieldNumber(r, "korban_meninggal"))
    ),
    korban_hilang: aggregateNullable(rows.map((r) => fieldNumber(r, "korban_hilang"))),
    rumah_rr: aggregateNullable(rows.map((r) => fieldNumber(r, "rumah_rr"))),
    rumah_rs: aggregateNullable(rows.map((r) => fieldNumber(r, "rumah_rs"))),
    rumah_rb: aggregateNullable(rows.map((r) => fieldNumber(r, "rumah_rb"))),
    total_rumah_rusak: aggregateNullable(rows.map((r) => rowTotalRusak(r))),
  };
}

export function metricsFromRow(row: ProfilDesaRow): MetricBundle {
  return metricsFromRows([row]);
}

export function badgeFromMetrics(
  metrics: MetricBundle,
  kondisiKodes: Array<string | null | undefined>
): ImpactBadge {
  return impactBadge({
    totalRumahRusak: metrics.total_rumah_rusak,
    korbanMeninggal: metrics.korban_meninggal,
    korbanHilang: metrics.korban_hilang,
    kkTerdampak: metrics.kk_terdampak,
    populasiTerdampak: metrics.populasi_terdampak,
    kondisiKodes,
  });
}

export function deriveKodeKecamatan(
  kodeDesa?: string | null,
  kodeKecamatan?: string | null
): string | null {
  if (kodeKecamatan && kodeKecamatan.trim()) return kodeKecamatan.trim();
  if (kodeDesa && kodeDesa.trim().length >= 6) return kodeDesa.trim().slice(0, 6);
  return null;
}

export function sortDesaItems(items: DesaListItem[]): DesaListItem[] {
  return [...items].sort((a, b) => {
    const da = a.total_rumah_rusak ?? -1;
    const db = b.total_rumah_rusak ?? -1;
    if (db !== da) return db - da;
    return a.nama.localeCompare(b.nama, "id");
  });
}

export function toDesaListItem(row: ProfilDesaRow): DesaListItem {
  const metrics = metricsFromRow(row);
  return {
    id: String(row.id),
    kode: fieldString(row, "kode_desa_kelurahan"),
    nama: fieldString(row, "nama") ?? row.nama,
    kabupaten: fieldString(row, "kabupaten"),
    kecamatan: fieldString(row, "kecamatan"),
    badge: badgeFromMetrics(metrics, [fieldString(row, "kondisi_kode")]),
    total_rumah_rusak: metrics.total_rumah_rusak,
  };
}

export function summarizeRows(
  rows: ProfilDesaRow[],
  level: ProfilSummary["level"],
  title: string
): ProfilSummary {
  const metrics = metricsFromRows(rows);
  const first = rows[0];
  return {
    title,
    level,
    kabupaten: first ? fieldString(first, "kabupaten") : null,
    kecamatan: first ? fieldString(first, "kecamatan") : null,
    kode_kabupaten: first ? fieldString(first, "kode_kabupaten") : null,
    kode_kecamatan: first ? fieldString(first, "kode_kecamatan") : null,
    kode_desa:
      level === "desa" && first ? fieldString(first, "kode_desa_kelurahan") : null,
    badge: badgeFromMetrics(
      metrics,
      rows.map((r) => fieldString(r, "kondisi_kode"))
    ),
    desa_count: rows.length,
    metrics,
  };
}

export function formatMetricId(value: NullableCount, unknownLabel: string): string {
  if (value == null) return unknownLabel;
  return new Intl.NumberFormat("id-ID").format(value);
}
