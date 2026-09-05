import type { LiveStats } from "@/lib/types";

/** Same defaults as GET /api/stats/live when Supabase is missing. */
export const LIVE_STATS_FALLBACK: LiveStats = {
  activeIncidents: 3,
  poskoCount: null,
  reportsLast24h: 0,
  updatedAt: "2024-01-01T00:00:00.000Z",
};
