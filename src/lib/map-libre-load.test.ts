import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import { BASEMAP_VECTOR_URLS, getBasemapStyle } from "./basemap";
import { MAP_CLUSTER_MAX_ZOOM, MAP_UNCLUSTERED_ICON_ZOOM } from "./map-marker-chrome";

const root = process.cwd();

describe("MapLibre load path on /peta", () => {
  it("already uses MapLibre GL JS via react-map-gl, not Mapbox GL", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    assert.ok(pkg.dependencies["maplibre-gl"]);
    assert.ok(pkg.dependencies["react-map-gl"]);
    assert.equal(pkg.dependencies["mapbox-gl"], undefined);

    const viewport = readFileSync(
      path.join(root, "src/components/map/MapViewport.tsx"),
      "utf8"
    );
    assert.match(viewport, /from "maplibre-gl"/);
    assert.match(viewport, /from "react-map-gl\/maplibre"/);
    assert.equal(viewport.includes("mapbox-gl"), false);
    assert.match(viewport, /reuseMaps/);
  });

  it("keeps raster Carto as default; vector OpenFreeMap stays opt-in", () => {
    const raster = getBasemapStyle("positron");
    assert.equal(typeof raster, "object");
    const vector = getBasemapStyle("positron", { preferVector: true });
    assert.equal(vector, BASEMAP_VECTOR_URLS.positron);
    assert.equal(typeof vector, "string");
    assert.match(String(vector), /openfreemap/);
  });

  it("does not treat MapLibre adoption as a reason to raise cluster zoom", () => {
    assert.equal(MAP_UNCLUSTERED_ICON_ZOOM, 10);
    assert.equal(MAP_CLUSTER_MAX_ZOOM, 9);
  });
});
