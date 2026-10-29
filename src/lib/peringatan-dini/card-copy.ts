import type { CuacaWarningCard, MagmaCard, PeringatanTone } from "@/lib/peringatan-dini-types";
import type { TatonasCard } from "@/lib/tatonas/types";

/** WIB wall clock, same offset as parseTatonasLocalTime. Kept here so the bento does not import node:crypto. */
export function parseWibMillis(value: string | null | undefined): number | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const wall = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
  const ms = Date.parse(wall ? `${wall[1]}T${wall[2]}+07:00` : trimmed);
  return Number.isFinite(ms) ? ms : null;
}

/** Age of one post. Unknown when the clock is missing or unreadable — never a stand-in of 15. */
export function highlightAgeMinutes(
  timeLocal: string | null | undefined,
  nowMs: number,
): number | null {
  const ms = parseWibMillis(timeLocal);
  if (ms == null) return null;
  return Math.max(0, Math.floor((nowMs - ms) / 60_000));
}

/** Age in minutes of the newest dated highlight. Null when none of the clocks can be read. */
export function newestHighlightAgeMinutes(
  times: Array<string | null | undefined>,
  nowMs: number,
): number | null {
  const dated = times
    .map((value) => highlightAgeMinutes(value, nowMs))
    .filter((age): age is number => age != null);
  if (dated.length === 0) return null;
  return Math.min(...dated);
}

/** Stale row. A known clock carries this post's age. An unknown clock is the name only. */
export function tatonasStaleRow(
  posName: string,
  timeLocal: string | null | undefined,
  nowMs: number,
): { nama: string; menit: number | null; min: number | null } {
  const age = highlightAgeMinutes(timeLocal, nowMs);
  return { nama: posName, menit: age, min: age };
}

export type TatonasCopy =
  | { kind: "stale"; menit: number | null }
  | { kind: "normal" }
  | { kind: "alert"; count: number };

export function tatonasCopy(
  card: Pick<TatonasCard, "fresh_count" | "alert_count" | "highlights">,
  nowMs: number = Date.now(),
): TatonasCopy {
  if ((card.fresh_count ?? 0) === 0) {
    return {
      kind: "stale",
      menit: newestHighlightAgeMinutes(
        card.highlights.map((row) => row.time_local),
        nowMs,
      ),
    };
  }
  if ((card.alert_count ?? 0) === 0) return { kind: "normal" };
  return { kind: "alert", count: card.alert_count ?? 0 };
}

export type MagmaSummary = "unavailable" | "empty" | "event";

export function magmaSummary(
  card: Pick<MagmaCard, "source" | "empty" | "event">,
): MagmaSummary {
  if (card.source === "unavailable") return "unavailable";
  if (card.empty || !card.event) return "empty";
  return "event";
}

export type CuacaBentoKind = "unavailable" | "empty" | "warnings";

export type CuacaBentoView = {
  kind: CuacaBentoKind;
  summaryKey: "cuacaUnavailable" | "cuacaEmpty" | "cuacaCount";
  chip: "stale" | "tone";
  grey: boolean;
  tone: PeringatanTone;
  footer: "snapshot" | "time";
  showDetails: boolean;
};

function cuacaFeedDelayed(card: { source: string; stale: boolean }): boolean {
  return card.source === "unavailable" || card.stale === true;
}

function cuacaStampPresent(fetchedAt: string | null): boolean {
  return typeof fetchedAt === "string" && fetchedAt.trim().length > 0;
}

/**
 * Weather card copy for the bento. Unavailable and stale feeds use the grey
 * delayed chip. The empty "no active warning" sentence is only for a fresh feed.
 */
export function cuacaBentoView(
  card: Pick<
    CuacaWarningCard,
    "source" | "stale" | "empty" | "highlights" | "extra_count" | "tone" | "fetched_at"
  >,
): CuacaBentoView {
  if (cuacaFeedDelayed(card)) {
    return {
      kind: "unavailable",
      summaryKey: "cuacaUnavailable",
      chip: "stale",
      grey: true,
      tone: "neutral",
      footer: "snapshot",
      showDetails: false,
    };
  }
  const warningCount = card.highlights.length + card.extra_count;
  const empty = card.empty || warningCount === 0;
  return {
    kind: empty ? "empty" : "warnings",
    summaryKey: empty ? "cuacaEmpty" : "cuacaCount",
    chip: "tone",
    grey: false,
    tone: card.tone,
    footer: cuacaStampPresent(card.fetched_at) ? "time" : "snapshot",
    showDetails: !empty,
  };
}

/** Canonical BMKG condition phrases written by weather-summary → message key under beranda.peringatan.kondisi. */
const CUACA_KONDISI_KEY: Record<string, string> = {
  petir: "petir",
  "hujan lebat": "hujanLebat",
  "hujan sedang": "hujanSedang",
  "hujan ekstrem": "hujanEkstrem",
  "angin kencang": "anginKencang",
  thunderstorm: "petir",
  "heavy rain": "hujanLebat",
  "moderate rain": "hujanSedang",
  "extreme rain": "hujanEkstrem",
  "strong wind": "anginKencang",
  "violent rain": "hujanLebat",
  "hujan petir": "petir",
};

type KondisiT = (key: string) => string;

/**
 * Localise weather-summary condition labels for the bento detail rows.
 * Unknown phrases pass through unchanged — never invent figures or new hazards.
 */
export function translateCuacaKondisi(
  kondisi: string,
  locale: string,
  t: KondisiT,
): string {
  const parts = kondisi.split(/\s*·\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return kondisi;
  const lowerLocale = locale.toLowerCase().startsWith("en") ? "en" : "id";
  return parts
    .map((part) => {
      const key = CUACA_KONDISI_KEY[part.toLowerCase()];
      if (!key) return lowerLocale === "en" ? part : part.toLocaleLowerCase("id-ID");
      return t(`kondisi.${key}`);
    })
    .join(" · ");
}
