import type { MagmaCard } from "@/lib/peringatan-dini-types";
import { TATONAS_STALE_MS, type TatonasCard } from "@/lib/tatonas/types";

/** WIB wall clock, same offset as parseTatonasLocalTime. Kept here so the bento does not import node:crypto. */
export function parseWibMillis(value: string | null | undefined): number | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const wall = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
  const ms = Date.parse(wall ? `${wall[1]}T${wall[2]}+07:00` : trimmed);
  return Number.isFinite(ms) ? ms : null;
}

/** Age of one post. A missing clock uses the existing 15-minute floor, not a new threshold. */
export function highlightAgeMinutes(timeLocal: string | null | undefined, nowMs: number): number {
  const ms = parseWibMillis(timeLocal);
  if (ms == null) return Math.floor(TATONAS_STALE_MS / 60_000);
  return Math.max(0, Math.floor((nowMs - ms) / 60_000));
}

/** Age in minutes of the newest highlight. Missing clocks use the existing 15-minute floor. */
export function newestHighlightAgeMinutes(
  times: Array<string | null | undefined>,
  nowMs: number,
): number {
  const ages = times.map((value) => highlightAgeMinutes(value, nowMs));
  const dated = times
    .map((value, index) => (parseWibMillis(value) == null ? null : ages[index]))
    .filter((age): age is number => age != null);
  if (dated.length === 0) return Math.floor(TATONAS_STALE_MS / 60_000);
  return Math.min(...dated);
}

/** Stale row copy. The level word is omitted; the age is this post's own clock. */
export function tatonasStaleRow(
  posName: string,
  timeLocal: string | null | undefined,
  nowMs: number,
): { nama: string; menit: number; min: number } {
  const age = highlightAgeMinutes(timeLocal, nowMs);
  return { nama: posName, menit: age, min: age };
}

export type TatonasCopy =
  | { kind: "stale"; menit: number }
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
