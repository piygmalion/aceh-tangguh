import type { MagmaCard } from "@/lib/peringatan-dini-types";
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
