import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import sharp from "sharp";
import { HeroPhotoBackdrop, HeroPhotoCaption } from "@/components/beranda/HeroPhotoBackdrop";
import { HERO_PHOTO_ENABLED } from "@/lib/media";
import {
  HERO_PANEL_ALPHA,
  HERO_PHOTO,
  HERO_PHOTO_ALT,
  HERO_PHOTO_CREDIT,
  heroBackgroundMode,
  heroPhotoCaption,
  heroScrimAlpha,
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
    assert.equal(HERO_PHOTO_ENABLED, true);
    assert.equal(HERO_PHOTO.alt, HERO_PHOTO_ALT);
    assert.equal(
      HERO_PHOTO.alt,
      "Foto udara kawasan permukiman di Aceh pascabanjir 2025, di tepi sungai, dengan bangunan rusak dan genangan lumpur",
    );
    assert.equal(HERO_PHOTO.lokasi, "Aceh");
    assert.equal(HERO_PHOTO.waktu, "2025");
    assert.equal(HERO_PHOTO.keadaan, "Pascabanjir");
    assert.equal(
      heroPhotoCaption(HERO_PHOTO),
      "Pascabanjir Aceh, 2025 · Foto aerial DJI — dokumentasi Aceh Tangguh",
    );
    assert.equal(heroPhotoCaption(null), null);
    assert.equal(heroPhotoCaption({ lokasi: "Aceh Besar" }), null);
    assert.equal(heroPhotoCaption({ waktu: "2024" }), null);
    assert.equal(
      heroPhotoCaption({ lokasi: "Aceh Besar", waktu: "2024" }),
      `Aceh Besar, 2024 · ${HERO_PHOTO_CREDIT}`,
    );
    assert.equal(
      heroPhotoCaption({ keadaan: "Pascabanjir", lokasi: "Aceh", waktu: "2025" }),
      "Pascabanjir Aceh, 2025 · Foto aerial DJI — dokumentasi Aceh Tangguh",
    );
    assert.doesNotMatch(heroPhotoCaption(HERO_PHOTO) ?? "", /CONTOH|kabupaten|Januari|Februari|Maret/);
    const on = renderToStaticMarkup(
      createElement(HeroPhotoBackdrop, { failed: false, enabled: true, onError() {} }),
    );
    assert.match(on, /data-hero-bg="photo"/);
    assert.match(on, new RegExp(`alt="${HERO_PHOTO.alt}"`));
    assert.doesNotMatch(on, /Foto aerial DJI, dokumentasi/);
    const off = renderToStaticMarkup(
      createElement(HeroPhotoBackdrop, { failed: false, enabled: false, onError() {} }),
    );
    assert.equal(off, "");
    assert.doesNotMatch(on, /data-hero-caption/);
    const captioned = renderToStaticMarkup(
      createElement(HeroPhotoCaption, {
        meta: { keadaan: "Pascabanjir", lokasi: "Aceh Besar", waktu: "2024" },
      }),
    );
    assert.match(captioned, /data-hero-caption/);
    assert.match(captioned, /Pascabanjir Aceh Besar, 2024 · Foto aerial DJI — dokumentasi Aceh Tangguh/);
    assert.match(captioned, /text-\[0\.8125rem\]/);
    assert.match(captioned, /bg-\[#111111\]\/90/);
    assert.match(captioned, /ml-auto mt-3 w-fit/);
    assert.match(captioned, /md:mt-4/);
    assert.doesNotMatch(captioned, /absolute/);
    const liveCaption = renderToStaticMarkup(createElement(HeroPhotoCaption, { meta: HERO_PHOTO }));
    assert.match(liveCaption, /Pascabanjir Aceh, 2025 · Foto aerial DJI — dokumentasi Aceh Tangguh/);
    assert.doesNotMatch(liveCaption, /CONTOH/);
    assert.equal(
      renderToStaticMarkup(createElement(HeroPhotoCaption, { meta: { lokasi: "", waktu: "", keadaan: "" } })),
      "",
    );
    const hero = read("src/components/beranda/DataHero.tsx");
    const backdrop = read("src/components/beranda/HeroPhotoBackdrop.tsx");
    assert.match(hero, /HeroPhotoBackdrop/);
    assert.match(hero, /\{onPhoto \? <HeroPhotoCaption \/> : null\}/);
    assert.match(hero, /onPhoto && "pb-6 md:pb-8"/);
    assert.match(hero, /section-y-spacious relative scroll-mt-24 overflow-hidden px-4 !pt-28 md:!pt-32/);
    assert.match(read("src/lib/media.ts"), /foto dokumentasi banjir Aceh 2025/);
    assert.match(read("src/lib/media.ts"), /Kabupaten dan bulan tidak diketahui/);
    assert.match(read("public/media/CREDITS.md"), /foto dokumentasi banjir Aceh 2025/);
    assert.match(read("public/media/CREDITS.md"), /Kabupaten dan bulan tidak diketahui/);
    assert.match(backdrop, /placeholder="blur"/);
    assert.match(backdrop, /blurDataURL/);
    assert.match(backdrop, /fill/);
    assert.match(read("src/components/beranda/HeroPhotoBackdrop.tsx"), /priority/);
    assert.match(read("src/components/beranda/HeroPhotoBackdrop.tsx"), /sizes="100vw"/);
    assert.match(read("next.config.mjs"), /image\/avif/);
    assert.match(read("next.config.mjs"), /image\/webp/);
  });

  it("falls back to the plain contour background when the photo fails or is missing", () => {
    assert.equal(heroBackgroundMode(HERO_PHOTO, false, true), "photo");
    assert.equal(heroBackgroundMode(HERO_PHOTO, false, false), "plain");
    assert.equal(heroBackgroundMode(HERO_PHOTO, false), "photo");
    assert.equal(heroBackgroundMode(HERO_PHOTO, true, true), "plain");
    assert.equal(heroBackgroundMode({ src: "" }, false, true), "plain");
    assert.equal(heroBackgroundMode(null, false, true), "plain");
    const html = renderToStaticMarkup(
      createElement(HeroPhotoBackdrop, { failed: true, enabled: true, onError() {} }),
    );
    assert.equal(html, "");
    const hero = read("src/components/beranda/DataHero.tsx");
    assert.match(hero, /heroBackgroundMode/);
    assert.match(hero, /setPhotoFailed\(true\)/);
    assert.match(hero, /opacity-\[0\.07\]/);
    assert.match(hero, /onPhoto \? null :/);
    const bars = read("src/components/beranda/YearBars.tsx");
    assert.match(bars, /bg-\[var\(--chart-surface\)\]/);
    assert.match(bars, /rounded-2xl bg-\[rgba\(17,17,17,0\.66\)\]/);
    assert.match(bars, /backdrop-blur-\[8px\]/);
    assert.match(bars, /fill="#ffffff"/);
  });

  it("keeps the 1440 derivative under 250KB and the scrim at AA on the photo pixels", async () => {
    const rel = "public/media/hero-beranda/dji-03-1440.webp";
    assert.equal(existsSync(rel), true);
    const bytes = statSync(rel).size;
    assert.ok(bytes < 250 * 1024, `hero derivative is ${bytes} bytes`);
    assert.ok(bytes > 20 * 1024, "derivative should still be a real photograph");
    const backdrop = read("src/components/beranda/HeroPhotoBackdrop.tsx");
    assert.match(backdrop, /rgba\(17,17,17,0\.72\)/);
    assert.match(backdrop, /rgba\(17,17,17,0\.50\)_55%/);
    assert.match(backdrop, /rgba\(17,17,17,0\.46\)/);
    assert.match(backdrop, /object-\[center_58%\]/);
    assert.match(backdrop, /border-\[var\(--border\)\]/);
    assert.doesNotMatch(backdrop, /mask-image/);

    const measured = await measureHero(join(process.cwd(), rel));
    assert.ok(measured.headline >= 4.5, `headline ${measured.headline}`);
    assert.ok(measured.kicker >= 4.5, `kicker ${measured.kicker}`);
    assert.ok(measured.body >= 4.5, `body ${measured.body}`);
    assert.ok(measured.chartTitle >= 4.5, `chart title ${measured.chartTitle}`);
    assert.ok(measured.ticks >= 4.5, `ticks ${measured.ticks}`);
    assert.ok(measured.whiteBar >= 3, `white bar ${measured.whiteBar}`);
    assert.ok(measured.hatch >= 3, `hatch ${measured.hatch}`);
    assert.ok(measured.redOutline >= 3, `2020 outline ${measured.redOutline}`);
    assert.ok(measured.redOnOutline >= 3, `2020 red on outline ${measured.redOnOutline}`);
    assert.ok(contrast(BUTTON_INK, WHITE) >= 4.5);
    assert.ok(measured.mobileHeadline >= 4.5, `mobile headline ${measured.mobileHeadline}`);
  });
});

