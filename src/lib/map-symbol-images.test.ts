import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isKnockoutRgb, thickenGlyphPixels } from "./map-symbol-images";

describe("map chrome glyph knockout", () => {
  it("drops paper and charcoal fills but keeps neon strokes", () => {
    assert.equal(isKnockoutRgb(244, 245, 244), true);
    assert.equal(isKnockoutRgb(29, 29, 29), true);
    assert.equal(isKnockoutRgb(254, 127, 19), false);
    assert.equal(isKnockoutRgb(220, 40, 40), false);
  });

  it("dilates a thin neon stroke so neighbors become opaque", () => {
    const width = 4;
    const height = 4;
    const pixels = new Uint8ClampedArray(width * height * 4);
    const i = (2 * width + 2) * 4;
    pixels[i] = 254;
    pixels[i + 1] = 127;
    pixels[i + 2] = 19;
    pixels[i + 3] = 255;
    const next = thickenGlyphPixels(pixels, width, height);
    const neighbor = (2 * width + 1) * 4;
    assert.ok(next[neighbor + 3] > 0);
    assert.ok(next[i] >= 254);
  });
});
