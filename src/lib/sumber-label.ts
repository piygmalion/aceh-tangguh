/** Display label for the BPBA incident master. Not a layer name. */
export const SIK_ACEH_DB_SOURCE = "sik_aceh.db";
export const DATA_KEJADIAN_BPBA_LABEL = "Data Kejadian BPBA";

/** Map one stored source token. Only the exact file name is relabeled. */
export function displaySumberEntry(value: string): string {
  return value === SIK_ACEH_DB_SOURCE ? DATA_KEJADIAN_BPBA_LABEL : value;
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
