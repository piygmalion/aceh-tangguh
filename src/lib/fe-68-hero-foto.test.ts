import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import sharp from "sharp";
import { HeroPhotoBackdrop } from "@/components/beranda/HeroPhotoBackdrop";
import { SITE_MEDIA } from "@/lib/media";
import {
  HERO_PHOTO,
  HERO_SCRIM_LEFT,
  HERO_SCRIM_RIGHT,
  heroBackgroundMode,
  heroPhotoCaption,
} from "@/lib/hero-photo";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function channel(value: number) {
  const n = value / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: readonly [number, number, number]) {
  const [r, g, b] = rgb.map((c) => channel(c));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: readonly [number, number, number], bg: readonly [number, number, number]) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [200, 16, 46];
const INK: [number, number, number] = [17, 17, 17];
const BUTTON_INK: [number, number, number] = [17, 17, 17];

describe("FE-68 hero photo", () => {
  it("renders the DJI photo with the Indonesian alt and no invented caption", () => {
    assert.equal(HERO_PHOTO.alt, "Foto aerial DJI — permukiman, sungai, dan perbukitan Aceh");
    assert.equal(HERO_PHOTO.alt, SITE_MEDIA.heroSlides[2].alt);
    assert.equal(heroPhotoCaption(null), null);
    assert.equal(heroPhotoCaption({ lokasi: "Aceh", tahun: 2024 }), null);
    assert.equal(
      heroPhotoCaption({ lokasi: "Aceh Besar", tahun: 2024, sumber: "BPBA" }),
      "Foto: Aceh Besar, 2024 · BPBA",
    );
    const html = renderToStaticMarkup(
      createElement(HeroPhotoBackdrop, { failed: false, onError() {} }),
    );
    assert.match(html, /data-hero-bg="photo"/);
    assert.match(html, new RegExp(`alt="${HERO_PHOTO.alt}"`));
    assert.match(html, /Foto aerial DJI — permukiman, sungai, dan perbukitan Aceh/);
    assert.doesNotMatch(html, /Foto: /);
    const hero = read("src/components/beranda/DataHero.tsx");
    const backdrop = read("src/components/beranda/HeroPhotoBackdrop.tsx");
    assert.match(hero, /HeroPhotoBackdrop/);
    assert.match(backdrop, /placeholder="blur"/);
    assert.match(backdrop, /blurDataURL/);
    assert.match(backdrop, /fill/);
    assert.match(read("src/components/beranda/HeroPhotoBackdrop.tsx"), /priority/);
    assert.match(read("src/components/beranda/HeroPhotoBackdrop.tsx"), /sizes="100vw"/);
    assert.match(read("next.config.mjs"), /image\/avif/);
    assert.match(read("next.config.mjs"), /image\/webp/);
  });

  it("falls back to the plain contour background when the photo fails or is missing", () => {
    assert.equal(heroBackgroundMode(HERO_PHOTO, false), "photo");
    assert.equal(heroBackgroundMode(HERO_PHOTO, true), "plain");
    assert.equal(heroBackgroundMode({ src: "" }, false), "plain");
    assert.equal(heroBackgroundMode(null, false), "plain");
    const html = renderToStaticMarkup(
      createElement(HeroPhotoBackdrop, { failed: true, onError() {} }),
    );
    assert.equal(html, "");
    const hero = read("src/components/beranda/DataHero.tsx");
    assert.match(hero, /heroBackgroundMode/);
    assert.match(hero, /setPhotoFailed\(true\)/);
    assert.match(hero, /opacity-\[0\.07\]/);
    assert.match(hero, /onPhoto \? null :/);
    const bars = read("src/components/beranda/YearBars.tsx");
    assert.match(bars, /bg-\[var\(--chart-surface\)\]/);
    assert.match(bars, /onPhoto \? "bg-transparent text-white"/);
  });

  it("keeps the 1440 derivative under 250KB and the scrim at AA on the photo pixels", async () => {
    const rel = "public/media/hero-beranda/dji-03-1440.webp";
    assert.equal(existsSync(rel), true);
    const bytes = statSync(rel).size;
    assert.ok(bytes < 250 * 1024, `hero derivative is ${bytes} bytes`);
    assert.ok(bytes > 20 * 1024, "derivative should still be a real photograph");

    const { data, info } = await sharp(join(process.cwd(), rel))
      .resize(360, 155, { fit: "cover", position: "centre" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 3);
    let worstWhite = Infinity;
    let worstRed = Infinity;
    let worstBar = Infinity;
    const width = info.width;
    for (let i = 0; i < data.length; i += 3) {
      const x = (i / 3) % width;
      const alpha = HERO_SCRIM_LEFT + (HERO_SCRIM_RIGHT - HERO_SCRIM_LEFT) * (x / (width - 1));
      const bg: [number, number, number] = [
        Math.round(INK[0] * alpha + data[i] * (1 - alpha)),
        Math.round(INK[1] * alpha + data[i + 1] * (1 - alpha)),
        Math.round(INK[2] * alpha + data[i + 2] * (1 - alpha)),
      ];
      worstWhite = Math.min(worstWhite, contrast(WHITE, bg));
      worstRed = Math.min(worstRed, contrast(RED, bg));
      const bar: [number, number, number] = [
        Math.round(255 * 0.9 + bg[0] * 0.1),
        Math.round(255 * 0.9 + bg[1] * 0.1),
        Math.round(255 * 0.9 + bg[2] * 0.1),
      ];
      worstBar = Math.min(worstBar, contrast(bar, bg));
    }
    assert.ok(worstWhite >= 4.5, `white text ${worstWhite}`);
    assert.ok(worstRed >= 3, `2020 red bar ${worstRed}`);
    assert.ok(worstBar >= 3, `white bar ${worstBar}`);
    assert.ok(contrast(BUTTON_INK, WHITE) >= 4.5);
  });
});
