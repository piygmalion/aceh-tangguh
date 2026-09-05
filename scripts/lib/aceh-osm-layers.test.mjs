import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  ACEH_OSM_ARCHIVE,
  ACEH_OSM_OPTIONAL_LAYERS,
  ACEH_OSM_REQUIRED_LAYERS,
  missingAcehOsmLayers,
} from "./aceh-osm-layers.mjs";
import { classifyOsmFeature, nameProps } from "./osm-to-openmaptiles.mjs";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

describe("required overlay archives stay on disk", () => {
  it("keeps r3p-kab.pmtiles for villageDistribution LOD z<9", async () => {
    await access(resolve(ROOT, "public/tiles/r3p-kab.pmtiles"));
    assert.notEqual(ACEH_OSM_ARCHIVE, "r3p-kab.pmtiles");
  });
});

describe("Aceh OSM layer contract", () => {
  it("names the extract archive and required OpenMapTiles layers", () => {
    assert.equal(ACEH_OSM_ARCHIVE, "aceh-osm.pmtiles");
    assert.deepEqual(ACEH_OSM_REQUIRED_LAYERS, [
      "landcover",
      "water",
      "waterway",
      "building",
      "transportation",
      "boundary",
      "place",
      "water_name",
      "transportation_name",
    ]);
    assert.ok(ACEH_OSM_OPTIONAL_LAYERS.includes("landuse"));
    assert.ok(ACEH_OSM_OPTIONAL_LAYERS.includes("park"));
  });

  it("reports missing required layers without failing on extras", () => {
    const { missing, optionalMissing } = missingAcehOsmLayers(["water", "place", "park"]);
    assert.ok(missing.includes("landcover"));
    assert.ok(missing.includes("transportation"));
    assert.equal(missing.includes("water"), false);
    assert.deepEqual(optionalMissing, ["landuse"]);
    assert.deepEqual(missingAcehOsmLayers(ACEH_OSM_REQUIRED_LAYERS.concat(ACEH_OSM_OPTIONAL_LAYERS)).missing, []);
  });
});

describe("OSM → OpenMapTiles class mapping", () => {
  it("maps forest / water / roads / admin / places to brand source-layers", () => {
    const wood = classifyOsmFeature({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [96, 4],
            [96.1, 4],
            [96.1, 4.1],
            [96, 4.1],
            [96, 4],
          ],
        ],
      },
      properties: { natural: "wood", name: "Hutan" },
    });
    assert.equal(wood[0]?.layer, "landcover");
    assert.equal(wood[0]?.properties.class, "wood");

    const lake = classifyOsmFeature({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [96, 4],
            [96.1, 4],
            [96.1, 4.1],
            [96, 4.1],
            [96, 4],
          ],
        ],
      },
      properties: { natural: "water", name: "Danau" },
    });
    assert.ok(lake.some((row) => row.layer === "water"));
    assert.ok(lake.some((row) => row.layer === "water_name"));

    const road = classifyOsmFeature({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [96, 4],
          [96.2, 4.1],
        ],
      },
      properties: { highway: "residential", name: "Jalan Malioboro" },
    });
    assert.equal(road[0]?.layer, "transportation");
    assert.equal(road[0]?.properties.class, "minor");
    assert.equal(road[1]?.layer, "transportation_name");

    const boundary = classifyOsmFeature({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [95, 2],
          [98.3, 6.15],
        ],
      },
      properties: { boundary: "administrative", admin_level: "4" },
    });
    assert.equal(boundary[0]?.layer, "boundary");
    assert.equal(boundary[0]?.properties.admin_level, 4);
    assert.equal(boundary[0]?.properties.maritime, 0);

    const place = classifyOsmFeature({
      type: "Feature",
      geometry: { type: "Point", coordinates: [95.32, 5.55] },
      properties: { place: "city", name: "Banda Aceh", "name:en": "Banda Aceh" },
    });
    assert.equal(place[0]?.layer, "place");
    assert.equal(place[0]?.properties.class, "city");
    assert.deepEqual(nameProps({ name: "Banda Aceh", "name:en": "Banda Aceh" }).name, "Banda Aceh");
  });
});
