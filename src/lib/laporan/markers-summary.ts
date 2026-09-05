import type { FeatureCollection } from "geojson";

export function summarizeMarkerLayers(fc: FeatureCollection & { source?: string }) {
  const byLayer: Record<string, number> = {};
  for (const f of fc.features) {
    const key = String(f.properties?.layer ?? "unknown");
    byLayer[key] = (byLayer[key] ?? 0) + 1;
  }
  return {
    total: fc.features.length,
    byLayer,
    source: fc.source,
  };
}
