/**
 * Refresh MAGMA + Sipongi early-warning fixtures from public official feeds.
 * Never invents earthquakes or hotspots — writes only what the live fetch returns.
 *
 * Usage:
 *   node scripts/refresh-peringatan.mjs
 *   node scripts/refresh-peringatan.mjs --sipongi-only
 */
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { ACEH_BBOX } from "./lib/aceh-scope.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; refresh:peringatan)";

const MAGMA_HOME = "https://magma.esdm.go.id/";
const SIPONGI_PETA = "https://sipongi.gakkum.kehutanan.go.id/peta";
const SIPONGI_OPSROOM = "https://opsroom.sipongidata.my.id";
const ACEH_TERMS = [
  "aceh",
  "banda aceh",
  "sabang",
  "langsa",
  "lhokseumawe",
  "subulussalam",
  "simeulue",
  "pidie",
  "bener meriah",
  "bireuen",
  "gayo lues",
  "nagan raya",
  "aceh singkil",
];
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

function mentionsAceh(text) {
  if (!text) return false;
  const hay = String(text).toLowerCase();
  return ACEH_TERMS.some((term) => hay.includes(term));
}

function inBbox(lon, lat) {
  const [minLon, minLat, maxLon, maxLat] = ACEH_BBOX;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

function formatWib(datetimeWib) {
  if (!datetimeWib) return "—";
  const m = String(datetimeWib)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return `${datetimeWib} WIB`;
  const monthName = MONTHS_ID[Number(m[2]) - 1];
  if (!monthName) return `${datetimeWib} WIB`;
  return `${Number(m[3])} ${monthName} ${m[1]}, ${m[4]}:${m[5]}:${m[6]} WIB`;
}

function formatCoordDepth(raw) {
  if (raw.latlon_text) {
    const withDeg = String(raw.latlon_text).replace(/\s+(LU|LS|BT|BB)\b/g, "°$1");
    if (typeof raw.depth === "number") {
      return `${withDeg}, ${raw.depth} ${raw.dep_unit || "Km"}`;
    }
    return withDeg;
  }
  return "—";
}

function occurredIso(raw) {
  const wib = raw.datetime_wib || raw.datetime_wib_str;
  if (wib) {
    const iso = String(wib).trim().replace(" ", "T");
    const withOffset = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}+07:00`;
    const ms = Date.parse(withOffset);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }
  return null;
}

function extractMarkersGempa(html) {
  const start = html.indexOf("var markersGempa = ");
  if (start < 0) throw new Error("MAGMA homepage feed not found");
  const bracket = html.indexOf("[", start);
  let depth = 0;
  for (let i = bracket; i < html.length; i += 1) {
    if (html[i] === "[") depth += 1;
    else if (html[i] === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(bracket, i + 1));
    }
  }
  throw new Error("MAGMA homepage feed truncated");
}

async function refreshMagma() {
  const res = await fetch(MAGMA_HOME, {
    headers: { Accept: "text/html", "User-Agent": UA },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`MAGMA homepage ${res.status}`);
  const list = extractMarkersGempa(await res.text());
  if (!Array.isArray(list)) throw new Error("MAGMA feed is not a list");

  const aceh = list.filter((row) => {
    const lon = row.lon_lima;
    const lat = row.lat_lima;
    if (typeof lon === "number" && typeof lat === "number" && inBbox(lon, lat)) {
      return true;
    }
    return [row.area, row.koter, row.mmi].some(mentionsAceh);
  });
  aceh.sort((a, b) => (Date.parse(occurredIso(b) ?? "") || 0) - (Date.parse(occurredIso(a) ?? "") || 0));
  const raw = aceh[0] ?? null;
  const volcano = raw?.nearest_volcano ? String(raw.nearest_volcano).trim() : "";
  const mag = typeof raw?.magnitude === "number" ? raw.magnitude : null;
  const event = raw
    ? {
        id: String(raw.id_lap || raw.no || ""),
        magnitude: mag,
        magnitude_text: mag === null ? "—" : `${mag} ${raw.magtype || "SR"}`,
        waktu_kejadian: formatWib(raw.datetime_wib || raw.datetime_wib_str),
        koordinat_kedalaman: formatCoordDepth(raw),
        wilayah: String(raw.area || raw.koter || "—"),
        intensitas_mmi: raw.mmi ? String(raw.mmi) : null,
        gunung_api_terdekat: volcano && volcano !== "-" ? volcano : null,
        href: MAGMA_HOME,
        occurred_at: occurredIso(raw),
      }
    : null;

  const tone = !event ? "neutral" : mag !== null && mag >= 5 ? "danger" : "warn";
  const payload = {
    kind: "magma",
    tone,
    empty: event === null,
    event,
    fetched_at: new Date().toISOString(),
    href: MAGMA_HOME,
    stale: false,
    source: "live",
    example: false,
  };
  const out = path.join(root, "public/fixtures/peringatan-magma.json");
  await writeFile(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${out} (${event ? event.wilayah : "no Aceh event"})`);
}

