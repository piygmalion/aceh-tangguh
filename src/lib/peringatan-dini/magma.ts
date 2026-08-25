import { readFile } from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";
import { ACEH_BBOX } from "@/lib/basemap";
import {
  MAGMA_HOME,
  type MagmaCard,
  type MagmaEvent,
  type PeringatanTone,
} from "@/lib/peringatan-dini-types";
import { isAcehRelevant } from "./aceh";

const MAGMA_PAGE = MAGMA_HOME;
const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; MAGMA gempa Aceh)";
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

type MagmaRaw = {
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
};

function extractMarkersGempa(html: string): MagmaRaw[] {
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

function occurredIso(raw: MagmaRaw): string | null {
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

function magmaTone(event: MagmaEvent | null, raw?: MagmaRaw): PeringatanTone {
  if (!event) return "neutral";
  const mag = event.magnitude ?? 0;
  if ((raw?.merusak ?? 0) > 0 || mag >= 5) return "danger";
  if (mag >= 3 || event.intensitas_mmi) return "warn";
  return "warn";
}

function normalizeEvent(raw: MagmaRaw): MagmaEvent {
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

export async function fetchMagmaLive(): Promise<Omit<MagmaCard, "stale" | "source" | "example">> {
  const res = await fetch(MAGMA_PAGE, {
    headers: {
      Accept: "text/html",
      "User-Agent": UA,
    },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`MAGMA homepage ${res.status}`);
  const html = await res.text();
  const list = extractMarkersGempa(html);
  const { event, raw } = pickLatestAceh(list);
  const fetched_at = new Date().toISOString();
  return {
    kind: "magma",
    tone: magmaTone(event, raw),
    empty: event === null,
    event,
    fetched_at,
    href: event?.href ?? MAGMA_HOME,
  };
}

const getCachedMagmaLive = unstable_cache(
  fetchMagmaLive,
  ["peringatan-magma-aceh"],
  { revalidate: 600, tags: ["peringatan-magma"] },
);

function isMagmaCard(value: unknown): value is MagmaCard {
  if (!value || typeof value !== "object") return false;
  const rec = value as MagmaCard;
  return rec.kind === "magma" && (rec.event === null || typeof rec.event === "object");
}

async function loadMagmaFixture(): Promise<MagmaCard> {
  const file = path.join(process.cwd(), "public/fixtures/peringatan-magma.json");
  const raw = await readFile(file, "utf8");
  const data: unknown = JSON.parse(raw);
  if (!isMagmaCard(data)) {
    return {
      kind: "magma",
      tone: "neutral",
      empty: true,
      event: null,
      fetched_at: new Date().toISOString(),
      href: MAGMA_HOME,
      stale: true,
      source: "fixture",
      example: true,
    };
  }
  return { ...data, stale: true, source: "fixture" };
}

export async function getMagmaPeringatan(): Promise<MagmaCard> {
  try {
    const live = await getCachedMagmaLive();
    return { ...live, stale: false, source: "live" };
  } catch (err) {
    console.error("[peringatan-dini/magma]", err);
    const fixture = await loadMagmaFixture();
    return { ...fixture, stale: true, source: "fixture" };
  }
}

export const MAGMA_BBOX = ACEH_BBOX;
