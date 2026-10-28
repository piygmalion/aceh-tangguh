import type { FeatureCollection } from "geojson";
import { expandMarkerLayerKeys } from "./map-url-aliases";

/**
 * Points allowed to draw and cluster for an explicit `layers` list.
 * A layer that is not in the list is absent, so it cannot form a cluster.
 * An empty list draws nothing. A missing `properties.layer` counts as
 * `disasterEvents` and stays only when that key is selected.
 */
export function geojsonForMarkerLayers(
  fc: FeatureCollection,
  keys: readonly string[],
): FeatureCollection {
  const allowed = new Set<string>(expandMarkerLayerKeys(keys));
  return {
    type: "FeatureCollection",
    features: fc.features.filter((feature) => {
      const raw = feature.properties?.layer;
      const layer = raw == null || raw === "" ? "disasterEvents" : String(raw);
      return allowed.has(layer);
    }),
  };
}
