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

  it("keeps the default on owned style JSON, not an OpenFreeMap URL", () => {
    const prev = process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL;
    const prevLegacy = process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES;
    delete process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL;
    delete process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES;
    try {
      const style = getBasemapStyle("positron", { preferVector: true });
      assert.equal(typeof style, "object");
      assert.equal(Object.keys(BASEMAP_VECTOR_URLS).length, 0);
      assert.doesNotMatch(JSON.stringify(style), /openfreemap|tile\.openstreetmap\.org|cartocdn/);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL;
      else process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL = prev;
      if (prevLegacy === undefined) delete process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES;
      else process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES = prevLegacy;
    }
  });

  it("does not treat MapLibre adoption as a reason to raise cluster zoom", () => {
    assert.equal(MAP_UNCLUSTERED_ICON_ZOOM, 10);
    assert.equal(MAP_CLUSTER_MAX_ZOOM, 9);
  });
});
