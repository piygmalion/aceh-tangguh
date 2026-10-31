import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COLOR_TOKENS } from "./layer-colors";
import { STATUS_HEX } from "./chart-colors";

describe("INS-47 warna AWAS peta", () => {
  it("sama dengan kartu Peringatan Dini (#C8102E) dan --map-status-awas", () => {
    assert.equal(COLOR_TOKENS.awas, STATUS_HEX.AWAS);
    assert.equal(COLOR_TOKENS.awas.toLowerCase(), "#c8102e");
    const css = readFileSync("src/app/globals.css", "utf8");
    assert.match(css, /--map-status-awas:\s*#c8102e/i);
    assert.equal(COLOR_TOKENS.awasOutline, "#111111");
  });
});

import { AWAS_HALO_WIDTH_PX, AWAS_OUTLINE_BY_THEME, awasOutlineFor } from "./layer-colors";
import { mapThemeForBasemap } from "./map-marker-chrome";

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
}
function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe("INS-47 halo AWAS per tema", () => {
  it("terang #111, gelap halo paper #F7F7F4 1,5px dari token", () => {
    assert.equal(awasOutlineFor("light"), "#111111");
    assert.equal(awasOutlineFor("dark").toUpperCase(), "#F7F7F4");
    assert.equal(AWAS_OUTLINE_BY_THEME.dark, COLOR_TOKENS.paper);
    assert.equal(AWAS_HALO_WIDTH_PX, 1.5);
  });
  it("halo gelap lolos 3:1 terhadap #1A1A17", () => {
    assert.ok(contrast(awasOutlineFor("dark"), COLOR_TOKENS.ink) >= 3);
  });
  it("tema dari basemap", () => {
    assert.equal(mapThemeForBasemap("positron"), "light");
    assert.equal(mapThemeForBasemap("brand-dark"), "dark");
  });
  it("MapOverlays dan NASA tidak hardcode outline AWAS", () => {
    for (const f of ["src/components/map/MapOverlays.tsx", "src/components/map/NasaNrtOverlays.tsx"]) {
      const src = readFileSync(f, "utf8");
      assert.match(src, /awasOutlineFor\(theme\)/);
      assert.doesNotMatch(src, /COLOR_TOKENS\.awasOutline/);
    }
  });
});
