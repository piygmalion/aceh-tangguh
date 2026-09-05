/**
 * OpenMapTiles source-layers the brand basemap style expects.
 * Keep in sync with `ACEH_OSM_REQUIRED_LAYERS` in `src/lib/tiles-url.ts`.
 */
export const ACEH_OSM_ARCHIVE = "aceh-osm.pmtiles";

export const ACEH_OSM_REQUIRED_LAYERS = [
  "landcover",
  "water",
  "waterway",
  "building",
  "transportation",
  "boundary",
  "place",
  "water_name",
  "transportation_name",
];

export const ACEH_OSM_OPTIONAL_LAYERS = ["landuse", "park"];

/**
 * @param {string[] | Set<string>} layerIds
 * @returns {{ missing: string[], optionalMissing: string[] }}
 */
export function missingAcehOsmLayers(layerIds) {
  const have = layerIds instanceof Set ? layerIds : new Set(layerIds);
  return {
    missing: ACEH_OSM_REQUIRED_LAYERS.filter((id) => !have.has(id)),
    optionalMissing: ACEH_OSM_OPTIONAL_LAYERS.filter((id) => !have.has(id)),
  };
}
