/**
 * Map OSM tags (osmium export GeoJSON) onto OpenMapTiles-style layers/classes
 * used by `src/lib/basemap-presets.ts`. Planetiler is preferred; this is the
 * tippecanoe fallback so brand filters (class, admin_level, brunnel) still match.
 */

const POLY_TYPES = new Set(["Polygon", "MultiPolygon"]);
const LINE_TYPES = new Set(["LineString", "MultiLineString"]);
const POINT_TYPES = new Set(["Point", "MultiPoint"]);

const ROAD_CLASS = {
  motorway: "motorway",
  motorway_link: "motorway",
  trunk: "trunk",
  trunk_link: "trunk",
  primary: "primary",
  primary_link: "primary",
  secondary: "secondary",
  secondary_link: "secondary",
  tertiary: "tertiary",
  tertiary_link: "tertiary",
  residential: "minor",
  unclassified: "minor",
  living_street: "minor",
  service: "service",
  track: "track",
  path: "path",
  footway: "path",
  cycleway: "path",
  pedestrian: "path",
  steps: "path",
};

const PLACE_CLASS = {
  country: "country",
  state: "state",
  province: "state",
  city: "city",
  town: "town",
  village: "village",
  hamlet: "village",
  suburb: "village",
  isolated_dwelling: "village",
};

/**
 * @param {Record<string, unknown> | null | undefined} tags
 */
export function nameProps(tags) {
  const t = tags ?? {};
  const name = str(t.name) || str(t["name:id"]) || str(t["name:en"]);
  const nameEn = str(t["name:en"]);
  const nameNonlatin = str(t["name:id"]) || str(t.name);
  const out = {};
  if (name) out.name = name;
  if (nameEn) out.name_en = nameEn;
  if (nameNonlatin) out["name:nonlatin"] = nameNonlatin;
  if (name) out["name:latin"] = nameEn || name;
  return out;
}

/**
 * @param {unknown} value
 */
function str(value) {
  if (value == null) return "";
  const s = String(value).trim();
  return s && s !== "null" && s !== "undefined" ? s : "";
}

/**
 * @param {Record<string, unknown>} tags
 */
export function brunnelOf(tags) {
  if (str(tags.tunnel) && str(tags.tunnel) !== "no") return "tunnel";
  if (str(tags.bridge) && str(tags.bridge) !== "no") return "bridge";
  if (str(tags.ford) && str(tags.ford) !== "no") return "ford";
  return "";
}

/**
 * @param {Record<string, unknown>} tags
 */
function adminLevelOf(tags) {
  const n = Number(str(tags.admin_level));
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {import("geojson").Feature} feature
 * @returns {{ layer: string, properties: Record<string, unknown>, minzoom?: number }[] }
 */
export function classifyOsmFeature(feature) {
  if (!feature || feature.type !== "Feature" || !feature.geometry) return [];
  const geom = feature.geometry.type;
  const tags = /** @type {Record<string, unknown>} */ (feature.properties ?? {});
  const names = nameProps(tags);
  const brunnel = brunnelOf(tags);
  /** @type {{ layer: string, properties: Record<string, unknown>, minzoom?: number }[]} */
  const out = [];

  const landuse = str(tags.landuse);
  const natural = str(tags.natural);
  const leisure = str(tags.leisure);
  const waterway = str(tags.waterway);
  const water = str(tags.water);
  const building = str(tags.building);
  const highway = str(tags.highway);
  const place = str(tags.place);
  const boundary = str(tags.boundary);

  if (POLY_TYPES.has(geom)) {
    if (landuse === "residential") {
      out.push({
        layer: "landuse",
        properties: { class: "residential", ...names },
        minzoom: 10,
      });
    }
    if (natural === "wood" || landuse === "forest") {
      out.push({
        layer: "landcover",
        properties: { class: "wood", ...names },
      });
    }
    if (leisure === "park" || leisure === "nature_reserve" || landuse === "recreation_ground") {
      out.push({
        layer: "park",
        properties: { class: "park", ...names },
      });
    }
    if (
      natural === "water" ||
      natural === "bay" ||
      water ||
      landuse === "reservoir" ||
      landuse === "basin" ||
      waterway === "riverbank" ||
      waterway === "dock"
    ) {
      const props = { class: water || (natural === "bay" ? "ocean" : "lake"), ...names };
      if (brunnel) props.brunnel = brunnel;
      out.push({ layer: "water", properties: props });
      if (names.name) {
        out.push({ layer: "water_name", properties: { ...props }, minzoom: 4 });
      }
    }
    if (building && building !== "no") {
      out.push({
        layer: "building",
        properties: { ...names },
        minzoom: 12,
      });
    }
  }

  if (LINE_TYPES.has(geom)) {
    if (waterway && waterway !== "riverbank") {
      const props = { class: waterway, ...names };
      if (brunnel) props.brunnel = brunnel;
      out.push({ layer: "waterway", properties: props, minzoom: 8 });
    }
    const road = ROAD_CLASS[highway];
    if (road) {
      const props = { class: road, ...names };
      if (brunnel) props.brunnel = brunnel;
      out.push({ layer: "transportation", properties: props, minzoom: 8 });
      if (names.name) {
        out.push({
          layer: "transportation_name",
          properties: { class: road, ...names },
          minzoom: 12,
        });
      }
    }
    if (boundary === "administrative") {
      const adminLevel = adminLevelOf(tags);
      if (adminLevel != null) {
        out.push({
          layer: "boundary",
          properties: {
            admin_level: adminLevel,
            maritime: str(tags.maritime) === "yes" ? 1 : 0,
            ...names,
          },
        });
      }
    }
  }

  if (POINT_TYPES.has(geom) && place) {
    const klass = PLACE_CLASS[place];
    if (klass && names.name) {
      out.push({
        layer: "place",
        properties: { class: klass, ...names },
        minzoom: 3,
      });
    }
  }

  return out;
}

/**
 * @param {import("geojson").Feature} feature
 * @param {{ layer: string, properties: Record<string, unknown>, minzoom?: number }} classified
 */
export function toTippecanoeFeature(feature, classified) {
  const tippecanoe = {};
  if (classified.minzoom != null) tippecanoe.minzoom = classified.minzoom;
  return {
    type: "Feature",
    geometry: feature.geometry,
    properties: {
      ...classified.properties,
      ...(Object.keys(tippecanoe).length ? { tippecanoe } : {}),
    },
  };
}
