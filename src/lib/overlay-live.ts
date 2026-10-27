import { readFile } from "fs/promises";
import path from "path";
import type { Feature, FeatureCollection, Point } from "geojson";
import { isAcehRelevant, isInsideAcehBbox } from "@/lib/peringatan-dini/aceh";
import { fetchMagmaQuakeRaws } from "@/lib/peringatan-dini/magma-live";
import { occurredIso, type MagmaRaw } from "@/lib/peringatan-dini/magma-parse";
import { SIPONGI_OPSROOM, SIPONGI_PETA, magmaUnavailableReason } from "@/lib/peringatan-dini-types";
import { fetchTatonasDtData } from "@/lib/tatonas/client";
import { parseTatonasStations } from "@/lib/tatonas/parse";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import type { OverlayLayerKey } from "@/lib/overlay-layers";
import type { Database, Json } from "@/lib/supabase/types";
import { shouldSyncCalonAfterRefresh, syncCalonDariOverlay } from "@/lib/overlay-calon";

const UA = "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; overlay-live)";

const BMKG_TEWS = {
  terkini: "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json",
  dirasakan: "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json",
  auto: "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json",
} as const;

type LiveSource = Database["public"]["Tables"]["overlay_live_features"]["Row"]["source"];

const EMPTY: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };

/** Public overlay body. Empty + no `stale` means a live fetch succeeded with zero Aceh features. */
export type OverlayLiveBody = FeatureCollection<Point> & {
  stale?: boolean;
  error?: "upstream";
};

export type OverlayLiveResult = {
  status: 200 | 503;
  body: OverlayLiveBody;
};

export const OVERLAY_UPSTREAM_FAILURE_BODY: OverlayLiveBody = {
  type: "FeatureCollection",
  features: [],
  stale: true,
  error: "upstream",
};

/** Live layers filled by cron only. Fixtures stay on disk. */
export const OVERLAY_LIVE_REFRESH_KEYS = [
  "bmkgQuakes",
  "magmaQuakes",
  "magmaVolcanoes",
  "sipongiHotspots",
  "tatonasStations",
] as const;

export type OverlayLiveRefreshKey = (typeof OVERLAY_LIVE_REFRESH_KEYS)[number];

/** Same window as weather cron `expires_at` (`src/app/api/weather/refresh/route.ts`). */
export const OVERLAY_WEATHER_LIKE_TTL_MS = 2 * 60 * 60 * 1000;

export function isOverlayLiveRefreshKey(key: OverlayLayerKey): key is OverlayLiveRefreshKey {
  return (OVERLAY_LIVE_REFRESH_KEYS as readonly string[]).includes(key);
}

/** Ledger / row `expires_at` for live overlays. Per-station Tatonas readings still use `TATONAS_STALE_MS`. */
export function overlayLiveTtlMs(_key: OverlayLiveRefreshKey): number {
  return OVERLAY_WEATHER_LIKE_TTL_MS;
}

export function overlayLiveExpiresAt(key: OverlayLiveRefreshKey, nowMs: number): string {
  return new Date(nowMs + overlayLiveTtlMs(key)).toISOString();
}

export type OverlayLiveWritePlan =
  | { action: "clear"; layer: OverlayLiveRefreshKey }
  | { action: "replace"; layer: OverlayLiveRefreshKey; ids: string[]; expiresAt: string };

/** Empty upstream success clears the layer so old quakes/hotspots cannot pile up. */
export function planOverlayLiveWrite(
  layer: OverlayLiveRefreshKey,
  features: Feature<Point>[],
  nowMs: number,
): OverlayLiveWritePlan {
  if (features.length === 0) return { action: "clear", layer };
  return {
    action: "replace",
    layer,
    ids: features.map((f) => String(f.id ?? "")),
    expiresAt: overlayLiveExpiresAt(layer, nowMs),
  };
}

export function overlayLiveOk(features: Feature<Point>[]): OverlayLiveResult {
  return { status: 200, body: { type: "FeatureCollection", features } };
}

export type OverlayLiveStoredRow = {
  expires_at: string | null;
  feature: Feature<Point>;
};

