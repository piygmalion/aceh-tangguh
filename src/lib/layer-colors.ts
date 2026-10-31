import type { MarkerLayerKey } from "@/lib/types";
import { STATUS_HEX } from "@/lib/chart-colors";

/**
 * Official Sistem Warna tokens for map chrome.
 * HEX is the source of truth — no leftover Tailwind lime / sky / violet.
 */
export const COLOR_TOKENS = {
  forest: "#1F4C15",
  sage: "#8A9A5B",
  orange: "#FF7722",
  gold: "#C4A35A",
  ink: "#1A1A17",
  paper: "#F7F7F4",
  paperWarm: "#F4F5F0",
  /** Sama dengan kartu Peringatan Dini / --map-status-awas (#C8102E). INS-47. */
  awas: STATUS_HEX.AWAS,
  /** Outline AWAS, sama dengan --status-awas-bar di kartu. */
  awasOutline: "#111111",
  teal: "#2F6B66",
} as const;

export type OfficialColorToken = (typeof COLOR_TOKENS)[keyof typeof COLOR_TOKENS];

export const OFFICIAL_COLOR_HEX = new Set<string>(Object.values(COLOR_TOKENS));

export const LAYER_COLORS: Record<MarkerLayerKey, string> = {
  disasterEvents: COLOR_TOKENS.orange,
  missingPersons: COLOR_TOKENS.awas,
  tendPoints: COLOR_TOKENS.teal,
  policeOffices: COLOR_TOKENS.ink,
  poskos: COLOR_TOKENS.forest,
  facHealth: COLOR_TOKENS.awas,
  facEducation: COLOR_TOKENS.sage,
  facGov: COLOR_TOKENS.ink,
  facReligious: COLOR_TOKENS.teal,
  infraRoadBridge: COLOR_TOKENS.gold,
  laporanKejadian: COLOR_TOKENS.orange,
  laporanPenanganan: COLOR_TOKENS.teal,
};

export const CLUSTER_COLORS = {
  low: COLOR_TOKENS.sage,
  high: COLOR_TOKENS.forest,
  textOnLow: COLOR_TOKENS.ink,
  textOnHigh: COLOR_TOKENS.paper,
} as const;
