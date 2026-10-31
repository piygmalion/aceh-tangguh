import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { COLOR_TOKENS } from "./layer-colors";
import {
  BASEMAP_IDS,
  BASEMAP_OPTIONS,
  BASEMAP_VECTOR_URLS,
  getBasemapStyle,
  isBasemapId,
  isBrandBasemapId,
  normalizeBasemapId,
  rewriteHiddenDarkBasemap,
  visibleBasemapOptions,
} from "./basemap";
import {
  BRAND_BASEMAP_IDS,
  DARK_WATER,
  INK_SCALE,
  buildBrandBasemapStyle,
  buildEmptyBasemapStyle,
  collectStylePaintHex,
  resolveBrandVectorTilesSource,
} from "./basemap-presets";

const FORBIDDEN = [
  "#2E9E4E",
  "#03060C",
  "#3B82F6",
  "#FF7722",
  "#C4A35A",
  "#B42318",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

const STYLE_TILES = { acehOsmUrl: "https://cdn.example.com/aceh-osm.pmtiles" };

describe("getBasemapStyle default is owned PMTiles or an empty canvas", () => {
  it("treats omitted / unknown ids as not brand, and positron is style JSON", () => {
    assert.equal(isBasemapId("positron"), true);
    assert.equal(isBasemapId("brand-light"), true);
    assert.equal(isBasemapId("not-a-map"), false);

    const style = getBasemapStyle("positron");
    assert.ok(isRecord(style));
    assert.equal(style.version, 8);
    assert.equal(typeof style, "object");
    assert.equal(Object.keys(BASEMAP_VECTOR_URLS).length, 0);
  });

  it("keeps the original five options, with imagery separate from the vector basemap", () => {
    const ids = BASEMAP_OPTIONS.map((o) => o.id);
    for (const id of ["positron", "dark", "streets", "satellite", "sentinel"] as const) {
      assert.ok(ids.includes(id));
    }
    assert.equal(BASEMAP_OPTIONS.filter((o) => o.kind === "imagery").length, 2);
    assert.equal(BASEMAP_OPTIONS.filter((o) => o.kind === "vector").length, 6);
    assert.deepEqual(
      BASEMAP_IDS.slice(0, 5),
      ["positron", "dark", "streets", "satellite", "sentinel"]
    );
  });

  it("keeps Gelap available without a Carto key", () => {
    const settings = readFileSync(
      path.join(process.cwd(), "src/components/map/MapSettings.tsx"),
      "utf8",
    );
    const id = JSON.parse(
      readFileSync(path.join(process.cwd(), "messages/id.json"), "utf8"),
    ) as { map: { basemapDark: string; basemapBrandDark: string } };
    assert.equal(id.map.basemapDark, "Gelap");
    assert.match(settings, /visibleBasemapOptions\(\)/);
    assert.equal(settings.includes("BASEMAP_OPTIONS.map"), false);
    assert.equal(isBasemapId("dark"), true);
    assert.equal(normalizeBasemapId("dark"), "dark");
    assert.equal(isBasemapId("positron"), true);
    const ids = visibleBasemapOptions().map((option) => option.id);
    assert.ok(ids.includes("dark"));
    assert.ok(ids.includes("positron"));
    assert.ok(ids.includes("sentinel"));
    assert.ok(ids.includes("brand-dark"));
    assert.equal(rewriteHiddenDarkBasemap("basemap=dark&z=11"), null);
    assert.equal(id.map.basemapBrandDark, "Gelap merek");
  });
});

describe("brand MapLibre presets", () => {
  it("returns owned style JSON, not remote OpenFreeMap style URLs", () => {
    for (const id of BRAND_BASEMAP_IDS) {
      const style = getBasemapStyle(id);
      assert.equal(isBrandBasemapId(id), true);
      assert.ok(isRecord(style));
      assert.equal(style.version, 8);
      assert.equal(typeof style, "object");
      assert.equal(typeof getBasemapStyle(id, { preferVector: true }), "object");
    }
  });

  it("falls back to an empty theme canvas when rasterFallback is set", () => {
    for (const id of ["brand-light", "brand-dark", "brand-grey"] as const) {
      const style = getBasemapStyle(id, { rasterFallback: true });
      assert.ok(isRecord(style));
      assert.deepEqual(style.sources, {});
      assert.doesNotMatch(JSON.stringify(style), /cartocdn|tile\.openstreetmap\.org|openfreemap/);
    }
    const dark = getBasemapStyle("brand-dark", { rasterFallback: true });
    assert.ok(isRecord(dark));
    const bg = (dark.layers as Array<{ id?: string; paint?: Record<string, string> }>).find(
      (layer) => layer.id === "basemap-background",
    );
    assert.equal(bg?.paint?.["background-color"], COLOR_TOKENS.ink);
  });

  it("uses paper / ink / forest / teal on Light", () => {
    const style = buildBrandBasemapStyle("brand-light", STYLE_TILES);
    const hex = collectStylePaintHex(style);
    assert.ok(hex.includes(COLOR_TOKENS.paperWarm.toUpperCase()));
    assert.ok(hex.includes(COLOR_TOKENS.ink.toUpperCase()));
    assert.ok(hex.includes(COLOR_TOKENS.forest.toUpperCase()));
    assert.ok(hex.includes(COLOR_TOKENS.teal.toUpperCase()));
    const water = style.layers.find((l) => l.id === "basemap-water");
    assert.equal(water?.paint?.["fill-color"], COLOR_TOKENS.teal);
    const park = style.layers.find((l) => l.id === "basemap-park");
    assert.equal(park?.paint?.["fill-color"], COLOR_TOKENS.forest);
    const label = style.layers.find((l) => l.id === "basemap-label-place");
    assert.equal(label?.paint?.["text-color"], COLOR_TOKENS.ink);
  });

  it("uses ink canvas, paper labels, sage landcover, teal water on Dark", () => {
    const style = buildBrandBasemapStyle("brand-dark", STYLE_TILES);
    const bg = style.layers.find((l) => l.id === "basemap-background");
    assert.equal(bg?.paint?.["background-color"], COLOR_TOKENS.ink);
    const label = style.layers.find((l) => l.id === "basemap-label-place");
    assert.equal(label?.paint?.["text-color"], COLOR_TOKENS.paper);
    const park = style.layers.find((l) => l.id === "basemap-park");
    assert.equal(park?.paint?.["fill-color"], COLOR_TOKENS.sage);
    const water = style.layers.find((l) => l.id === "basemap-water");
    assert.equal(water?.paint?.["fill-color"], DARK_WATER);
    assert.equal(DARK_WATER, "#4D807B");
  });

  it("keeps Minimalist Grey on the ink scale except forest on admin and paper on water labels", () => {
    const style = buildBrandBasemapStyle("brand-grey", STYLE_TILES);
    const ink = new Set(Object.values(INK_SCALE).map((h) => h.toUpperCase()));
    const forest = COLOR_TOKENS.forest.toUpperCase();
    const paper = COLOR_TOKENS.paper.toUpperCase();
    const hex = collectStylePaintHex(style);
    for (const color of hex) {
      const ok = ink.has(color) || color === forest || color === paper;
      assert.ok(ok, `grey preset used off-scale color ${color}`);
    }
    for (const layer of style.layers) {
      const layerHex = collectStylePaintHex({
        version: 8,
        name: "x",
        glyphs: "",
        sources: {},
        layers: [layer],
      });
      if (layer.id.includes("boundary-province") || layer.id.includes("boundary-country")) {
        assert.ok(layerHex.includes(forest), `${layer.id} should use forest`);
      } else {
        assert.equal(
          layerHex.includes(forest),
          false,
          `${layer.id} must not use forest`
        );
      }
      if (layer.id.startsWith("basemap-water") && !layer.id.includes("label")) {
        assert.equal(
          layerHex.includes(forest),
          false,
          `${layer.id} must not use forest`
        );
        assert.equal(
          layerHex.includes(INK_SCALE[500].toUpperCase()),
          true,
          `${layer.id} should use ink 500 water`
        );
      }
    }
    const water = style.layers.find((l) => l.id === "basemap-water");
    const waterLabel = style.layers.find((l) => l.id === "basemap-label-water");
    assert.equal(water?.paint?.["fill-color"], INK_SCALE[500]);
    assert.equal(waterLabel?.paint?.["text-color"], COLOR_TOKENS.paper);
  });

  it("does not invent lime, map-blue, orange fills, gold land, or awas", () => {
    for (const id of BRAND_BASEMAP_IDS) {
      const hex = collectStylePaintHex(buildBrandBasemapStyle(id, STYLE_TILES));
      for (const bad of FORBIDDEN) {
        assert.equal(hex.includes(bad), false, `${id} contains forbidden ${bad}`);
      }
    }
  });

  it("uses self-hosted glyphs and no sprite or public vector CDN", () => {
    const prev = process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL;
    const prevLegacy = process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES;
    delete process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL;
    delete process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES;
    try {
      const bundled = buildBrandBasemapStyle("brand-light");
      assert.match(bundled.glyphs, /\/fonts\/\{fontstack\}\/\{range\}\.pbf$/);
      assert.doesNotMatch(bundled.glyphs, /openfreemap/);
      assert.equal("sprite" in bundled, false);
      assert.equal(resolveBrandVectorTilesSource()?.url, "pmtiles:///tiles/aceh-osm.pmtiles");
      assert.equal(
        (bundled.sources.openmaptiles as { url?: string } | undefined)?.url,
        "pmtiles:///tiles/aceh-osm.pmtiles",
      );

      const empty = buildEmptyBasemapStyle("light");
      assert.match(empty.glyphs, /\/fonts\/\{fontstack\}\/\{range\}\.pbf$/);
      assert.deepEqual(empty.sources, {});
      assert.equal("sprite" in empty, false);

      const remote = buildBrandBasemapStyle("brand-light", {
        acehOsmUrl: "https://cdn.example.com/aceh-osm.pmtiles",
      });
      const source = remote.sources.openmaptiles as {
        url?: string;
        attribution?: string;
      };
      assert.equal(source.url, "pmtiles://https://cdn.example.com/aceh-osm.pmtiles");
      assert.match(source.attribution ?? "", /OpenStreetMap/);
      assert.match(source.attribution ?? "", /contributors/);
      assert.equal("sprite" in remote, false);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL;
      else process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL = prev;
      if (prevLegacy === undefined) delete process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES;
      else process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES = prevLegacy;
    }
  });
});