/** Cast row from overlay_live_refresh. Table is not in generated types.ts. */
export type OverlayLiveRefreshLedger = {
  ok: boolean;
  feature_count: number;
  error?: string | null;
};

function hasStoredLiveRows(rows: OverlayLiveStoredRow[] | null): rows is OverlayLiveStoredRow[] {
  return Boolean(rows && rows.length > 0);
}

function resolveOverlayLiveExpires(
  rows: OverlayLiveStoredRow[],
  nowMs: number,
): OverlayLiveResult {
  const features = rows.map((row) => row.feature);
  const fresh = rows.some((row) => {
    if (!row.expires_at) return false;
    const ms = Date.parse(row.expires_at);
    return Number.isFinite(ms) && ms > nowMs;
  });
  if (fresh) return overlayLiveOk(features);
  return {
    status: 200,
    body: { type: "FeatureCollection", features, stale: true },
  };
}

/**
 * GET-only mapping. `ledger` defaults to null so older callers
 * (`resolveOverlayLiveRead(rows, nowMs)` / empty rows) stay 503.
 *
 * ledger null + empty → 503; ledger null + rows → expires_at.
 * ok false + empty → 503; ok false + rows → 200 stale (cached failure).
 * ok + feature_count 0 + empty → 200 empty (legitimate quiet).
 * ok + feature_count 0 + rows → expires_at (do not force-empty).
 * ok + feature_count > 0 + empty → 503; ok + feature_count > 0 + rows → expires_at.
 */
export function resolveOverlayLiveRead(
  rows: OverlayLiveStoredRow[] | null,
  nowMs: number = Date.now(),
  ledger: OverlayLiveRefreshLedger | null = null,
): OverlayLiveResult {
  const present = hasStoredLiveRows(rows);

  if (ledger == null) {
    if (!present) return resolveOverlayLiveFailure(null);
    return resolveOverlayLiveExpires(rows, nowMs);
  }

  if (ledger.ok === false) {
    if (!present) return resolveOverlayLiveFailure(null);
    return resolveOverlayLiveFailure(rows.map((row) => row.feature));
  }

  if (ledger.feature_count === 0) {
    if (!present) return overlayLiveOk([]);
    return resolveOverlayLiveExpires(rows, nowMs);
  }

  if (!present) return resolveOverlayLiveFailure(null);
  return resolveOverlayLiveExpires(rows, nowMs);
}

/** Live fetch failed. Cached rows (even old) are 200 stale; no rows → 503 upstream. */
export function resolveOverlayLiveFailure(
  cachedFeatures: Feature<Point>[] | null,
): OverlayLiveResult {
  if (cachedFeatures && cachedFeatures.length > 0) {
    return {
      status: 200,
      body: { type: "FeatureCollection", features: cachedFeatures, stale: true },
    };
  }
  return { status: 503, body: { ...OVERLAY_UPSTREAM_FAILURE_BODY } };
}

function asIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function pointFeature(opts: {
  id: string;
  lon: number;
  lat: number;
  layer: OverlayLayerKey;
  title: string;
  status?: string;
  extra?: Record<string, unknown>;
}): Feature<Point> {
  return {
    type: "Feature",
    id: opts.id,
    geometry: { type: "Point", coordinates: [opts.lon, opts.lat] },
    properties: {
      layer: opts.layer,
      title: opts.title,
      status: opts.status ?? "",
      ...opts.extra,
    },
  };
}

function parseBmkgCoord(row: Record<string, unknown>): { lon: number; lat: number } | null {
  const raw = String(row.Coordinates ?? row.coordinates ?? "");
  const parts = raw.split(",").map((s) => Number(s.trim()));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return { lat: parts[0], lon: parts[1] };
  }
  const lat = Number(row.Lintang ?? row.lintang);
  const lon = Number(row.Bujur ?? row.bujur);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  return null;
}

function asGempaList(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const infogempa = (payload as { Infogempa?: { gempa?: unknown } }).Infogempa;
  const gempa = infogempa?.gempa;
  if (Array.isArray(gempa)) return gempa as Record<string, unknown>[];
  if (gempa && typeof gempa === "object") return [gempa as Record<string, unknown>];
  return [];
}

