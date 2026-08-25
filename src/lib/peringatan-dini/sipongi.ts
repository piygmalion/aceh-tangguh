import { readFile } from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";
import {
  SIPONGI_OPSROOM,
  SIPONGI_PETA,
  type PeringatanTone,
  type SipongiCard,
  type SipongiPoint,
} from "@/lib/peringatan-dini-types";

const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; Sipongi hotspot Aceh)";

/** Sipongi province id for Aceh (`id_mendagri` 11). */
const ACEH_PROVINSI_ID = "1";
const SATELITS = [
  "NASA-MODIS",
  "NASA-SNPP",
  "NASA-NOAA20",
  "LPN-MODIS",
  "LPN-NPP",
  "LPN-NOAA20",
] as const;

type SipongiProps = {
  date_hotspot?: string;
  date_hotspot_ori?: string;
  sumber?: string;
  desa?: string;
  kecamatan?: string;
  kabkota?: string;
  nama_provinsi?: string;
  provinsi_id?: number;
  confidence_level?: string;
  confidence?: number;
};

type SipongiFeature = {
  type?: string;
  properties?: SipongiProps;
};

type SipongiCollection = {
  type?: string;
  features?: SipongiFeature[];
};

function isMediumOrHigh(level: string | undefined): level is "medium" | "high" {
  return level === "medium" || level === "high";
}

function normalizePoint(props: SipongiProps): SipongiPoint | null {
  const level = (props.confidence_level ?? "").toLowerCase();
  if (!isMediumOrHigh(level)) return null;
  const prov = (props.nama_provinsi ?? "").toLowerCase();
  if (prov && prov !== "aceh") return null;
  if (props.provinsi_id != null && Number(props.provinsi_id) !== 1) return null;

  return {
    tanggal: (props.date_hotspot ?? "").trim() || "—",
    sumber: (props.sumber ?? "Sipongi").trim() || "Sipongi",
    desa: (props.desa ?? "").trim() || "—",
    kecamatan: (props.kecamatan ?? "").trim() || "—",
    kabkota: (props.kabkota ?? "").trim() || "—",
    confidence_level: level,
    occurred_at: props.date_hotspot_ori ?? null,
  };
}

function sipongiTone(points: SipongiPoint[]): PeringatanTone {
  if (points.some((p) => p.confidence_level === "high")) return "danger";
  if (points.length > 0) return "warn";
  return "neutral";
}

function buildQuery(): string {
  const params = new URLSearchParams();
  params.set("wilayah", "IN");
  params.set("filterperiode", "0");
  params.set("late", "24");
  params.set("provinsi", ACEH_PROVINSI_ID);
  params.set("kabkota", "");
  for (const sat of SATELITS) params.append("satelit[]", sat);
  params.append("confidence[]", "medium");
  params.append("confidence[]", "high");
  return params.toString();
}

export async function fetchSipongiLive(): Promise<
  Omit<SipongiCard, "stale" | "source" | "example">
> {
  const url = `${SIPONGI_OPSROOM}/api/opsroom/indoHotspot?${buildQuery()}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": UA,
      Referer: SIPONGI_PETA,
      Origin: "https://sipongi.gakkum.kehutanan.go.id",
    },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Sipongi hotspot ${res.status}`);
  const data = (await res.json()) as SipongiCollection;
  const features = Array.isArray(data.features) ? data.features : [];
  const seen = new Set<string>();
  const points = features
    .map((f) => (f?.properties ? normalizePoint(f.properties) : null))
    .filter((p): p is SipongiPoint => p !== null)
    .sort((a, b) => {
      const tb = a.occurred_at ? Date.parse(a.occurred_at) : 0;
      const ta = b.occurred_at ? Date.parse(b.occurred_at) : 0;
      if (ta !== tb) return ta - tb;
      if (a.confidence_level === b.confidence_level) return 0;
      return a.confidence_level === "high" ? -1 : 1;
    })
    .filter((p) => {
      const day = (p.occurred_at ?? p.tanggal).slice(0, 10);
      const key = `${p.desa}|${p.kecamatan}|${p.kabkota}|${day}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);

  return {
    kind: "sipongi",
    tone: sipongiTone(points),
    empty: points.length === 0,
    points,
    fetched_at: new Date().toISOString(),
    href: SIPONGI_PETA,
  };
}

const getCachedSipongiLive = unstable_cache(
  fetchSipongiLive,
  ["peringatan-sipongi-aceh"],
  { revalidate: 600, tags: ["peringatan-sipongi"] },
);

function isSipongiCard(value: unknown): value is SipongiCard {
  if (!value || typeof value !== "object") return false;
  const rec = value as SipongiCard;
  return rec.kind === "sipongi" && Array.isArray(rec.points);
}

async function loadSipongiFixture(): Promise<SipongiCard> {
  const file = path.join(process.cwd(), "public/fixtures/peringatan-sipongi.json");
  const raw = await readFile(file, "utf8");
  const data: unknown = JSON.parse(raw);
  if (!isSipongiCard(data)) {
    return {
      kind: "sipongi",
      tone: "neutral",
      empty: true,
      points: [],
      fetched_at: new Date().toISOString(),
      href: SIPONGI_PETA,
      stale: true,
      source: "fixture",
      example: true,
    };
  }
  return { ...data, stale: true, source: "fixture" };
}

export async function getSipongiPeringatan(): Promise<SipongiCard> {
  try {
    const live = await getCachedSipongiLive();
    return { ...live, stale: false, source: "live" };
  } catch (err) {
    console.error("[peringatan-dini/sipongi]", err);
    const fixture = await loadSipongiFixture();
    return { ...fixture, stale: true, source: "fixture" };
  }
}
