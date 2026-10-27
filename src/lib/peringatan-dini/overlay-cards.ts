import type { Feature, Point } from "geojson";
import type { OverlayLiveResult } from "@/lib/overlay-live";
import {
  MAGMA_HOME,
  SIPONGI_PETA,
  unavailableMagmaCard,
  type MagmaCard,
  type PeringatanTone,
  type SipongiCard,
  type SipongiPoint,
} from "@/lib/peringatan-dini-types";
import { magmaTone, normalizeEvent, occurredIso, type MagmaRaw } from "./magma-parse";
import { cardFromStations, emptyTatonasCard } from "@/lib/tatonas/parse";
import {
  TATONAS_STALE_MS,
  type TatonasAlertLevel,
  type TatonasCard,
  type TatonasLoggerKind,
  type TatonasStation,
} from "@/lib/tatonas/types";

function propsOf(feature: Feature<Point>): Record<string, unknown> {
  const props = feature.properties;
  if (props && typeof props === "object" && !Array.isArray(props)) {
    return props as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function pointFeatures(result: OverlayLiveResult): Feature<Point>[] {
  return result.body.features.filter(
    (feature): feature is Feature<Point> => feature?.geometry?.type === "Point",
  );
}

function magmaRawFromFeature(feature: Feature<Point>): MagmaRaw {
  const props = propsOf(feature);
  const [lon, lat] = feature.geometry.coordinates;
  const id = String(feature.id ?? "").replace(/^magma-/, "");
  return {
    id_lap: id || asString(props.id_lap),
    datetime_wib: asString(props.datetime_wib) ?? asString(props.datetime_wib_str),
    datetime_utc: asString(props.datetime_utc),
    magnitude: asNumber(props.magnitude),
    magtype: asString(props.magtype),
    depth: asNumber(props.depth),
    lon_lima: lon,
    lat_lima: lat,
    latlon_text: asString(props.latlon_text),
    area: asString(props.area) ?? asString(props.title),
    koter: asString(props.koter),
    mmi: props.mmi == null || props.mmi === "" ? null : String(props.mmi),
    nearest_volcano: asString(props.nearest_volcano) ?? null,
    merusak: asNumber(props.merusak),
    level: asString(props.level) ?? null,
  };
}

function occurredMs(feature: Feature<Point>): number {
  const props = propsOf(feature);
  const stamped = asString(props.occurred_at);
  if (stamped) {
    const ms = Date.parse(stamped);
    if (Number.isFinite(ms)) return ms;
  }
  const iso = occurredIso(magmaRawFromFeature(feature));
  return iso ? Date.parse(iso) || 0 : 0;
}

function emptyLiveMagmaCard(fetchedAt: string): MagmaCard {
  return {
    kind: "magma",
    tone: "neutral",
    empty: true,
    event: null,
    fetched_at: fetchedAt,
    href: MAGMA_HOME,
    stale: false,
    source: "live",
  };
}

/** Fetch clocks for a MAGMA card. Quake `occurred_at` is not a fetch time. */
export type MagmaOverlayFetchClock = {
  /** Newest `overlay_live_features.updated_at` in this read. */
  rowFetchedAt?: string | null;
  /** `overlay_live_refresh.refreshed_at`: last MAGMA fetch attempt. */
  ledgerFetchedAt?: string | null;
};

function validIso(value: string | null | undefined): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

/**
 * Fresh rows: newest overlay-row `updated_at`, else the ledger attempt, else the request time.
 * Fresh empty: ledger `refreshed_at` (the fetch that cleared the layer), else the request time.
 * Unavailable (`body.stale === true` or HTTP 503): ledger `refreshed_at` when it is a real
 * timestamp, else the request time. The cached row time is an older successful write, so it
 * is not the failed attempt.
 */
export function magmaOverlayFetchedAt(
  result: OverlayLiveResult,
  requestAt: string,
  clock: MagmaOverlayFetchClock = {},
): string {
  const request = validIso(requestAt) ?? requestAt;
  const ledger = validIso(clock.ledgerFetchedAt);
  const row = validIso(clock.rowFetchedAt);
  const unavailable = result.status === 503 || result.body.stale === true;
  if (unavailable) return ledger ?? request;
  if (pointFeatures(result).length > 0) return row ?? ledger ?? request;
  return ledger ?? request;
}

export function magmaCardFromOverlayRead(
  result: OverlayLiveResult,
  fetchedAt: string = new Date().toISOString(),
  clock: MagmaOverlayFetchClock = {},
): MagmaCard {
  const stamp = magmaOverlayFetchedAt(result, fetchedAt, clock);
  if (result.status === 503 || result.body.stale === true) {
    return unavailableMagmaCard(stamp);
  }
  const features = pointFeatures(result);
  if (features.length === 0) return emptyLiveMagmaCard(stamp);
  const latest = [...features].sort((a, b) => occurredMs(b) - occurredMs(a))[0];
  const raw = magmaRawFromFeature(latest);
  const event = normalizeEvent(raw);
  return {
    kind: "magma",
    tone: magmaTone(event, raw),
    empty: false,
    event,
    fetched_at: stamp,
    href: event.href,
    stale: false,
    source: "live",
  };
}

function sipongiTone(points: SipongiPoint[]): PeringatanTone {
  if (points.some((point) => point.confidence_level === "high")) return "siaga";
  if (points.length > 0) return "warn";
  return "neutral";
}

function sipongiPointFromFeature(feature: Feature<Point>): SipongiPoint | null {
  const props = propsOf(feature);
  const level = String(props.confidence_level ?? props.status ?? "").toLowerCase();
  if (level !== "medium" && level !== "high") return null;
  return {
    tanggal: asString(props.tanggal) ?? asString(props.date_hotspot) ?? "—",
    sumber: asString(props.sumber) ?? "Sipongi",
    desa: asString(props.desa) ?? "—",
    kecamatan: asString(props.kecamatan) ?? "—",
    kabkota: asString(props.kabkota) ?? "—",
    confidence_level: level,
    occurred_at: asString(props.occurred_at) ?? asString(props.date_hotspot_ori) ?? null,
  };
}

export function sipongiCardFromOverlayRead(
  result: OverlayLiveResult,
  fetchedAt: string = new Date().toISOString(),
): SipongiCard {
  const base = {
    kind: "sipongi" as const,
    fetched_at: fetchedAt,
    href: SIPONGI_PETA,
  };
  if (result.status === 503) {
    return {
      ...base,
      tone: "neutral",
      empty: true,
      points: [],
      stale: true,
      source: "unavailable",
    };
  }
  const stale = result.body.stale === true;
  const seen = new Set<string>();
  const points = pointFeatures(result)
    .map(sipongiPointFromFeature)
    .filter((point): point is SipongiPoint => point !== null)
    .sort((a, b) => {
      const tb = a.occurred_at ? Date.parse(a.occurred_at) : 0;
      const ta = b.occurred_at ? Date.parse(b.occurred_at) : 0;
      if (ta !== tb) return ta - tb;
      if (a.confidence_level === b.confidence_level) return 0;
      return a.confidence_level === "high" ? -1 : 1;
    })
    .filter((point) => {
      const day = (point.occurred_at ?? point.tanggal).slice(0, 10);
      const key = `${point.desa}|${point.kecamatan}|${point.kabkota}|${day}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
  return {
    ...base,
    tone: sipongiTone(points),
    empty: points.length === 0,
    points,
    stale,
    source: "live",
  };
}

function loggerKindFromProps(props: Record<string, unknown>): TatonasLoggerKind {
  const raw = String(props.logger_kind ?? props.jenis ?? "").toLowerCase();
  if (raw === "wl" || raw === "rf" || raw === "gpa") return raw;
  return "gpa";
}

function levelFromProps(props: Record<string, unknown>): TatonasAlertLevel {
  const raw = String(props.level ?? props.status ?? "").toUpperCase();
  if (raw === "AWAS" || raw === "WASPADA" || raw === "AMAN") return raw;
  return "AMAN";
}

function readingStale(props: Record<string, unknown>, nowMs: number): boolean {
  const occurred = asString(props.occurred_at);
  if (occurred) {
    const ms = Date.parse(occurred);
    if (Number.isFinite(ms)) return nowMs - ms > TATONAS_STALE_MS;
  }
  return props.stale === true;
}

function stationFromFeature(feature: Feature<Point>, nowMs: number): TatonasStation {
  const props = propsOf(feature);
  const [lng, lat] = feature.geometry.coordinates;
  const id = String(feature.id ?? "").replace(/^tatonas-/, "");
  const value = asNumber(props.value) ?? null;
  const sensor = asString(props.sensor) ?? asString(props.nm_logger) ?? "Sensor";
  return {
    uid: asString(props.uid) ?? id,
    kd_hardware: id,
    project: asString(props.project) ?? "Tatonas",
    plant: asString(props.plant) ?? "",
    pos_name: asString(props.pos_name) ?? asString(props.title) ?? `Pos ${id}`,
    logger_kind: loggerKindFromProps(props),
    nm_logger: asString(props.nm_logger) ?? "",
    time_local: asString(props.time_local) ?? null,
    occurred_at: asString(props.occurred_at) ?? null,
    stale: readingStale(props, nowMs),
    condition: asNumber(props.condition) ?? null,
    lat,
    lng,
    primary: {
      kd_sensor: loggerKindFromProps(props) === "wl" ? "waterlevel" : "rainfall",
      nm_sensor: sensor,
      value,
      satuan: asString(props.satuan) ?? "",
      color: null,
    },
    level: levelFromProps(props),
    alert_text: null,
  };
}

export function tatonasCardFromOverlayRead(
  result: OverlayLiveResult,
  fetchedAt: string = new Date().toISOString(),
  nowMs: number = Date.now(),
): TatonasCard {
  if (result.status === 503) {
    return emptyTatonasCard({ source: "unavailable", fetched_at: fetchedAt });
  }
  const stale = result.body.stale === true;
  const features = pointFeatures(result);
  if (features.length === 0) {
    return emptyTatonasCard({ source: "live", stale: false, fetched_at: fetchedAt });
  }
  return cardFromStations(features.map((feature) => stationFromFeature(feature, nowMs)), {
    fetchedAt,
    source: "live",
    stale,
  });
}
