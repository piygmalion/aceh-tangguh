import { ACEH_BBOX } from "@/lib/aceh-scope";
import {
  emptyFirmsResponse,
  FIRMS_CATALOG_HREF,
  type FirmsFeature,
  type FirmsResponse,
} from "./types";

const UA = "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; nasa-nrt-firms)";

export function firmsAreaUrl(mapKey: string, dayRange = 1): string {
  const [west, south, east, north] = ACEH_BBOX;
  const key = encodeURIComponent(mapKey);
  return `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${west},${south},${east},${north}/${dayRange}`;
}

function csvField(row: Record<string, string>, name: string): string | null {
  const value = row[name] ?? row[name.toLowerCase()];
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function csvNumber(row: Record<string, string>, name: string): number | null {
  const raw = csvField(row, name);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseCsvRows(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function inAcehBbox(lng: number, lat: number): boolean {
  const [west, south, east, north] = ACEH_BBOX;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

export function parseFirmsCsv(text: string, fetchedAt: string): FirmsResponse {
  const trimmed = text.trim();
  if (!trimmed || /^invalid/i.test(trimmed) || /error/i.test(trimmed.slice(0, 80))) {
    throw new Error("firms csv rejected");
  }
  const rows = parseCsvRows(trimmed);
  const features: FirmsFeature[] = [];
  for (const row of rows) {
    const lat = csvNumber(row, "latitude");
    const lng = csvNumber(row, "longitude");
    if (lat == null || lng == null || !inAcehBbox(lng, lat)) continue;
    const acqDate = csvField(row, "acq_date");
    const acqTime = csvField(row, "acq_time");
    const id = [acqDate, acqTime, lat.toFixed(4), lng.toFixed(4)].join(":");
    features.push({
      type: "Feature",
      id,
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        acq_date: acqDate,
        acq_time: acqTime,
        confidence: csvField(row, "confidence"),
        frp: csvNumber(row, "frp"),
        satellite: csvField(row, "satellite"),
        daynight: csvField(row, "daynight"),
      },
    });
  }
  const observed =
    features.find((f) => f.properties.acq_date)?.properties.acq_date ?? fetchedAt.slice(0, 10);
  return {
    type: "FeatureCollection",
    metadata: {
      kind: "nasa-nrt",
      official: false,
      validation: "unofficial_nrt",
      status: "ok",
      source: "firms-viirs-snpp-nrt",
      fetched_at: fetchedAt,
      observed_at: observed,
      href: FIRMS_CATALOG_HREF,
      bbox: [...ACEH_BBOX],
    },
    features,
  };
}

export async function fetchFirmsCsv(mapKey: string): Promise<FirmsResponse> {
  const res = await fetch(firmsAreaUrl(mapKey, 1), {
    headers: { Accept: "text/csv", "User-Agent": UA },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`firms http ${res.status}`);
  return parseFirmsCsv(text, new Date().toISOString());
}
