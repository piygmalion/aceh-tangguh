/** Detail lines shown on a small PeringatanBento card before the overflow row. */
export const SMALL_CARD_ROWS = 2;

/** Named detail rows that do not fit on the card. Never a fixed count. */
export function hiddenDetailRows(total: number, shown: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(shown)) return 0;
  const rows = Math.max(0, Math.floor(total));
  const visible = Math.max(0, Math.floor(shown));
  return Math.max(0, rows - visible);
}

/** Message suffix under `beranda.peringatan` for the overflow row. */
const OVERFLOW_LABEL: Record<string, string> = {
  magma: "gempaLainnya",
  tatonas: "posLainnya",
  cuaca: "wilayahLainnya",
  sipongi: "titikLainnya",
  maritim: "perairanLainnya",
};

/** Noun that matches the card. Unknown feeds use the generic row. */
export function overflowLabelKey(cardKey: string): string {
  return OVERFLOW_LABEL[cardKey] ?? "lainnya";
}
