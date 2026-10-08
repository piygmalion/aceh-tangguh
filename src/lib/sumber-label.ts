/** Display labels for stored source tokens. Tokens themselves are not rewritten. */
export const SIK_ACEH_DB_SOURCE = "sik_aceh.db";
export const DATA_KEJADIAN_BPBA_LABEL = "Data Kejadian BPBA";
export const KEJADIAN_OPERASI_SOURCE = "kejadian_operasi";
export const SIK_OPERASIONAL_SOURCE = "SIK operasional";
export const KEJADIAN_OPERASIONAL_LABEL = "Kejadian operasional";

/** Map one stored source token. Only exact values are relabeled. */
export function displaySumberEntry(value: string): string {
  if (value === SIK_ACEH_DB_SOURCE) return DATA_KEJADIAN_BPBA_LABEL;
  if (value === KEJADIAN_OPERASI_SOURCE || value === SIK_OPERASIONAL_SOURCE) {
    return KEJADIAN_OPERASIONAL_LABEL;
  }
  return value;
}

/**
 * Map a stored `source` string or `sumber_data` array for display.
 * Other entries (URLs, PDF recaps, news cites) stay verbatim.
 */
export function displaySumberEntries(value: unknown): string[] {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const text = item.trim();
    if (!text) continue;
    out.push(displaySumberEntry(text));
  }
  return out;
}
