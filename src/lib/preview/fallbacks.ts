import type { HazardStatus, LiveStats } from "@/lib/types";

/** Same defaults as GET /api/stats/live when Supabase is missing. */
export const LIVE_STATS_FALLBACK: LiveStats = {
  activeIncidents: 3,
  poskoCount: 656,
  reportsLast24h: 0,
  updatedAt: "2024-01-01T00:00:00.000Z",
};

/** Same defaults as GET /api/hazards when Supabase is missing. */
export const HAZARD_STATUS_FALLBACK: HazardStatus[] = [
  { kind: "banjir", label: "Banjir", count: 2, severity: "med" },
  { kind: "longsor", label: "Longsor", count: 1, severity: "high" },
  { kind: "gempa", label: "Gempa", count: 0, severity: "low" },
  { kind: "kebakaran", label: "Kebakaran", count: 0, severity: "low" },
  { kind: "karhutla", label: "Karhutla", count: 85, severity: "med" },
  { kind: "puting_beliung", label: "Puting Beliung", count: 44, severity: "med" },
];
