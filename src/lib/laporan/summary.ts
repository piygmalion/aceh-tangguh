import type { LaporanStatus } from "@/lib/laporan/status";
import { LAPORAN_STATUSES } from "@/lib/laporan/status";

export const ADUAN_STATUSES = [
  "submitted",
  "in_review",
  "needs_info",
] as const satisfies readonly LaporanStatus[];

export const DITANGGAPI_STATUSES = ["approved"] as const satisfies readonly LaporanStatus[];

export type LaporanStatusCounts = Record<LaporanStatus, number>;

export function emptyLaporanStatusCounts(): LaporanStatusCounts {
  return {
    draft: 0,
    submitted: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
    needs_info: 0,
    archived: 0,
  };
}

export function sumStatusGroup(
  counts: LaporanStatusCounts,
  keys: readonly LaporanStatus[]
): number {
  return keys.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
}

export type LaporanPublicSummary = {
  aduan: number;
  ditanggapi: number;
};

/** Aggregate both laporan tables. Counts only — no rows / PII. */
export function laporanPublicSummary(
  kejadian: LaporanStatusCounts,
  penanganan: LaporanStatusCounts
): LaporanPublicSummary {
  return {
    aduan:
      sumStatusGroup(kejadian, ADUAN_STATUSES) +
      sumStatusGroup(penanganan, ADUAN_STATUSES),
    ditanggapi:
      sumStatusGroup(kejadian, DITANGGAPI_STATUSES) +
      sumStatusGroup(penanganan, DITANGGAPI_STATUSES),
  };
}

export function isCompleteStatusCounts(
  value: Partial<LaporanStatusCounts> | null | undefined
): value is LaporanStatusCounts {
  if (!value) return false;
  return LAPORAN_STATUSES.every((key) => typeof value[key] === "number");
}
