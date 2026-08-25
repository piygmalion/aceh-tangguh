/** Stale seed previously shipped as live_stats.posko_count. Not a counted inventory. */
export const STALE_SEEDED_POSKO_COUNT = 656;

/**
 * Posko inventory is on hold until a real source exists.
 * Missing, non-finite, and the stale 656 seed all become absent — never 0-as-inventory.
 */
export function normalizePoskoCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value === STALE_SEEDED_POSKO_COUNT) return null;
  return value;
}
