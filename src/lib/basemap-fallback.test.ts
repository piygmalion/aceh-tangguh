import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { COLOR_TOKENS } from "./layer-colors";
import { BASEMAP_IDS, getBasemapStyle } from "./basemap";
import { DARK_WATER, collectStylePaintHex } from "./basemap-presets";

const ROOT = process.cwd();
const ENV_KEYS = [
  "NEXT_PUBLIC_BASEMAP_PMTILES_URL",
  "NEXT_PUBLIC_ACEH_OSM_PMTILES",
  "NEXT_PUBLIC_CARTO_API_KEY",
] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function setEnv(key: (typeof ENV_KEYS)[number], value: string | undefined) {
  if (!(key in saved)) saved[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (!(key in saved)) continue;
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    delete saved[key];
  }
});

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function styleBlob(style: unknown): string {
  return JSON.stringify(style);
}

describe("BM-fallback owned PMTiles basemap", () => {
  it("never points a style or source URL at public OSM raster tiles", () => {
    const files = [
      "src/lib/basemap.ts",
      "src/lib/basemap-presets.ts",
      "scripts/verify-basemap.mjs",
    ];
    for (const rel of files) {
      assert.doesNotMatch(read(rel), /tile\.openstreetmap\.org/, rel);
    }
    setEnv("NEXT_PUBLIC_BASEMAP_PMTILES_URL", undefined);
    setEnv("NEXT_PUBLIC_ACEH_OSM_PMTILES", undefined);
    setEnv("NEXT_PUBLIC_CARTO_API_KEY", undefined);
    for (const id of BASEMAP_IDS) {
      for (const style of [
        getBasemapStyle(id),
        getBasemapStyle(id, { preferVector: true, rasterFallback: true }),
      ]) {
        assert.doesNotMatch(styleBlob(style), /tile\.openstreetmap\.org/, id);
        assert.doesNotMatch(styleBlob(style), /cartocdn\.com/, id);
      }
    }
  });

  it("uses PMTiles when the URL is set, otherwise an empty theme canvas", () => {
    setEnv("NEXT_PUBLIC_CARTO_API_KEY", "should-not-be-used");
    setEnv("NEXT_PUBLIC_ACEH_OSM_PMTILES", undefined);
    setEnv("NEXT_PUBLIC_BASEMAP_PMTILES_URL", undefined);

    const empty = getBasemapStyle("positron");
    assert.ok(isRecord(empty));
    const emptySources = empty.sources as Record<string, unknown>;
    assert.deepEqual(emptySources, {});
    const emptyLayers = empty.layers as Array<{ id?: string; paint?: Record<string, unknown> }>;
    const emptyBg = emptyLayers.find((layer) => layer.id === "basemap-background");
    assert.equal(emptyBg?.paint?.["background-color"], COLOR_TOKENS.paperWarm);
    assert.doesNotMatch(styleBlob(empty), /cartocdn|tile\.openstreetmap\.org|openfreemap/);

    setEnv("NEXT_PUBLIC_BASEMAP_PMTILES_URL", "https://cdn.example.com/aceh-osm.pmtiles");
    const light = getBasemapStyle("positron");
    assert.ok(isRecord(light));
    const source = (light.sources as Record<string, { url?: string; attribution?: string }>)
      .openmaptiles;
    assert.equal(source?.url, "pmtiles://https://cdn.example.com/aceh-osm.pmtiles");
    assert.match(source?.attribution ?? "", /OpenStreetMap/);
    assert.match(source?.attribution ?? "", /contributors/);
    assert.doesNotMatch(source?.attribution ?? "", /CARTO/);
    assert.doesNotMatch(styleBlob(light), /tile\.openstreetmap\.org|cartocdn\.com|openfreemap/);

    const dark = getBasemapStyle("dark");
    assert.ok(isRecord(dark));
    const darkBg = (dark.layers as Array<{ id?: string; paint?: Record<string, unknown> }>).find(
      (layer) => layer.id === "basemap-background",
    );
    assert.equal(darkBg?.paint?.["background-color"], COLOR_TOKENS.ink);
    const darkSource = (dark.sources as Record<string, { url?: string }>).openmaptiles;
    assert.equal(darkSource?.url, "pmtiles://https://cdn.example.com/aceh-osm.pmtiles");

    const failed = getBasemapStyle("dark", { rasterFallback: true });
    assert.ok(isRecord(failed));
    assert.deepEqual(failed.sources, {});
    const failedBg = (failed.layers as Array<{ id?: string; paint?: Record<string, unknown> }>).find(
      (layer) => layer.id === "basemap-background",
    );
    assert.equal(failedBg?.paint?.["background-color"], COLOR_TOKENS.ink);
    assert.doesNotMatch(styleBlob(failed), /cartocdn|tile\.openstreetmap\.org|openfreemap/);

    const streets = getBasemapStyle("streets");
    assert.doesNotMatch(styleBlob(streets), /tile\.openstreetmap\.org/);
    assert.match(styleBlob(streets), /pmtiles:\/\/https:\/\/cdn\.example\.com\/aceh-osm\.pmtiles/);
  });

  it("paints light and dark PMTiles styles with Peudeung tokens and label halos", () => {
    setEnv("NEXT_PUBLIC_BASEMAP_PMTILES_URL", "https://cdn.example.com/aceh-osm.pmtiles");
    setEnv("NEXT_PUBLIC_CARTO_API_KEY", undefined);

    const light = getBasemapStyle("positron");
    assert.ok(isRecord(light));
    const lightLayers = light.layers as Array<{
      id?: string;
      type?: string;
      paint?: Record<string, unknown>;
    }>;
    assert.equal(
      lightLayers.find((layer) => layer.id === "basemap-water")?.paint?.["fill-color"],
      COLOR_TOKENS.teal,
    );
    assert.equal(
      lightLayers.find((layer) => layer.id === "basemap-park")?.paint?.["fill-color"],
      COLOR_TOKENS.forest,
    );
    assert.equal(
      lightLayers.find((layer) => layer.id === "basemap-landcover-wood")?.paint?.["fill-color"],
      COLOR_TOKENS.sage,
    );
    assert.equal(
      lightLayers.find((layer) => layer.id === "basemap-label-place")?.paint?.["text-color"],
      COLOR_TOKENS.ink,
    );
    for (const layer of lightLayers) {
      if (layer.type !== "symbol") continue;
      assert.ok(Number(layer.paint?.["text-halo-width"]) > 0, layer.id);
    }
    for (const bad of ["#FF7722", "#2E9E4E", "#03060C", "#3B82F6"]) {
      assert.equal(collectStylePaintHex(light as never).includes(bad), false, bad);
    }

    const dark = getBasemapStyle("dark");
    assert.ok(isRecord(dark));
    const darkLayers = dark.layers as Array<{ id?: string; paint?: Record<string, unknown> }>;
    assert.equal(
      darkLayers.find((layer) => layer.id === "basemap-background")?.paint?.["background-color"],
      "#1A1A17",
    );
    assert.equal(
      darkLayers.find((layer) => layer.id === "basemap-label-place")?.paint?.["text-color"],
      "#F7F7F4",
    );
    assert.equal(
      darkLayers.find((layer) => layer.id === "basemap-landcover-wood")?.paint?.["fill-color"],
      COLOR_TOKENS.sage,
    );
    assert.equal(
      darkLayers.find((layer) => layer.id === "basemap-water")?.paint?.["fill-color"],
      DARK_WATER,
    );
    assert.equal(DARK_WATER, "#4D807B");
    assert.equal("sprite" in dark, false);
    assert.match(String(dark.glyphs), /\/fonts\/\{fontstack\}\/\{range\}\.pbf$/);
    assert.doesNotMatch(String(dark.glyphs), /openfreemap|tiles\.openstreetmap\.org/);
  });
});