async function coverRaw(file: string, width: number, height: number, posY: number) {
  const meta = await sharp(file).metadata();
  const sw = meta.width ?? width;
  const sh = meta.height ?? height;
  const scale = Math.max(width / sw, height / sh);
  const nw = Math.max(width, Math.round(sw * scale));
  const nh = Math.max(height, Math.round(sh * scale));
  const { data, info } = await sharp(file).resize(nw, nh).raw().toBuffer({ resolveWithObject: true });
  const left = Math.max(0, Math.min(nw - width, Math.round(0.5 * nw - width / 2)));
  const top = Math.max(0, Math.min(nh - height, Math.round(posY * nh - height / 2)));
  const out = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    const src = ((top + y) * info.width + left) * 3;
    data.copy(out, y * width * 3, src, src + width * 3);
  }
  return { data: out, width, height };
}

function scrimmed(
  rgb: readonly [number, number, number],
  alpha: number,
): [number, number, number] {
  return [
    Math.round(INK[0] * alpha + rgb[0] * (1 - alpha)),
    Math.round(INK[1] * alpha + rgb[1] * (1 - alpha)),
    Math.round(INK[2] * alpha + rgb[2] * (1 - alpha)),
  ];
}

function panelOf(bg: readonly [number, number, number]): [number, number, number] {
  return scrimmed(bg, HERO_PANEL_ALPHA);
}

