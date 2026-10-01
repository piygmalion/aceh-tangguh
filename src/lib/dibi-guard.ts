import type { DibiAcehPayload } from "./dibi-types";

/** Reject a live refresh when kejadian falls by more than this share of the last good fixture. */
export const DIBI_KEJADIAN_DROP_LIMIT = 0.02;

export type DibiGuardReason = "year-sum-mismatch" | "kejadian-drop";

export type DibiGuardVerdict =
  | { ok: true }
  | { ok: false; reason: DibiGuardReason };

type YearRow = { kejadian?: number };

/**
 * Sum of `by_tahun.kejadian`. Returns null when a row is missing a finite count,
 * so a truncated payload cannot pass by skipping holes.
 */
export function sumTahunKejadian(rows: readonly YearRow[] | undefined): number | null {
  if (!Array.isArray(rows)) return null;
  let sum = 0;
  for (const row of rows) {
    const n = row?.kejadian;
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    sum += n;
  }
  return sum;
}

/**
 * A live DIBI payload is usable only when the published total matches the year
 * rows, and kejadian has not dropped by more than 2% from the last validated fixture.
 * A drop of exactly 2% still passes. A missing baseline only checks the year sum.
 */
export function assessDibiLive(
  live: { totals?: { kejadian?: number }; by_tahun?: readonly YearRow[] },
  baselineKejadian: number | null | undefined,
): DibiGuardVerdict {
  const total = live?.totals?.kejadian;
  const sum = sumTahunKejadian(live?.by_tahun);
  if (typeof total !== "number" || !Number.isFinite(total) || sum == null || total !== sum) {
    return { ok: false, reason: "year-sum-mismatch" };
  }
  if (
    typeof baselineKejadian === "number" &&
    Number.isFinite(baselineKejadian) &&
    baselineKejadian > 0 &&
    (baselineKejadian - total) / baselineKejadian > DIBI_KEJADIAN_DROP_LIMIT
  ) {
    return { ok: false, reason: "kejadian-drop" };
  }
  return { ok: true };
}

/**
 * Prefer a live payload that passed the guard. Otherwise keep the last accepted
 * live payload. The caller serves the on-disk fixture when this returns null.
 */
export function chooseDibiDelivery(
  live: DibiAcehPayload | null,
  baselineKejadian: number | null,
  lastAccepted: DibiAcehPayload | null,
): { payload: DibiAcehPayload; source: "dibi" } | null {
  if (live && assessDibiLive(live, baselineKejadian).ok) {
    return { payload: live, source: "dibi" };
  }
  if (lastAccepted && assessDibiLive(lastAccepted, null).ok) {
    return { payload: lastAccepted, source: "dibi" };
  }
  return null;
}
