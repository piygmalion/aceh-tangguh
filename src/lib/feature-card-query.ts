export type FeatureSlot<T extends { id: string }> = {
  id: string | null;
  card: T | null;
};

export function abortError(): Error {
  const err = new Error("aborted");
  err.name = "AbortError";
  return err;
}

/** Show a card only when it belongs to the feature that is open now. */
export function acceptFeatureCard<T extends { id: string }>(
  activeId: string | null,
  card: T | null | undefined,
): card is T {
  return Boolean(activeId && card && card.id === activeId);
}

export function reduceFeatureSlot<T extends { id: string }>(
  slot: FeatureSlot<T>,
  event:
    | { type: "tap"; id: string }
    | { type: "result"; id: string; card: T },
): FeatureSlot<T> {
  if (event.type === "tap") return { id: event.id, card: null };
  if (event.id !== slot.id || event.card.id !== event.id) return slot;
  return { id: slot.id, card: event.card };
}

/**
 * Resolve one feature card. A signal aborted by a newer tap rejects,
 * including when the response arrives after the abort.
 */
export async function loadFeatureCard<T>(
  id: string,
  layer: string | undefined,
  signal: AbortSignal,
  fetcher: (id: string, layer: string | undefined, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (signal.aborted) throw abortError();
  const card = await fetcher(id, layer, signal);
  if (signal.aborted) throw abortError();
  return card;
}
