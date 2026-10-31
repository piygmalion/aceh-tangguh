import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { COLOR_TOKENS } from "./layer-colors";
import {
  BASEMAP_IDS,
  BASEMAP_OPTIONS,
  BASEMAP_RASTER,
  BRAND_RASTER_FALLBACK,
  cartoBasemapKeyPresent,
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
  OPENFREEMAP_TILEJSON,
  buildBrandBasemapStyle,
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
  "#C8102E",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function firstRasterTile(style: unknown): string {
  assert.ok(isRecord(style));
  const sources = style.sources as Record<string, { tiles?: string[] }>;
  return sources.raster.tiles?.[0] ?? "";
}

describe("getBasemapStyle default remains Carto", () => {
  it("treats omitted / unknown ids as not brand, and positron is keyed Carto or OSM", () => {
    assert.equal(isBasemapId("positron"), true);
    assert.equal(isBasemapId("brand-light"), true);
    assert.equal(isBasemapId("not-a-map"), false);

    const style = getBasemapStyle("positron");
    assert.ok(isRecord(style));
    assert.equal(style.version, 8);
    assert.equal(style.name, "positron-raster");
    const tile = firstRasterTile(style);
    if (cartoBasemapKeyPresent()) {
      assert.match(tile, /cartocdn\.com\/light_all/);
      assert.match(tile, /[?&]key=/);
    } else {
      assert.match(tile, /tile\.openstreetmap\.org/);
      assert.equal(tile.includes("cartocdn.com"), false);
    }
  });

  it("never emits unkeyed Carto tile URLs for positron or dark", () => {
    const prev = process.env.NEXT_PUBLIC_CARTO_API_KEY;
    try {
      delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
      for (const id of ["positron", "dark"] as const) {
        const tile = firstRasterTile(getBasemapStyle(id));
        assert.equal(tile.includes("cartocdn.com"), false);
        assert.match(tile, /tile\.openstreetmap\.org/);
      }

      process.env.NEXT_PUBLIC_CARTO_API_KEY = "test-not-a-real-key";
      const positron = firstRasterTile(getBasemapStyle("positron"));
      const dark = firstRasterTile(getBasemapStyle("dark"));
      assert.match(positron, /cartocdn\.com\/light_all/);
      assert.match(dark, /cartocdn\.com\/dark_all/);
      assert.match(positron, /[?&]key=/);
      assert.match(dark, /[?&]key=/);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
      else process.env.NEXT_PUBLIC_CARTO_API_KEY = prev;
    }
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

  it("hides Gelap and rewrites ?basemap=dark when the Carto key is absent", () => {
    const prev = process.env.NEXT_PUBLIC_CARTO_API_KEY;
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
    try {
      delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
      assert.equal(isBasemapId("dark"), false);
      assert.equal(normalizeBasemapId("dark"), "positron");
      assert.equal(isBasemapId("positron"), true);
      const ids = visibleBasemapOptions().map((option) => option.id);
      assert.equal(ids.includes("dark"), false);
      assert.ok(ids.includes("positron"));
      assert.ok(ids.includes("sentinel"));
      assert.ok(ids.includes("brand-dark"));
      const rewritten = rewriteHiddenDarkBasemap("basemap=dark&z=11");
      assert.ok(rewritten);
      const params = new URLSearchParams(rewritten ?? "");
      assert.equal(params.get("basemap"), "positron");
      assert.equal(params.get("z"), "11");

      process.env.NEXT_PUBLIC_CARTO_API_KEY = "present";
      assert.equal(isBasemapId("dark"), true);
      assert.equal(normalizeBasemapId("dark"), "dark");
      assert.equal(rewriteHiddenDarkBasemap("basemap=dark&z=11"), null);
      assert.ok(visibleBasemapOptions().some((option) => option.id === "dark"));
      assert.equal(id.map.basemapBrandDark, "Gelap merek");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
      else process.env.NEXT_PUBLIC_CARTO_API_KEY = prev;
    }
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
    assert.equal(water?.paint?.["fill-color"], DARK_WATER);
    assert.equal(DARK_WATER, "#4D807B");
  });

  it("keeps Minimalist Grey on the ink scale except forest on admin and paper on water labels", () => {
    const style = buildBrandBasemapStyle("brand-grey");
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

  it("prefers the Aceh extract when configured, else OpenFreeMap", () => {
    const prevAceh = process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES;
    delete process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES;
    try {
      const ofm = resolveBrandVectorTilesSource();
      assert.equal(ofm.kind, "openfreemap");
      assert.equal(ofm.url, OPENFREEMAP_TILEJSON);

      const local = resolveBrandVectorTilesSource({ localAcehOsmPresent: true });
      assert.equal(local.kind, "aceh-pmtiles");
      assert.equal(local.url, "pmtiles:///tiles/aceh-osm.pmtiles");

      const remote = buildBrandBasemapStyle("brand-light", {
        acehOsmUrl: "https://cdn.example.com/aceh-osm.pmtiles",
      });
      const source = remote.sources.openmaptiles as {
        url?: string;
        attribution?: string;
      };
      assert.equal(source.url, "pmtiles://https://cdn.example.com/aceh-osm.pmtiles");
      assert.match(source.attribution ?? "", /Aceh extract/);

      process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES = "/tiles/aceh-osm.pmtiles";
      const fromEnv = resolveBrandVectorTilesSource();
      assert.equal(fromEnv.kind, "aceh-pmtiles");
      assert.equal(fromEnv.url, "pmtiles:///tiles/aceh-osm.pmtiles");

      const fallback = getBasemapStyle("brand-light", { rasterFallback: true });
      assert.equal(fallback, BASEMAP_RASTER.positron);
    } finally {
      if (prevAceh === undefined) delete process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES;
      else process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES = prevAceh;
    }
  });
});