async function fetchBmkgTews(): Promise<Feature<Point>[]> {
  const texts = await Promise.all(
    Object.values(BMKG_TEWS).map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json", "User-Agent": UA },
          signal: AbortSignal.timeout(15_000),
          cache: "no-store",
        });
        if (!res.ok) return { ok: false as const, rows: [] as Record<string, unknown>[] };
        return { ok: true as const, rows: asGempaList(await res.json()) };
      } catch {
        return { ok: false as const, rows: [] as Record<string, unknown>[] };
      }
    }),
  );
  if (texts.every((entry) => !entry.ok)) {
    throw new Error("BMKG TEWS unreachable");
  }
  const seen = new Set<string>();
  const out: Feature<Point>[] = [];
  for (const row of texts.flatMap((entry) => entry.rows)) {
    const coord = parseBmkgCoord(row);
    if (!coord) continue;
    const wilayah = String(row.Wilayah ?? row.wilayah ?? "");
    if (
      !isAcehRelevant({
        lon: coord.lon,
        lat: coord.lat,
        texts: [wilayah, String(row.Dirasakan ?? "")],
      })
    ) {
      continue;
    }
    const id = String(row.DateTime ?? row.Tanggal ?? `${coord.lon},${coord.lat}`);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(
      pointFeature({
        id: `bmkg-${id}`,
        lon: coord.lon,
        lat: coord.lat,
        layer: "bmkgQuakes",
        title: wilayah || "Gempa BMKG",
        status: String(row.Magnitude ?? row.magnitude ?? ""),
        extra: {
          magnitude: row.Magnitude,
          kedalaman: row.Kedalaman,
          potensi: row.Potensi,
          waktu: row.DateTime ?? row.Jam,
          href: "https://www.bmkg.go.id/",
        },
      }),
    );
  }
  return out;
}

function magmaToPoint(raw: MagmaRaw, layer: OverlayLayerKey): Feature<Point> | null {
  const lon = raw.lon_lima;
  const lat = raw.lat_lima;
  if (typeof lon !== "number" || typeof lat !== "number") return null;
  if (
    !isAcehRelevant({
      lon,
      lat,
      texts: [raw.area, raw.koter, raw.nearest_volcano],
    })
  ) {
    return null;
  }
  const id = String(raw.id_lap || raw.no || `${lon},${lat}`);
  return pointFeature({
    id: `magma-${id}`,
    lon,
    lat,
    layer,
    title: (raw.area || raw.koter || "Gempa MAGMA").trim(),
    status: raw.magnitude != null ? `${raw.magnitude} ${raw.magtype || "SR"}` : "",
    extra: {
      magnitude: raw.magnitude,
      depth: raw.depth,
      nearest_volcano: raw.nearest_volcano,
      href: "https://magma.esdm.go.id/",
      datetime_wib: raw.datetime_wib || raw.datetime_wib_str,
      datetime_utc: raw.datetime_utc,
      area: raw.area,
      koter: raw.koter,
      mmi: raw.mmi,
      merusak: raw.merusak,
      magtype: raw.magtype,
      latlon_text: raw.latlon_text,
      level: raw.level ?? null,
      occurred_at: occurredIso(raw),
    },
  });
}

