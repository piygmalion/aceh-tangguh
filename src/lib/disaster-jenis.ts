/**
 * Static disaster-type (jenis_bencana) catalog for map toolbar / legend.
 * Ordered by frequency in markers.geojson disasterEvents (desc), then name.
 * Rekapitulasi Tahunan is intentionally excluded.
 */

export const DISASTER_JENIS = [
  "Kebakaran",
  "Banjir",
  "Kebakaran Hutan dan Lahan",
  "Angin Puting Beliung",
  "Longsor",
  "Banjir Bandang",
  "Gempa Bumi",
  "Banjir Bandang dan Tanah Longsor",
  "Abrasi",
  "Lainnya",
  "Kebakaran Pemukiman",
  "Tanah Longsor",
  "Kekeringan",
] as const;

export type DisasterJenis = (typeof DISASTER_JENIS)[number];

/** Distinct fill colors per jenis; LAYER_COLORS.disasterEvents (#f59e0b) is the fallback. */
export const DISASTER_JENIS_COLORS: Record<string, string> = {
  Kebakaran: "#ef4444",
  Banjir: "#3b82f6",
  "Kebakaran Hutan dan Lahan": "#f97316",
  "Angin Puting Beliung": "#8b5cf6",
  Longsor: "#a16207",
  "Banjir Bandang": "#2563eb",
  "Gempa Bumi": "#dc2626",
  "Banjir Bandang dan Tanah Longsor": "#1d4ed8",
  Abrasi: "#06b6d4",
  Lainnya: "#64748b",
  "Kebakaran Pemukiman": "#e11d48",
  "Tanah Longsor": "#92400e",
  Kekeringan: "#ca8a04",
};

export function encodeDisasterJenis(jenis: string[]): string | null {
  if (!jenis.length) return null;
  return jenis.map((j) => encodeURIComponent(j)).join(",");
}

export function parseDisasterJenis(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => {
      try {
        return decodeURIComponent(s.trim());
      } catch {
        return s.trim();
      }
    })
    .filter(Boolean);
}

export function isRekapitulasiTahunan(jenis: string | undefined | null): boolean {
  if (!jenis) return false;
  if (jenis === "Rekapitulasi Tahunan") return true;
  return jenis.toLowerCase().includes("rekapitulasi tahunan");
}
