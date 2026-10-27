/** List items shown on a small PeringatanBento card before the overflow row. */
export const SMALL_CARD_ROWS = 2;

/** Items in an API list, including ones the payload did not expand. */
export function listItemCount(items: readonly unknown[], extra = 0): number {
  const rest = Number.isFinite(extra) ? Math.max(0, Math.floor(extra)) : 0;
  return items.length + rest;
}

/**
 * List items that do not fit on the card.
 * `null` means the card is one object (MAGMA `event`). Its detail lines are not items.
 */
export function hiddenListItems(itemCount: number | null, shown: number): number {
  if (itemCount == null || !Number.isFinite(itemCount) || !Number.isFinite(shown)) return 0;
  const items = Math.max(0, Math.floor(itemCount));
  const visible = Math.max(0, Math.floor(shown));
  return Math.max(0, items - visible);
}

/** Message suffix under `beranda.peringatan` for a list overflow row. */
const OVERFLOW_LABEL: Record<string, string> = {
  tatonas: "posLainnya",
  cuaca: "wilayahLainnya",
  sipongi: "titikLainnya",
  maritim: "perairanLainnya",
};

/** Noun that matches a list card. MAGMA is one `event`, so it has no overflow row. */
export function overflowLabelKey(cardKey: string): string | null {
  if (cardKey === "magma") return null;
  return OVERFLOW_LABEL[cardKey] ?? "lainnya";
}
