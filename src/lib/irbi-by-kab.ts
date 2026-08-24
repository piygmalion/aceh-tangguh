import { fetchPublicApi } from "@/lib/preview/public-api";

/**
 * Client-safe IRBI 2025 lookup for homepage weather thumbs.
 *
 * Join strategy (first hit wins):
 * 1. Exact uppercase `kabupaten_kota_kode` (weather "BANDA ACEH", IRBI "KOTA BANDA ACEH")
 * 2. Normalized kode / name after folding NFC, case, punctuation, and
 *    admin prefixes (`Kota`, `Kabupaten`, `Kab.`, `Kota Administratif`).
 *
 * Do not invent scores — missing joins stay undefined.
 */

export type IrbiKabSummary = {
  kabupaten_kota: string;
  kabupaten_kota_kode?: string;
  irb_2025: number;
  kelas_risiko: string;
  ancaman_tertinggi?: string;
  ir_cuaca_ekstrem?: number;
  kelas_cuaca_ekstrem?: string;
};

export type IrbiSummaryPayload = {
  metadata?: Record<string, unknown>;
  kabupaten_kota: IrbiKabSummary[];
};

export type IrbiByKabMap = Map<string, IrbiKabSummary>;

const ADMIN_PREFIX =
  /^(kota(\s+administratif)?|kabupaten|kab\.?|kotamadya)\s+/i;

export function normalizeKabupatenKey(
  raw: string | undefined | null,
): string {
  if (!raw) return "";
  const folded = raw
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ");
  return folded.replace(ADMIN_PREFIX, "").trim();
}

function indexKey(raw: string | undefined | null): string | null {
  const key = normalizeKabupatenKey(raw);
  return key || null;
}

function exactKodeKey(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const key = raw.normalize("NFC").trim().toUpperCase();
  return key || null;
}

export function buildIrbiByKabMap(
  rows: readonly IrbiKabSummary[],
): IrbiByKabMap {
  const map: IrbiByKabMap = new Map();
  const set = (key: string | null, row: IrbiKabSummary) => {
    if (!key || map.has(key)) return;
    map.set(key, row);
  };

  for (const row of rows) {
    set(exactKodeKey(row.kabupaten_kota_kode), row);
    set(indexKey(row.kabupaten_kota_kode), row);
    set(indexKey(row.kabupaten_kota), row);
  }
  return map;
}

export function kabupatenIndexKeys(query: {
  kabupaten_kota?: string;
  kabupaten_kota_kode?: string;
}): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const key of [
    exactKodeKey(query.kabupaten_kota_kode),
    indexKey(query.kabupaten_kota_kode),
    indexKey(query.kabupaten_kota),
  ]) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

export function lookupIrbiKab(
  map: IrbiByKabMap,
  query: {
    kabupaten_kota?: string;
    kabupaten_kota_kode?: string;
  },
): IrbiKabSummary | undefined {
  for (const key of kabupatenIndexKeys(query)) {
    const hit = map.get(key);
    if (hit) return hit;
  }
  return undefined;
}

let cachedRows: IrbiKabSummary[] | null = null;
let inflight: Promise<IrbiKabSummary[]> | null = null;

export async function fetchIrbiSummary(): Promise<IrbiSummaryPayload> {
  const res = await fetchPublicApi("/api/irbi");
  if (!res.ok) throw new Error("Failed to load IRBI");
  const data = (await res.json()) as IrbiSummaryPayload;
  const rows = Array.isArray(data.kabupaten_kota) ? data.kabupaten_kota : [];
  cachedRows = rows;
  return { ...data, kabupaten_kota: rows };
}

/** Module-level cache of the 23 IRBI kabupaten rows. */
export async function loadIrbiKabRows(): Promise<IrbiKabSummary[]> {
  if (cachedRows) return cachedRows;
  if (!inflight) {
    inflight = fetchIrbiSummary()
      .then((payload) => payload.kabupaten_kota)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function loadIrbiByKabMap(): Promise<IrbiByKabMap> {
  const rows = await loadIrbiKabRows();
  return buildIrbiByKabMap(rows);
}
