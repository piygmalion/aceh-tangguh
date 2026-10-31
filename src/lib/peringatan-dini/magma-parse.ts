import { isAcehRelevant } from "./aceh";
import {
  MAGMA_HOME,
  type MagmaCard,
  type MagmaEvent,
  type PeringatanTone,
} from "@/lib/peringatan-dini-types";

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export type MagmaRaw = {
  no?: number;
  id_lap?: string;
  datetime_wib?: string;
  datetime_wib_str?: string;
  datetime_utc?: string;
  magnitude?: number;
  magtype?: string;
  depth?: number;
  dep_unit?: string;
  lon_lima?: number;
  lat_lima?: number;
  latlon_text?: string;
  area?: string;
  koter?: string;
  mmi?: string | null;
  nearest_volcano?: string | null;
  merusak?: number;
  /** Exact upstream alert word, when the feed has one. Not derived from magnitude. */
  level?: string | null;
};

export function extractMarkersGempa(html: string): MagmaRaw[] {
  const start = html.indexOf("var markersGempa = ");
  if (start < 0) throw new Error("MAGMA homepage feed not found");
  const bracket = html.indexOf("[", start);
  if (bracket < 0) throw new Error("MAGMA homepage feed unreadable");

  let depth = 0;
  for (let i = bracket; i < html.length; i += 1) {
    const ch = html[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        const parsed: unknown = JSON.parse(html.slice(bracket, i + 1));
        if (!Array.isArray(parsed)) throw new Error("MAGMA feed is not a list");
        return parsed as MagmaRaw[];
      }
    }
  }
  throw new Error("MAGMA homepage feed truncated");
}

/** Format a WIB wall-clock string as "18 Juni 2026, 17:08:13 WIB". */
export function formatWib(datetimeWib: string | null | undefined): string {
  if (!datetimeWib) return "—";
  const m = datetimeWib
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return `${datetimeWib} WIB`;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const monthName = MONTHS_ID[month - 1];
  if (!monthName) return `${datetimeWib} WIB`;
  return `${day} ${monthName} ${year}, ${m[4]}:${m[5]}:${m[6]} WIB`;
}

export function formatCoordDepth(raw: MagmaRaw): string {
  if (raw.latlon_text) {
    const withDeg = raw.latlon_text.replace(/\s+(LU|LS|BT|BB)\b/g, "°$1");
    const depth = raw.depth;
    const unit = raw.dep_unit || "Km";
    if (typeof depth === "number") return `${withDeg}, ${depth} ${unit}`;
    return withDeg;
  }
  const lat = raw.lat_lima;
  const lon = raw.lon_lima;
  if (typeof lat !== "number" || typeof lon !== "number") return "—";
  const ns = lat >= 0 ? "LU" : "LS";
  const ew = lon >= 0 ? "BT" : "BB";
  const depth =
    typeof raw.depth === "number" ? `, ${raw.depth} ${raw.dep_unit || "Km"}` : "";
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lon).toFixed(2)}°${ew}${depth}`;
}

export function occurredIso(raw: MagmaRaw): string | null {
  const wib = raw.datetime_wib || raw.datetime_wib_str;
  if (wib) {
    const iso = wib.trim().replace(" ", "T");
    const withOffset = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}+07:00`;
    const ms = Date.parse(withOffset);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }
  if (raw.datetime_utc) {
    const iso = raw.datetime_utc.trim().replace(" ", "T") + "Z";
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }
  return null;
}

export function explicitMagmaLevel(value: unknown): "AWAS" | "SIAGA" | "WASPADA" | null {
  if (typeof value !== "string") return null;
  const token = value.trim().toUpperCase();
  if (token === "AWAS" || token === "SIAGA" || token === "WASPADA") return token;
  return null;
}

/**
 * Neutral unless the record's own level field is WASPADA, SIAGA, or AWAS.
 * Magnitude, MMI text, and `merusak` are not alert levels. AN-4 records that
 * this site has no magnitude-minimum policy (`docs/pengembangan/jurnal/AN-4.md`).
 * SIAGA is the orange legend step. Only AWAS is danger (red #C8102E).
 */
export function magmaTone(event: MagmaEvent | null, raw?: MagmaRaw): PeringatanTone {
  if (!event) return "neutral";
  const level = explicitMagmaLevel(raw?.level);
  if (level === "AWAS") return "danger";
  if (level === "SIAGA") return "siaga";
  if (level === "WASPADA") return "warn";
  return "neutral";
}

export function normalizeEvent(raw: MagmaRaw): MagmaEvent {
  const mag = typeof raw.magnitude === "number" ? raw.magnitude : null;
  const unit = raw.magtype || "SR";
  const volcano = (raw.nearest_volcano ?? "").trim();
  return {
    id: String(raw.id_lap || raw.no || ""),
    magnitude: mag,
    magnitude_text: mag === null ? "—" : `${mag} ${unit}`,
    waktu_kejadian: formatWib(raw.datetime_wib || raw.datetime_wib_str),
    koordinat_kedalaman: formatCoordDepth(raw),
    wilayah: (raw.area || raw.koter || "").trim() || "—",
    intensitas_mmi: raw.mmi ? String(raw.mmi) : null,
    gunung_api_terdekat: volcano && volcano !== "-" ? volcano : null,
    href: MAGMA_HOME,
    occurred_at: occurredIso(raw),
  };
}

