/** Detail lines shown on a small PeringatanBento card before the overflow row. */
export const SMALL_CARD_ROWS = 2;

/** Named detail rows that do not fit on the card. Never a fixed count. */
export function hiddenDetailRows(total: number, shown: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(shown)) return 0;
  const rows = Math.max(0, Math.floor(total));
  const visible = Math.max(0, Math.floor(shown));
  return Math.max(0, rows - visible);
}