async function measureHero(file: string) {
  const desk = await coverRaw(file, 360, 140, 0.58);
  const mobile = await coverRaw(file, 130, 220, 0.58);
  let headline = Infinity;
  let kicker = Infinity;
  let body = Infinity;
  let chartTitle = Infinity;
  let ticks = Infinity;
  let whiteBar = Infinity;
  let hatch = Infinity;
  let redOutline = Infinity;
  const visit = (
    frame: { data: Buffer; width: number; height: number },
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    onText: (ratio: number) => void,
    onChart: boolean,
  ) => {
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const i = (y * frame.width + x) * 3;
        const photo: [number, number, number] = [frame.data[i], frame.data[i + 1], frame.data[i + 2]];
        const bg = scrimmed(photo, heroScrimAlpha(x / (frame.width - 1)));
        onText(contrast(WHITE, bg));
        if (!onChart) continue;
        const panel = panelOf(bg);
        chartTitle = Math.min(chartTitle, contrast(WHITE, panel));
        ticks = Math.min(ticks, contrast(WHITE, panel));
        const bar: [number, number, number] = [
          Math.round(255 * 0.9 + panel[0] * 0.1),
          Math.round(255 * 0.9 + panel[1] * 0.1),
          Math.round(255 * 0.9 + panel[2] * 0.1),
        ];
        whiteBar = Math.min(whiteBar, contrast(bar, panel));
        const hatched: [number, number, number] = [
          Math.round(255 * 0.35 + panel[0] * 0.65),
          Math.round(255 * 0.35 + panel[1] * 0.65),
          Math.round(255 * 0.35 + panel[2] * 0.65),
        ];
        hatch = Math.min(hatch, contrast(hatched, panel));
        redOutline = Math.min(redOutline, contrast(WHITE, panel));
      }
    }
  };
  const left = Math.round(desk.width * 0.42);
  visit(desk, 4, left, Math.round(desk.height * 0.12), Math.round(desk.height * 0.28), (ratio) => {
    kicker = Math.min(kicker, ratio);
  }, false);
  visit(desk, 4, left, Math.round(desk.height * 0.22), Math.round(desk.height * 0.5), (ratio) => {
    headline = Math.min(headline, ratio);
  }, false);
  visit(desk, 4, left, Math.round(desk.height * 0.42), Math.round(desk.height * 0.7), (ratio) => {
    body = Math.min(body, ratio);
  }, false);
  visit(desk, Math.round(desk.width * 0.5), desk.width - 2, 8, desk.height - 2, () => {}, true);
  let mobileHeadline = Infinity;
  visit(mobile, 4, Math.round(mobile.width * 0.92), 8, Math.round(mobile.height * 0.42), (ratio) => {
    mobileHeadline = Math.min(mobileHeadline, ratio);
  }, false);
  return {
    headline,
    kicker,
    body,
    chartTitle,
    ticks,
    whiteBar,
    hatch,
    redOutline,
    redOnOutline: contrast(RED, WHITE),
    mobileHeadline,
  };
}
