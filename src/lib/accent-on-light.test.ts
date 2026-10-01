import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function channel(hex: string, index: number) {
  const n = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const [r, g, b] = [0, 1, 2].map((i) => channel(hex, i));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio. Order does not matter. */
export function contrastRatio(fg: string, bg: string) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

describe("accent on a light surface", () => {
  it("keeps #C8102E in both themes and clears 4.5:1 on white", () => {
    const css = read("src/app/globals.css");
    const darkAt = css.indexOf('html[data-theme="dark"]');
    assert.ok(darkAt > 0);
    const light = css.slice(0, darkAt);
    const dark = css.slice(darkAt);
    assert.match(light, /--accent-on-light:\s*#c8102e/i);
    assert.equal(
      /--accent-on-light\s*:/.test(dark),
      false,
      "dark theme must not flip --accent-on-light",
    );
    const onWhite = contrastRatio("#c8102e", "#ffffff");
    assert.ok(onWhite >= 4.5, `expected >= 4.5, got ${onWhite.toFixed(2)}`);
    const eyebrowOnWhite = contrastRatio("#f4d6db", "#ffffff");
    assert.ok(eyebrowOnWhite < 4.5, "dark eyebrow on white should stay the failing pair");
  });

  it("follows the ink card: #C8102E on white, #F25563 on #111", () => {
    const css = read("src/app/globals.css");
    const darkAt = css.indexOf('html[data-theme="dark"]');
    const light = css.slice(0, darkAt);
    const dark = css.slice(darkAt);
    assert.match(light, /--accent-on-ink:\s*#f25563/i);
    assert.equal(/#ff7722/i.test(light.slice(light.indexOf("--accent-on-ink"))), false);
    assert.match(dark, /--accent-on-ink:\s*var\(--accent-on-light\)/);
    const onInk = contrastRatio("#f25563", "#111111");
    assert.ok(onInk >= 4.5, `#F25563 on #111 expected >= 4.5, got ${onInk.toFixed(2)}`);
    const redOnInk = contrastRatio("#c8102e", "#111111");
    assert.ok(redOnInk < 4.5, "peudeung red on the light-theme ink card stays below AA");
    const src = read("src/components/beranda/MasukCta.tsx");
    assert.match(src, /text-\[var\(--accent-on-ink\)\]/);
    assert.equal(/text-\[var\(--accent-on-light\)\]/.test(src), false);
    assert.equal(/text-\[var\(--eyebrow\)\]/.test(src), false);
    assert.equal(/#ff7722/i.test(src), false);
  });

  it("does not put white text on the accent fill in the report hub", () => {
    const src = read("src/components/laporan/ReportChoiceHub.tsx");
    assert.equal(
      /bg-\[var\(--accent\)\][^\n]*text-white/.test(src),
      false,
    );
    assert.match(src, /bg-\[var\(--accent\)\][^\n]*text-\[var\(--accent-fg\)\]/);
    assert.match(
      src,
      /hover:!border-\[color-mix\(in_srgb,var\(--accent\)_50%,transparent\)\]/,
    );
  });
});
