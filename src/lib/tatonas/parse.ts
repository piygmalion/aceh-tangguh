import { createHmac } from "crypto";
import type { PeringatanTone } from "@/lib/peringatan-dini-types";
import { isAcehTatonasStation } from "./aceh";
import {
  TATONAS_CAMERA_LOGGER,
  TATONAS_HOME,
  TATONAS_STALE_MS,
  type TatonasAlertLevel,
  type TatonasCard,
  type TatonasDtData,
  type TatonasHighlight,
  type TatonasLiveAlert,
  type TatonasLoggerKind,
  type TatonasSensor,
  type TatonasStation,
} from "./types";

const PRIMARY_SENSORS = ["waterlevel", "rainfall", "curahhujan"] as const;
const DEVICE_SENSORS = new Set(["battery", "devicetemp"]);

export function signTatonasPath(path: string, timestamp: number, secret: string): string {
  return createHmac("sha256", secret).update(`${path}${timestamp}`).digest("hex");
}

export function extractDashboardSigningKey(html: string): string | null {
  const match = html.match(/var\s+kode\s*=\s*'([^']+)'/);
  const key = match?.[1]?.trim();
  return key && key.length >= 8 ? key : null;
}

export function parseTatonasLocalTime(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const m = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
  if (!m) {
    const ms = Date.parse(trimmed);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  const ms = Date.parse(`${m[1]}T${m[2]}+07:00`);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function loggerKind(kd: unknown): TatonasLoggerKind | null {
  const n = Number(kd);
  if (n === TATONAS_CAMERA_LOGGER) return null;
  if (n === 1) return "wl";
  if (n === 2) return "rf";
  if (n === 8 || n === 9 || n === 3 || n === 4) return "gpa";
  return "gpa";
}

function colorRank(color: string | null): number {
  const c = (color ?? "").toLowerCase();
  if (c === "merah") return 3;
  if (c === "oranye" || c === "orange") return 2;
  if (c === "kuning") return 1;
  return 0;
}

function sensorColor(value: number | null, steps: unknown, colors: unknown): string | null {
  if (value == null || !Array.isArray(steps) || !Array.isArray(colors)) return null;
  const nums = steps.map((s) => Number(s));
  if (nums.every((n) => !Number.isFinite(n) || n === 0)) return null;
  let idx = -1;
  for (let i = 0; i < nums.length; i += 1) {
    if (Number.isFinite(nums[i]) && value >= nums[i]) idx = i;
  }
  if (idx < 0) return null;
  const color = colors[Math.min(idx, colors.length - 1)];
  return typeof color === "string" ? color.toLowerCase() : null;
}

function parseSensor(raw: unknown): TatonasSensor | null {
  const row = asRecord(raw);
  if (!row) return null;
  const rel = asRecord(row.rel_sensor) ?? {};
  const kd = String(rel.kd_sensor ?? row.kd_sensor ?? "").trim();
  if (!kd) return null;
  const value = asFiniteNumber(row.value);
  return {
    kd_sensor: kd,
    nm_sensor: String(rel.nm_sensor ?? kd).trim() || kd,
    value,
    satuan: String(rel.satuan ?? "").trim(),
    color: sensorColor(value, row.val_step, row.color_step),
  };
}

function pickPrimary(sensors: TatonasSensor[], _kind: TatonasLoggerKind): TatonasSensor | null {
  for (const id of PRIMARY_SENSORS) {
    const hit = sensors.find((s) => s.kd_sensor === id);
    if (hit) return hit;
  }
  const nonDevice = sensors.find((s) => !DEVICE_SENSORS.has(s.kd_sensor));
  if (nonDevice) return nonDevice;
  return sensors[0] ?? null;
}

function levelFromColor(color: string | null, alert?: string | null): TatonasAlertLevel {
  const a = (alert ?? "").toUpperCase();
  if (a.includes("AWAS") && !a.includes("WASPADA")) return "AWAS";
  if (a.includes("WASPADA")) return "WASPADA";
  if (a.includes("AWAS")) return "AWAS";
  const rank = colorRank(color);
  if (rank >= 3) return "AWAS";
  if (rank >= 1) return "WASPADA";
  return "AMAN";
}

function alertForHardware(
  kdHardware: string,
  alerts: TatonasLiveAlert[],
): TatonasLiveAlert | undefined {
  return alerts.find((a) => String(a.device ?? "").trim() === kdHardware);
}

export function parseTatonasStations(
  data: TatonasDtData,
  nowMs = Date.now(),
): TatonasStation[] {
  const plants = data.plantData && typeof data.plantData === "object" ? data.plantData : {};
  const alerts = Array.isArray(data.liveAlertData) ? data.liveAlertData : [];
  const out: TatonasStation[] = [];

  for (const [plantId, plantRaw] of Object.entries(plants)) {
    const plant = asRecord(plantRaw);
    if (!plant) continue;
    const project = String(plant.favicon ?? plant.category ?? "").trim();
    const hardwareRaw = plant.hardware;
    const hardwareList = Array.isArray(hardwareRaw) ? hardwareRaw : [];

    for (const item of hardwareList) {
      const hw = asRecord(item);
      if (!hw || hw.kd_hardware == null) continue;
      const kind = loggerKind(hw.kd_logger);
      if (!kind) continue;

      const lat = asFiniteNumber(hw.latitude);
      const lng = asFiniteNumber(hw.longitude);
      const posName = String(hw.pos_name ?? "").trim();
      if (!isAcehTatonasStation({ project, posName, lat, lng })) continue;

      const sensors = (Array.isArray(hw.sensor) ? hw.sensor : [])
        .map(parseSensor)
        .filter((s): s is TatonasSensor => s !== null);
      const primary = pickPrimary(sensors, kind);
      const kdHardware = String(hw.kd_hardware).trim();
      const alert = alertForHardware(kdHardware, alerts);
      const occurredAt = parseTatonasLocalTime(
        typeof hw.tlocal === "string" ? hw.tlocal : null,
      );
      const occurredMs = occurredAt ? Date.parse(occurredAt) : NaN;
      const stale = !Number.isFinite(occurredMs) || nowMs - occurredMs > TATONAS_STALE_MS;

      out.push({
        uid: String(hw.uid ?? kdHardware).trim() || kdHardware,
        kd_hardware: kdHardware,
        project: project || "Tatonas",
        plant: String(plant.plant ?? plantId),
        pos_name: posName || `Pos ${kdHardware}`,
        logger_kind: kind,
        nm_logger: String(hw.nm_logger ?? "").trim(),
        time_local: typeof hw.tlocal === "string" ? hw.tlocal : null,
        occurred_at: occurredAt,
        stale,
        condition: asFiniteNumber(hw.condition),
        lat,
        lng,
        primary,
        level: levelFromColor(primary?.color ?? null, alert?.level),
        alert_text: alert?.description ?? alert?.title ?? null,
      });
    }
  }

  return out;
}

function severity(station: TatonasStation): number {
  if (station.level === "AWAS") return 30;
  if (station.level === "WASPADA") return 20;
  if (station.primary?.kd_sensor === "waterlevel") return 12;
  if (
    station.primary &&
    PRIMARY_SENSORS.includes(station.primary.kd_sensor as (typeof PRIMARY_SENSORS)[number])
  ) {
    return 10;
  }
  return 0;
}

function toHighlight(station: TatonasStation): TatonasHighlight {
  return {
    uid: station.uid,
    pos_name: station.pos_name,
    project: station.project,
    logger_kind: station.logger_kind,
    sensor: station.primary?.nm_sensor ?? (station.nm_logger || "Sensor"),
    value: station.primary?.value ?? null,
    satuan: station.primary?.satuan ?? "",
    level: station.level,
    time_local: station.time_local,
  };
}

export function emptyTatonasCard(
  partial: Partial<TatonasCard> = {},
): TatonasCard {
  return {
    kind: "tatonas",
    tone: "neutral",
    empty: true,
    highlights: [],
    extra_count: 0,
    station_count: 0,
    fetched_at: new Date().toISOString(),
    href: TATONAS_HOME,
    stale: true,
    source: "unavailable",
    ...partial,
  };
}

export function cardFromStations(
  stations: TatonasStation[],
  opts: { fetchedAt?: string; source?: TatonasCard["source"]; stale?: boolean } = {},
): TatonasCard {
  const fetchedAt = opts.fetchedAt ?? new Date().toISOString();
  const sorted = [...stations].sort((a, b) => {
    const sev = severity(b) - severity(a);
    if (sev !== 0) return sev;
    const tb = a.occurred_at ? Date.parse(a.occurred_at) : 0;
    const ta = b.occurred_at ? Date.parse(b.occurred_at) : 0;
    return ta - tb;
  });
  const fresh = sorted.filter((s) => !s.stale);
  const allStale = stations.length === 0 || fresh.length === 0;
  const pool = allStale ? sorted : fresh;
  const highlights = pool.slice(0, 3).map(toHighlight);
  const toneFrom = allStale ? [] : fresh;
  let tone: PeringatanTone = "neutral";
  if (toneFrom.some((s) => s.level === "AWAS")) tone = "danger";
  else if (toneFrom.some((s) => s.level === "WASPADA")) tone = "warn";

  return {
    kind: "tatonas",
    tone,
    empty: stations.length === 0,
    highlights,
    extra_count: Math.max(0, pool.length - highlights.length),
    station_count: stations.length,
    fetched_at: fetchedAt,
    href: TATONAS_HOME,
    stale: opts.stale ?? allStale,
    source: opts.source ?? "live",
  };
}