async function refreshSipongi() {
  const params = new URLSearchParams();
  params.set("wilayah", "IN");
  params.set("filterperiode", "0");
  params.set("late", "24");
  params.set("provinsi", "1");
  params.set("kabkota", "");
  for (const sat of [
    "NASA-MODIS",
    "NASA-SNPP",
    "NASA-NOAA20",
    "LPN-MODIS",
    "LPN-NPP",
    "LPN-NOAA20",
  ]) {
    params.append("satelit[]", sat);
  }
  params.append("confidence[]", "medium");
  params.append("confidence[]", "high");

  const url = `${SIPONGI_OPSROOM}/api/opsroom/indoHotspot?${params}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": UA,
      Referer: SIPONGI_PETA,
      Origin: "https://sipongi.gakkum.kehutanan.go.id",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Sipongi ${res.status}`);
  const data = await res.json();
  const features = Array.isArray(data.features) ? data.features : [];
  const seen = new Set();
  const points = features
    .map((f) => f?.properties ?? {})
    .filter((p) => {
      const level = String(p.confidence_level ?? "").toLowerCase();
      if (level !== "medium" && level !== "high") return false;
      if (p.provinsi_id != null && Number(p.provinsi_id) !== 1) return false;
      const prov = String(p.nama_provinsi ?? "").toLowerCase();
      return !prov || prov === "aceh";
    })
    .sort(
      (a, b) =>
        (Date.parse(b.date_hotspot_ori ?? "") || 0) -
        (Date.parse(a.date_hotspot_ori ?? "") || 0),
    )
    .filter((p) => {
      const day = String(p.date_hotspot_ori ?? p.date_hotspot ?? "").slice(0, 10);
      const key = `${p.desa}|${p.kecamatan}|${p.kabkota}|${day}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3)
    .map((p) => ({
      tanggal: String(p.date_hotspot ?? "—"),
      sumber: String(p.sumber ?? "Sipongi"),
      desa: String(p.desa ?? "—"),
      kecamatan: String(p.kecamatan ?? "—"),
      kabkota: String(p.kabkota ?? "—"),
      confidence_level: String(p.confidence_level).toLowerCase(),
      occurred_at: p.date_hotspot_ori ?? null,
    }));

  const tone = points.some((p) => p.confidence_level === "high")
    ? "danger"
    : points.length
      ? "warn"
      : "neutral";
  const payload = {
    kind: "sipongi",
    tone,
    empty: points.length === 0,
    points,
    fetched_at: new Date().toISOString(),
    href: SIPONGI_PETA,
    stale: false,
    source: "live",
    example: false,
  };
  const out = path.join(root, "public/fixtures/peringatan-sipongi.json");
  await writeFile(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${out} (${points.length} Aceh medium/high points)`);
}

const sipongiOnly = process.argv.includes("--sipongi-only");

if (sipongiOnly) {
  try {
    await refreshSipongi();
  } catch (err) {
    console.error("Sipongi refresh failed:", err);
    process.exit(1);
  }
} else {
  const results = await Promise.allSettled([refreshMagma(), refreshSipongi()]);
  let failed = 0;
  for (const [i, result] of results.entries()) {
    const name = i === 0 ? "MAGMA" : "Sipongi";
    if (result.status === "fulfilled") continue;
    failed += 1;
    console.error(`${name} refresh failed:`, result.reason);
  }
  if (failed === 2) process.exit(1);
  if (failed === 1) process.exit(0);
}