function pickLatestAceh(list: MagmaRaw[]): { event: MagmaEvent | null; raw?: MagmaRaw } {
  const aceh = list.filter((row) =>
    isAcehRelevant({
      lon: row.lon_lima,
      lat: row.lat_lima,
      texts: [row.area, row.koter, row.mmi, row.nearest_volcano],
    }),
  );
  aceh.sort((a, b) => {
    const ta = Date.parse(occurredIso(a) ?? "") || 0;
    const tb = Date.parse(occurredIso(b) ?? "") || 0;
    return tb - ta;
  });
  const latest = aceh[0];
  if (!latest) return { event: null };
  return { event: normalizeEvent(latest), raw: latest };
}

export type MagmaLiveCard = Omit<MagmaCard, "stale" | "source" | "example">;

export function cardFromMagmaRaws(list: MagmaRaw[]): MagmaLiveCard {
  const { event, raw } = pickLatestAceh(list);
  return {
    kind: "magma",
    tone: magmaTone(event, raw),
    empty: event === null,
    event,
    fetched_at: new Date().toISOString(),
    href: event?.href ?? MAGMA_HOME,
  };
}

export function parseMagmaHomepage(html: string): MagmaLiveCard {
  return cardFromMagmaRaws(extractMarkersGempa(html));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asFinite(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function quakeRows(payload: unknown): Record<string, unknown>[] {
  const root = asRecord(payload);
  if (!root || root.success === false) return [];
  const data = asRecord(root.data);
  const earthquake = data?.earthquake ?? root.earthquake;
  const nested = data?.data;
  const list = Array.isArray(earthquake) ? earthquake : Array.isArray(nested) ? nested : [];
  return list.filter((row): row is Record<string, unknown> => asRecord(row) !== null);
}

/** Map one object from the public MAGMA JSON feed onto the legacy raw row. */
export function magmaRawFromPublicQuake(row: Record<string, unknown>): MagmaRaw | null {
  const lat = asFinite(row.latitude ?? row.lat_lima);
  const lon = asFinite(row.longitude ?? row.lon_lima);
  if (lat == null || lon == null) return null;
  const reportId = typeof row.report_id === "string" ? row.report_id.trim() : "";
  const uuid = typeof row.id === "string" ? row.id.trim() : "";
  const level =
    explicitMagmaLevel(row.level) ??
    explicitMagmaLevel(row.alert_level) ??
    explicitMagmaLevel(row.status_label);
  const destructive = row.is_destructive_earthquake;
  const area =
    (typeof row.affected_area === "string" && row.affected_area) ||
    (typeof row.area === "string" && row.area) ||
    (typeof row.region === "string" && row.region) ||
    undefined;
  return {
    id_lap: reportId || uuid || undefined,
    datetime_wib: typeof row.datetime_wib === "string" ? row.datetime_wib : undefined,
    datetime_utc:
      typeof row.datetime === "string"
        ? row.datetime
        : typeof row.datetime_utc === "string"
          ? row.datetime_utc
          : undefined,
    magnitude: asFinite(row.magnitude) ?? undefined,
    magtype:
      typeof row.magnitude_type === "string"
        ? row.magnitude_type
        : typeof row.magtype === "string"
          ? row.magtype
          : "SR",
    depth: asFinite(row.depth) ?? undefined,
    dep_unit:
      typeof row.depth_unit === "string"
        ? row.depth_unit
        : typeof row.dep_unit === "string"
          ? row.dep_unit
          : "Km",
    lon_lima: lon,
    lat_lima: lat,
    latlon_text:
      typeof row.coordinates_text === "string"
        ? row.coordinates_text
        : typeof row.latlon_text === "string"
          ? row.latlon_text
          : undefined,
    area,
    koter: typeof row.region === "string" ? row.region : typeof row.koter === "string" ? row.koter : undefined,
    mmi:
      typeof row.intensity === "string"
        ? row.intensity
        : typeof row.mmi === "string"
          ? row.mmi
          : null,
    nearest_volcano: typeof row.nearest_volcano === "string" ? row.nearest_volcano : null,
    merusak:
      destructive === true ? 1 : destructive === false ? 0 : (asFinite(row.merusak) ?? undefined),
    level,
  };
}

export function magmaRawsFromPublicPayload(payload: unknown): MagmaRaw[] {
  return quakeRows(payload)
    .map(magmaRawFromPublicQuake)
    .filter((row): row is MagmaRaw => row !== null);
}

function richness(raw: MagmaRaw): number {
  return (
    (raw.datetime_wib ? 4 : 0) +
    (raw.id_lap?.startsWith("ROQ") ? 2 : 0) +
    (typeof raw.depth === "number" ? 1 : 0)
  );
}

function dedupeKeys(raw: MagmaRaw): string[] {
  const keys: string[] = [];
  if (raw.id_lap) keys.push(`id:${raw.id_lap}`);
  if (typeof raw.lat_lima === "number" && typeof raw.lon_lima === "number") {
    keys.push(`geo:${raw.lat_lima.toFixed(3)}:${raw.lon_lima.toFixed(3)}:${raw.magnitude ?? "x"}`);
  }
  return keys;
}

/** Keep one row per quake. A dated list row replaces the same map row that has no clock. */
export function mergeMagmaRaws(groups: MagmaRaw[][]): MagmaRaw[] {
  const out: MagmaRaw[] = [];
  const index = new Map<string, number>();
  for (const raw of groups.flat()) {
    const keys = dedupeKeys(raw);
    const slot = keys.map((key) => index.get(key)).find((n): n is number => n != null);
    if (slot == null) {
      const at = out.length;
      out.push(raw);
      for (const key of keys) index.set(key, at);
      continue;
    }
    if (richness(raw) > richness(out[slot])) out[slot] = raw;
    for (const key of dedupeKeys(out[slot])) index.set(key, slot);
  }
  return out;
}
