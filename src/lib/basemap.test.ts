import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLOR_TOKENS } from "./layer-colors";
import {
  BASEMAP_IDS,
  BASEMAP_OPTIONS,
  BASEMAP_RASTER,
  BRAND_RASTER_FALLBACK,
  getBasemapStyle,
  isBasemapId,
  isBrandBasemapId,
} from "./basemap";
import {
  BRAND_BASEMAP_IDS,
  INK_SCALE,
  buildBrandBasemapStyle,
  collectStylePaintHex,
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

describe("getBasemapStyle default remains Carto", () => {
  it("treats omitted / unknown ids as not brand, and positron is Carto raster", () => {
    assert.equal(isBasemapId("positron"), true);
    assert.equal(isBasemapId("brand-light"), true);
    assert.equal(isBasemapId("not-a-map"), false);

    const style = getBasemapStyle("positron");
    assert.ok(isRecord(style));
    assert.equal(style.version, 8);
    assert.equal(style.name, "positron-raster");
    const sources = style.sources as Record<string, { tiles?: string[] }>;
    assert.match(sources.raster.tiles?.[0] ?? "", /cartocdn\.com\/light_all/);
  });

  it("does not swap the default to a brand or remote OpenFreeMap style URL", () => {
    const def = getBasemapStyle("positron");
    assert.notEqual(typeof def, "string");
    assert.ok(isRecord(def));
    assert.notEqual(def.name, "aceh-tangguh-light");
    assert.equal(getBasemapStyle("positron", { preferVector: false }), BASEMAP_RASTER.positron);
  });

  it("keeps the original five raster/imagery options", () => {
    const ids = BASEMAP_OPTIONS.map((o) => o.id);
    for (const id of ["positron", "dark", "streets", "satellite", "sentinel"] as const) {
      assert.ok(ids.includes(id));
    }
    assert.equal(
      BASEMAP_OPTIONS.filter((o) => o.kind === "raster" || o.kind === "imagery").length,
      5
    );
    assert.equal(BASEMAP_OPTIONS.filter((o) => o.kind === "vector").length, 3);
    assert.deepEqual(
      BASEMAP_IDS.slice(0, 5),
      ["positron", "dark", "streets", "satellite", "sentinel"]
    );
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

  it("falls back to Carto raster when rasterFallback is set", () => {
    assert.equal(
      getBasemapStyle("brand-light", { rasterFallback: true }),
      BASEMAP_RASTER[BRAND_RASTER_FALLBACK["brand-light"]]
    );
    assert.equal(
      getBasemapStyle("brand-dark", { rasterFallback: true }),
      BASEMAP_RASTER.dark
    );
    assert.equal(
      getBasemapStyle("brand-grey", { rasterFallback: true }),
      BASEMAP_RASTER.positron
    );
  });

  it("uses paper / ink / forest / teal on Light", () => {
    const style = buildBrandBasemapStyle("brand-light");
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
    const style = buildBrandBasemapStyle("brand-dark");
    const bg = style.layers.find((l) => l.id === "basemap-background");
    assert.equal(bg?.paint?.["background-color"], COLOR_TOKENS.ink);
    const label = style.layers.find((l) => l.id === "basemap-label-place");
    assert.equal(label?.paint?.["text-color"], COLOR_TOKENS.paper);
    const park = style.layers.find((l) => l.id === "basemap-park");
    assert.equal(park?.paint?.["fill-color"], COLOR_TOKENS.sage);
    const water = style.layers.find((l) => l.id === "basemap-water");
    assert.equal(water?.paint?.["fill-color"], COLOR_TOKENS.teal);
  });

  it("keeps Minimalist Grey on the ink scale except forest on admin boundaries", () => {
    const style = buildBrandBasemapStyle("brand-grey");
    const ink = new Set(Object.values(INK_SCALE).map((h) => h.toUpperCase()));
    const forest = COLOR_TOKENS.forest.toUpperCase();
    const hex = collectStylePaintHex(style);
    for (const color of hex) {
      const ok = ink.has(color) || color === forest;
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
    }
    const water = style.layers.find((l) => l.id === "basemap-water");
    assert.equal(water?.paint?.["fill-color"], INK_SCALE[400]);
  });

  it("does not invent lime, map-blue, orange fills, gold land, or awas", () => {
    for (const id of BRAND_BASEMAP_IDS) {
      const hex = collectStylePaintHex(buildBrandBasemapStyle(id));
      for (const bad of FORBIDDEN) {
        assert.equal(hex.includes(bad), false, `${id} contains forbidden ${bad}`);
      }
    }
  });

  it("reuses OpenFreeMap glyphs and planet tiles — no sprite pipeline", () => {
    const style = buildBrandBasemapStyle("brand-light");
    assert.equal(
      style.glyphs,
      "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf"
    );
    const source = style.sources.openmaptiles as { url?: string };
    assert.equal(source.url, "https://tiles.openfreemap.org/planet");
    assert.equal("sprite" in style, false);
  });
});
