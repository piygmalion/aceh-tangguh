import type { PeringatanSource, PeringatanTone } from "@/lib/peringatan-dini-types";

export const TATONAS_HOME = "https://tatonas.co.id/monitoring/";
export const TATONAS_ORIGIN = "https://tatonas.co.id";
export const TATONAS_DT_DATA_PATH = "/api/dt_data?p=002&fp=all_plant&fl=all_logger";
export const TATONAS_SERVER_TIME_PATH = "/api/server-time";

/** Camera loggers are out of scope for the public SIK overlay. */
export const TATONAS_CAMERA_LOGGER = 5;

export const TATONAS_STALE_MS = 15 * 60 * 1000;

export type TatonasLoggerKind = "wl" | "rf" | "gpa";

export type TatonasAlertLevel = "AWAS" | "WASPADA" | "AMAN";

export type TatonasSensor = {
  kd_sensor: string;
  nm_sensor: string;
  value: number | null;
  satuan: string;
  color: string | null;
};

export type TatonasStation = {
  uid: string;
  kd_hardware: string;
  project: string;
  plant: string;
  pos_name: string;
  logger_kind: TatonasLoggerKind;
  nm_logger: string;
  time_local: string | null;
  occurred_at: string | null;
  stale: boolean;
  condition: number | null;
  lat: number | null;
  lng: number | null;
  primary: TatonasSensor | null;
  level: TatonasAlertLevel;
  alert_text: string | null;
};

export type TatonasHighlight = {
  uid: string;
  pos_name: string;
  project: string;
  logger_kind: TatonasLoggerKind;
  sensor: string;
  value: number | null;
  satuan: string;
  level: TatonasAlertLevel;
  time_local: string | null;
};

export type TatonasCard = {
  kind: "tatonas";
  tone: PeringatanTone;
  empty: boolean;
  highlights: TatonasHighlight[];
  extra_count: number;
  station_count: number;
  fetched_at: string;
  href: string;
  stale: boolean;
  source: PeringatanSource;
  example?: boolean;
};

export type TatonasLiveAlert = {
  category?: string;
  device?: string;
  title?: string;
  description?: string;
  level?: string;
  datetime?: string;
};

export type TatonasDtData = {
  plantData?: Record<string, unknown>;
  liveAlertData?: TatonasLiveAlert[];
  count_plant?: number;
  count_devices?: number;
};