function extractNamedArray(html: string, varName: string): MagmaRaw[] {
  const start = html.indexOf(`var ${varName} = `);
  if (start < 0) return [];
  const bracket = html.indexOf("[", start);
  if (bracket < 0) return [];
  let depth = 0;
  for (let i = bracket; i < html.length; i += 1) {
    const ch = html[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed: unknown = JSON.parse(html.slice(bracket, i + 1));
          return Array.isArray(parsed) ? (parsed as MagmaRaw[]) : [];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

async function fetchMagmaHtml(): Promise<string> {
  const res = await fetch("https://magma.esdm.go.id/", {
    headers: { Accept: "text/html", "User-Agent": UA },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`MAGMA ${res.status}`);
  return res.text();
}

async function fetchMagmaQuakes(): Promise<Feature<Point>[]> {
  const raws = await fetchMagmaQuakeRaws();
  return raws
    .map((raw) => magmaToPoint(raw, "magmaQuakes"))
    .filter((f): f is Feature<Point> => f !== null);
}

async function fetchMagmaVolcanoes(): Promise<Feature<Point>[]> {
  const html = await fetchMagmaHtml();
  const list = [
    ...extractNamedArray(html, "markersGunung"),
    ...extractNamedArray(html, "markersGunungApi"),
    ...extractNamedArray(html, "markersVolcano"),
  ];
  const seen = new Set<string>();
  const out: Feature<Point>[] = [];
  for (const raw of list) {
    const f = magmaToPoint(raw, "magmaVolcanoes");
    if (!f) continue;
    const id = String(f.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(f);
  }
  return out;
}

async function fetchSipongiPoints(): Promise<Feature<Point>[]> {
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
  const url = `${SIPONGI_OPSROOM}/api/opsroom/indoHotspot?${params.toString()}`;
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
  if (!res.ok) throw new Error(`Sipongi ${res.status}`);
  const data = (await res.json()) as FeatureCollection;
  const out: Feature<Point>[] = [];
  for (const f of data.features ?? []) {
    if (f.geometry?.type !== "Point") continue;
    const coords = f.geometry.coordinates;
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const level = String(props.confidence_level ?? "").toLowerCase();
    if (level !== "medium" && level !== "high") continue;
    const prov = String(props.nama_provinsi ?? "").toLowerCase();
    if (prov && prov !== "aceh") continue;
    if (!isInsideAcehBbox(lon, lat) && prov !== "aceh") continue;
    out.push(
      pointFeature({
        id: `sipongi-${lon},${lat}-${String(props.date_hotspot_ori ?? props.date_hotspot ?? "")}`,
        lon,
        lat,
        layer: "sipongiHotspots",
        title: [props.desa, props.kecamatan, props.kabkota].filter(Boolean).join(", ") || "Hotspot",
        status: level,
        extra: {
          tanggal: props.date_hotspot,
          sumber: props.sumber,
          href: SIPONGI_PETA,
          desa: props.desa,
          kecamatan: props.kecamatan,
          kabkota: props.kabkota,
          confidence_level: level,
          date_hotspot_ori: props.date_hotspot_ori,
          occurred_at: props.date_hotspot_ori,
        },
      }),
    );
  }
  return out;
}

async function loadFixturePoints(file: string, layer: OverlayLayerKey): Promise<Feature<Point>[]> {
  try {
    const raw = await readFile(path.join(process.cwd(), file), "utf8");
    const fc = JSON.parse(raw) as FeatureCollection;
    return (fc.features ?? []).filter(
      (f): f is Feature<Point> => f.geometry?.type === "Point",
    ).map((f) => ({
      ...f,
      properties: { ...f.properties, layer },
    }));
  } catch {
    return [];
  }
}

function liveSource(key: OverlayLiveRefreshKey): LiveSource {
  if (key === "bmkgQuakes") return "bmkg";
  if (key === "sipongiHotspots") return "sipongi";
  if (key === "tatonasStations") return "tatonas";
  return "magma";
}

async function fetchTatonasPoints(): Promise<Feature<Point>[]> {
  const payload = await fetchTatonasDtData();
  return parseTatonasStations(payload)
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) =>
      pointFeature({
        id: `tatonas-${s.kd_hardware}`,
        lon: s.lng as number,
        lat: s.lat as number,
        layer: "tatonasStations",
        title: s.pos_name,
        status: s.level,
        extra: {
          pos_name: s.pos_name,
          jenis: s.logger_kind.toUpperCase(),
          logger_kind: s.logger_kind,
          sensor: s.primary?.nm_sensor,
          value: s.primary?.value ?? undefined,
          satuan: s.primary?.satuan || undefined,
          level: s.level,
          project: s.project,
          source: "tatonas",
          time_local: s.time_local ?? undefined,
          stale: s.stale,
          occurred_at: s.occurred_at,
        },
      }),
    );
}

async function fetchLiveFeatures(key: OverlayLiveRefreshKey): Promise<Feature<Point>[]> {
  if (key === "bmkgQuakes") return fetchBmkgTews();
  if (key === "magmaQuakes") return fetchMagmaQuakes();
  if (key === "magmaVolcanoes") return fetchMagmaVolcanoes();
  if (key === "sipongiHotspots") return fetchSipongiPoints();
  return fetchTatonasPoints();
}

type OverlayLiveInsert = {
  id: string;
  layer_key: OverlayLayerKey;
  source: LiveSource;
  external_id: string;
  longitude: number;
  latitude: number;
  occurred_at: string | null;
  properties: Json;
  updated_at: string;
  expires_at: string;
};

async function persistLive(
  source: LiveSource,
  layer: OverlayLiveRefreshKey,
  features: Feature<Point>[],
  nowMs: number = Date.now(),
): Promise<boolean> {
  const client = createServiceClient();
  if (!client) return false;

  const plan = planOverlayLiveWrite(layer, features, nowMs);
  if (plan.action === "clear") {
    const { error } = await client.from("overlay_live_features").delete().eq("layer_key", layer);
    if (error) {
      console.error("[overlay-live/clear]", layer, error.message);
      return false;
    }
    return true;
  }

  const expiresAt = plan.expiresAt;
  const rows: OverlayLiveInsert[] = features.map((f) => {
    const [lon, lat] = f.geometry.coordinates;
    const id = String(f.id ?? `${source}-${lon},${lat}`);
    return {
      id,
      layer_key: layer,
      source,
      external_id: id,
      longitude: lon,
      latitude: lat,
      occurred_at: asIso(f.properties?.occurred_at ?? f.properties?.waktu),
      properties: (f.properties ?? {}) as Json,
      updated_at: new Date(nowMs).toISOString(),
      expires_at: expiresAt,
    };
  });
  const { error } = await client
    .from("overlay_live_features")
    .upsert(rows as never, { onConflict: "source,external_id" });
  if (error) {
    console.error("[overlay-live/upsert]", layer, error.message);
    return false;
  }

  const keep = new Set(rows.map((row) => row.id));
  const { data: existing, error: listError } = await client
    .from("overlay_live_features")
    .select("id")
    .eq("layer_key", layer);
  if (listError) {
    console.error("[overlay-live/list]", layer, listError.message);
    return true;
  }
  const staleIds = (existing ?? []).map((row) => row.id).filter((id) => !keep.has(id));
  if (staleIds.length === 0) return true;
  const { error: pruneError } = await client.from("overlay_live_features").delete().in("id", staleIds);
  if (pruneError) console.error("[overlay-live/prune]", layer, pruneError.message);
  return true;
}

type LiveCacheRow = {
  id: string;
  longitude: number;
  latitude: number;
  properties: Json;
  occurred_at: string | null;
  expires_at: string | null;
};

async function readStoredLive(layer: OverlayLayerKey): Promise<OverlayLiveStoredRow[] | null> {
  const client = createServerClient();
  if (!client) return null;
  const result = await client
    .from("overlay_live_features")
    .select("id, longitude, latitude, properties, occurred_at, expires_at")
    .eq("layer_key", layer);
  if (result.error) return null;
  const data = (result.data ?? []) as unknown as LiveCacheRow[];
  if (!data.length) return [];
  return data.map((row) => {
    const props =
      row.properties && typeof row.properties === "object" && !Array.isArray(row.properties)
        ? (row.properties as Record<string, unknown>)
        : {};
    return {
      expires_at: row.expires_at,
      feature: pointFeature({
        id: row.id,
        lon: row.longitude,
        lat: row.latitude,
        layer,
        title: typeof props.title === "string" ? props.title : layer,
        status: typeof props.status === "string" ? props.status : "",
        extra: { ...props, occurred_at: row.occurred_at ?? props.occurred_at },
      }),
    };
  });
}

export type OverlayLiveRefreshResult = {
  key: OverlayLiveRefreshKey;
  ok: boolean;
  count: number;
  expires_at: string | null;
  error?: string;
};

type OverlayLiveRefreshWrite = {
  layer_key: OverlayLiveRefreshKey;
  refreshed_at: string;
  ok: boolean;
  feature_count: number;
  error: string | null;
};

type OverlayLiveRefreshClient = {
  from(table: "overlay_live_refresh"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
    upsert(
      values: OverlayLiveRefreshWrite,
      opts: { onConflict: string },
    ): Promise<{ error: { message: string } | null }>;
  };
};

function overlayLiveRefreshFrom(
  client: NonNullable<ReturnType<typeof createServerClient>>,
) {
  return (client as unknown as OverlayLiveRefreshClient).from("overlay_live_refresh");
}

function asRefreshLedger(value: unknown): OverlayLiveRefreshLedger | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { ok?: unknown; feature_count?: unknown; error?: unknown };
  if (typeof row.ok !== "boolean") return null;
  if (
    typeof row.feature_count !== "number" ||
    !Number.isFinite(row.feature_count) ||
    row.feature_count < 0
  ) {
    return null;
  }
  const error = typeof row.error === "string" || row.error === null ? row.error : null;
  return { ok: row.ok, feature_count: row.feature_count, error };
}

async function readStoredRefresh(
  layer: OverlayLiveRefreshKey,
): Promise<OverlayLiveRefreshLedger | null> {
  const client = createServerClient();
  if (!client) return null;
  const result = await overlayLiveRefreshFrom(client)
    .select("ok, feature_count, error")
    .eq("layer_key", layer)
    .maybeSingle();
  if (result.error) return null;
  return asRefreshLedger(result.data);
}

async function countStoredLive(layer: OverlayLiveRefreshKey): Promise<number> {
  const client = createServiceClient();
  if (!client) return 0;
  const { count, error } = await client
    .from("overlay_live_features")
    .select("id", { count: "exact", head: true })
    .eq("layer_key", layer);
  if (error || count == null) return 0;
  return count;
}

async function writeOverlayLiveRefresh(row: OverlayLiveRefreshWrite): Promise<boolean> {
  const client = createServiceClient();
  if (!client) return false;
  const { error } = await overlayLiveRefreshFrom(client).upsert(row, {
    onConflict: "layer_key",
  });
  if (error) {
    console.error("[overlay-live/refresh-ledger]", row.layer_key, error.message);
    return false;
  }
  return true;
}

export async function refreshOverlayLive(
  key: OverlayLiveRefreshKey,
  nowMs: number = Date.now(),
): Promise<OverlayLiveRefreshResult> {
  const refreshedAt = new Date(nowMs).toISOString();
  try {
    const features = await fetchLiveFeatures(key);
    const persisted = await persistLive(liveSource(key), key, features, nowMs);
    if (shouldSyncCalonAfterRefresh(key, persisted, true)) {
      try {
        await syncCalonDariOverlay(key);
      } catch (syncErr) {
        console.error("[overlay-live/calon]", key, syncErr);
      }
    }
    if (!persisted) {
      const remaining = await countStoredLive(key);
      await writeOverlayLiveRefresh({
        layer_key: key,
        refreshed_at: refreshedAt,
        ok: false,
        feature_count: remaining,
        error: "persist failed",
      });
      return {
        key,
        ok: false,
        count: remaining,
        expires_at: null,
        error: "persist failed",
      };
    }
    const ledgerOk = await writeOverlayLiveRefresh({
      layer_key: key,
      refreshed_at: refreshedAt,
      ok: true,
      feature_count: features.length,
      error: null,
    });
    return {
      key,
      ok: ledgerOk,
      count: features.length,
      expires_at: features.length > 0 ? overlayLiveExpiresAt(key, nowMs) : null,
      error: ledgerOk ? undefined : "ledger write failed",
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const message = key === "magmaQuakes" ? (magmaUnavailableReason(raw) ?? null) : raw;
    if (key === "magmaQuakes") {
      console.error(
        "[overlay-live/refresh]",
        key,
        message ?? (err instanceof Error ? err.name : "unavailable"),
      );
    } else {
      console.error("[overlay-live/refresh]", key, err);
    }
    const remaining = await countStoredLive(key);
    await writeOverlayLiveRefresh({
      layer_key: key,
      refreshed_at: refreshedAt,
      ok: false,
      feature_count: remaining,
      error: message,
    });
    return {
      key,
      ok: false,
      count: remaining,
      expires_at: null,
      error: message ?? undefined,
    };
  }
}

async function purgeExpiredOverlayRows(): Promise<number | null> {
  const client = createServiceClient();
  if (!client) return null;
  type PurgeClient = {
    rpc(fn: "purge_expired_overlay_rows"): Promise<{
      data: number | null;
      error: { message: string } | null;
    }>;
  };
  const { data, error } = await (client as unknown as PurgeClient).rpc("purge_expired_overlay_rows");
  if (error) {
    console.error("[overlay-live/purge]", error.message);
    return null;
  }
  return data;
}

export async function refreshAllOverlayLive(
  nowMs: number = Date.now(),
): Promise<{
  layers: OverlayLiveRefreshResult[];
  purged: number | null;
}> {
  const layers: OverlayLiveRefreshResult[] = [];
  for (const key of OVERLAY_LIVE_REFRESH_KEYS) {
    layers.push(await refreshOverlayLive(key, nowMs));
  }
  return { layers, purged: await purgeExpiredOverlayRows() };
}

export type OverlayLivePdSelect =
  | { kind: "select-impossible" }
  | { kind: "ok"; result: OverlayLiveResult; refreshError: string | null };

/**
 * GET PD read. Distinguishes "no Supabase / SELECT threw" from AN-5 503-equivalent
 * (DB alive, no rows, not empty-ok). Overlay HTTP status is not copied to the PD route.
 */
export async function readOverlayLiveForPd(
  key: OverlayLiveRefreshKey,
): Promise<OverlayLivePdSelect> {
  try {
    const client = createServerClient();
    if (!client) return { kind: "select-impossible" };
    const rows = await readStoredLive(key);
    if (rows === null) return { kind: "select-impossible" };
    const ledger = await readStoredRefresh(key);
    return {
      kind: "ok",
      result: resolveOverlayLiveRead(rows, Date.now(), ledger),
      refreshError: ledger?.error ?? null,
    };
  } catch {
    return { kind: "select-impossible" };
  }
}

export async function loadOverlayLive(key: OverlayLayerKey): Promise<OverlayLiveResult> {
  if (key === "seismicSensors") {
    return overlayLiveOk(
      await loadFixturePoints(
        "public/fixtures/overlays/sensor-seismic-aceh.geojson",
        "seismicSensors",
      ),
    );
  }
  if (key === "maritimePorts") {
    return overlayLiveOk(
      await loadFixturePoints(
        "public/fixtures/overlays/pelabuhan-aceh.geojson",
        "maritimePorts",
      ),
    );
  }

  if (!isOverlayLiveRefreshKey(key)) {
    return overlayLiveOk(EMPTY.features);
  }

  const rows = await readStoredLive(key);
  const ledger = await readStoredRefresh(key);
  return resolveOverlayLiveRead(rows, Date.now(), ledger);
}

export async function loadOverlayVector(key: OverlayLayerKey): Promise<FeatureCollection | null> {
  const files: Partial<Record<OverlayLayerKey, string>> = {
    inariskSumateraFault: "public/fixtures/overlays/sumatera-fault-aceh.geojson",
    inariskMegathrust: "public/fixtures/overlays/megathrust-aceh.geojson",
    inariskBahayaGempa: "public/fixtures/overlays/bahaya-gempa-aceh.geojson",
    inariskBahayaTsunami: "public/fixtures/overlays/bahaya-tsunami-aceh.geojson",
    inariskBahayaLongsor: "public/fixtures/overlays/bahaya-longsor-aceh.geojson",
    inariskBahayaBanjir: "public/fixtures/overlays/bahaya-banjir-aceh.geojson",
    inariskBahayaKarhutla: "public/fixtures/overlays/bahaya-karhutla-aceh.geojson",
    inariskBahayaGunungApi: "public/fixtures/overlays/bahaya-gunungapi-aceh.geojson",
    maritimeWaters: "public/fixtures/overlays/perairan-aceh.geojson",
    seismicSensors: "public/fixtures/overlays/sensor-seismic-aceh.geojson",
    maritimePorts: "public/fixtures/overlays/pelabuhan-aceh.geojson",
  };
  const file = files[key];
  if (!file) return null;
  const raw = await readFile(path.join(process.cwd(), file), "utf8");
  return JSON.parse(raw) as FeatureCollection;
}
