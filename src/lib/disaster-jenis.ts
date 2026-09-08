/**
 * Static disaster-type (jenis_bencana) catalog for map toolbar / legend.
 * Ordered by frequency in markers.geojson disasterEvents (desc), then name.
 * Rekapitulasi Tahunan is intentionally excluded.
 */

import { JENIS_HEX } from "@/lib/chart-colors";

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

/** Distinct fill colors per jenis — Sistem Warna only (no map-blue / violet / lime). */
export const DISASTER_JENIS_COLORS: Record<string, string> = {
  Kebakaran: JENIS_HEX.fireDeep,
  Banjir: JENIS_HEX.water,
  "Kebakaran Hutan dan Lahan": JENIS_HEX.fire,
  "Angin Puting Beliung": JENIS_HEX.wind,
  Longsor: JENIS_HEX.slide,
  "Banjir Bandang": JENIS_HEX.water,
  "Gempa Bumi": JENIS_HEX.quake,
  "Banjir Bandang dan Tanah Longsor": JENIS_HEX.slideSoft,
  Abrasi: JENIS_HEX.water,
  Lainnya: JENIS_HEX.other,
  "Kebakaran Pemukiman": JENIS_HEX.fireDeep,
  "Tanah Longsor": JENIS_HEX.slideSoft,
  Kekeringan: JENIS_HEX.drought,
};

export type DisasterJenisLayerState = {
  markerLayers: readonly string[];
  disasterJenis: readonly string[];
};

export type DisasterJenisToggleResult = {
  markerLayers: string[];
  disasterJenisEncoded: string | null;
};

function withDisasterParent(layers: readonly string[], on: boolean): string[] {
  const rest = layers.filter((l) => l !== "disasterEvents");
  if (!on) return rest;
  if (layers.includes("disasterEvents")) return [...layers];
  return ["disasterEvents", ...rest];
}

/**
 * Toggle one jenis_bencana. Parent-off + child on enables only that jenis
 * (does not require turning on every disaster type first).
 */
export function nextDisasterJenisToggle(
  state: DisasterJenisLayerState,
  jenis: string,
  all: readonly string[] = DISASTER_JENIS
): DisasterJenisToggleResult {
  const parentOn = state.markerLayers.includes("disasterEvents");

  if (!parentOn) {
    return {
      markerLayers: withDisasterParent(state.markerLayers, true),
      disasterJenisEncoded: encodeDisasterJenis([jenis]),
    };
  }

  const current = state.disasterJenis;
  const active = current.length === 0 ? new Set(all) : new Set(current);

  if (active.has(jenis)) {
    active.delete(jenis);
    if (active.size === 0) {
      return {
        markerLayers: withDisasterParent(state.markerLayers, false),
        disasterJenisEncoded: null,
      };
    }
  } else {
    active.add(jenis);
  }

  if (active.size === all.length && all.every((j) => active.has(j))) {
    return {
      markerLayers: withDisasterParent(state.markerLayers, true),
      disasterJenisEncoded: null,
    };
  }

  return {
    markerLayers: withDisasterParent(state.markerLayers, true),
    disasterJenisEncoded: encodeDisasterJenis(Array.from(active)),
  };
}

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
