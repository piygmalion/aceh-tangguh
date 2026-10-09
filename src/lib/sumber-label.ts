/** Display labels for stored source tokens. Tokens themselves are not rewritten. */
export const SIK_ACEH_DB_SOURCE = "sik_aceh.db";
export const DATA_KEJADIAN_BPBA_LABEL = "Data Kejadian BPBA";
export const BPBA_INCIDENT_DATA_LABEL = "BPBA incident data";
export const KEJADIAN_OPERASI_SOURCE = "kejadian_operasi";
export const SIK_OPERASIONAL_SOURCE = "SIK operasional";
export const KEJADIAN_OPERASIONAL_LABEL = "Kejadian operasional";
export const OPERATIONAL_INCIDENTS_LABEL = "Operational incidents";

export type SumberLocale = "id" | "en";

function asSumberLocale(locale?: string | null): SumberLocale {
  return locale === "en" ? "en" : "id";
}

/** Map one stored source token. Only exact values are relabeled. */
export function displaySumberEntry(value: string, locale?: string | null): string {
  const loc = asSumberLocale(locale);
  if (value === SIK_ACEH_DB_SOURCE) {
    return loc === "en" ? BPBA_INCIDENT_DATA_LABEL : DATA_KEJADIAN_BPBA_LABEL;
  }
  if (value === KEJADIAN_OPERASI_SOURCE || value === SIK_OPERASIONAL_SOURCE) {
    return loc === "en" ? OPERATIONAL_INCIDENTS_LABEL : KEJADIAN_OPERASIONAL_LABEL;
  }
  return value;
}

/**
 * Map a stored `source` string or `sumber_data` array for display.
 * Other entries (URLs, PDF recaps, news cites) stay verbatim.
 */
export function displaySumberEntries(value: unknown, locale?: string | null): string[] {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const text = item.trim();
    if (!text) continue;
    out.push(displaySumberEntry(text, locale));
  }
  return out;
}

/**
 * Label one popup line for the active locale.
 * Accepts a stored token or the Indonesian label already placed on a card.
 * The input string is not rewritten.
 */
export function renderSumberLine(value: string, locale?: string | null): string {
  if (asSumberLocale(locale) === "en") {
    if (value === DATA_KEJADIAN_BPBA_LABEL) return BPBA_INCIDENT_DATA_LABEL;
    if (value === KEJADIAN_OPERASIONAL_LABEL) return OPERATIONAL_INCIDENTS_LABEL;
  }
  return displaySumberEntry(value, locale);
}
