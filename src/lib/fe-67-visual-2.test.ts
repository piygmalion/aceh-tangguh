import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function channel(hex: string, index: number) {
  const n = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const [r, g, b] = [0, 1, 2].map((i) => channel(hex, i));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function compositeWhite(bg: string, alpha: number) {
  const n = parseInt(bg.slice(1), 16);
  const mix = (shift: number) =>
    Math.round(255 * alpha + ((n >> shift) & 255) * (1 - alpha))
      .toString(16)
      .padStart(2, "0");
  return `#${mix(16)}${mix(8)}${mix(0)}`;
}

describe("FE-67 visual-2", () => {
  it("draws the hero bars on the chart surface and hatches only the open year", () => {
    const bars = read("src/components/beranda/YearBars.tsx");
    const hero = read("src/components/beranda/DataHero.tsx");
    assert.match(bars, /bg-\[var\(--chart-surface\)\]/);
    assert.match(bars, /var\(--chart-2\)/);
    assert.match(bars, /HERO_BAR_HIGHLIGHT_YEAR/);
    assert.match(bars, /runningYear/);
    assert.match(bars, /url\(#\$\{hatchId\}\)/);
    assert.match(bars, /x=\{berjalanX - 4\}/);
    assert.match(bars, /textAnchor="end"/);
    assert.match(bars, /y1=\{labelBaseline \+ 7\}/);
    assert.doesNotMatch(bars, /BERJALAN_YEAR/);
    assert.match(bars, /fontSize="13"/);
    assert.match(bars, /index % 2 === 0/);
    assert.match(bars, /max-sm:pr-16/);
    assert.match(hero, /opacity-\[0\.07\]/);
    assert.doesNotMatch(hero, /AreaChart/);
    assert.doesNotMatch(bars, /#C8102E|#c8102e/);
  });

  it("dashes five sparklines and leaves the Hilang tile as an empty slot", () => {
    const hero = read("src/components/beranda/DataHero.tsx");
    const spark = read("src/components/beranda/MetricSpark.tsx");
    assert.match(hero, /bandShowsSparklines/);
    assert.match(hero, /statistik\.hilang[\s\S]{0,240}spark\(null\)/);
    assert.match(hero, /data-hilang-slot/);
    assert.doesNotMatch(hero, /spark\("hilang"\)/);
    assert.match(hero, /spark\("kejadian"\)/);
    assert.match(hero, /statistik\.scaleNote/);
    assert.match(hero, /data-testid="number-band-block"/);
    assert.match(spark, /text-\[var\(--band-fg\)\]/);
    assert.match(spark, /strokeDasharray="2 2"/);
    assert.match(spark, /opacity="0\.55"/);
    assert.match(spark, /r="2"/);
    assert.match(spark, /fill="none"/);
    assert.doesNotMatch(spark, /patternTransform|chart-2|#C8102E|#c8102e/);
    const id = JSON.parse(read("messages/id.json")) as {
      beranda: { statistik: Record<string, string> };
      laporHub: Record<string, string>;
    };
    const en = JSON.parse(read("messages/en.json")) as {
      beranda: { statistik: Record<string, string> };
      laporHub: Record<string, string>;
    };
    assert.equal(id.beranda.statistik.scaleNote, "skala per metrik · {year} berjalan");
    assert.equal(en.beranda.statistik.scaleNote, "per-metric scale · {year} ongoing");
    assert.equal(id.beranda.statistik.scaleNotePlain, "skala per metrik");
    assert.equal(en.beranda.statistik.scaleNotePlain, "per-metric scale");
    assert.doesNotMatch(id.beranda.statistik.scaleNote, /2026/);
    assert.equal(id.beranda.statistik.berjalan, "berjalan");
    assert.equal(id.laporHub.kicker, "Partisipasi warga");
    assert.equal(en.laporHub.kicker, "Public participation");
    assert.equal(
      id.laporHub.helper,
      "Laporan dimoderasi petugas BPBA sebelum dapat tampil di peta. Jangan sertakan data pribadi orang lain.",
    );
    assert.equal(
      en.laporHub.helper,
      "Reports are moderated by BPBA staff before they can appear on the map. Do not include other people's personal data.",
    );
    const hub = read("src/components/laporan/ReportChoiceHub.tsx");
    assert.match(hub, /text-\[var\(--eyebrow\)\][\s\S]{0,40}t\("kicker"\)/);
    assert.doesNotMatch(hub, /text-\[var\(--accent-soft\)\][\s\S]{0,40}t\("kicker"\)/);
  });

  it("adds the settings scroll hint, hides the mobile status card, and notes the canvas hole", () => {
    const settings = read("src/components/map/MapSettings.tsx");
    const workspace = read("src/components/map/MapWorkspace.tsx");
    assert.match(settings, /data-settings-scroll-fade/);
    assert.match(settings, /observer\?\.observe\(el\.firstElementChild\)/);
    assert.match(settings, /max-sm:max-h-\[calc\(100svh-19\.75rem\)\]/);
    assert.match(settings, /terlihat di tangkapan headless/);
    assert.match(workspace, /settingsOpen && "hidden"/);
  });

  it("paints the kabupaten and IRBI bars with one brand red", () => {
    const css = read("src/app/globals.css");
    const darkAt = css.indexOf('html[data-theme="dark"]');
    const light = css.slice(0, darkAt);
    const dark = css.slice(darkAt);
    assert.match(light, /--chart-bar:\s*#c8102e/);
    assert.match(dark, /--chart-bar:\s*#f25563/);
    assert.ok(contrastRatio("#c8102e", "#ffffff") >= 3);
    assert.ok(contrastRatio("#c8102e", "#1a1a1a") < 3);
    assert.ok(contrastRatio("#f25563", "#1a1a1a") >= 3);
    assert.ok(contrastRatio("#f25563", "#0a0a0a") >= 3);
    const hero = read("src/components/beranda/DataHero.tsx");
    assert.match(hero, /className="bg-\[var\(--chart-bar\)\]"/);
    assert.doesNotMatch(hero, /bg-\[var\(--chart-1\)\]|bg-\[var\(--chart-2\)\]/);
    const format = read("src/components/beranda/format.ts");
    assert.match(format, /return "bg-\[var\(--chart-bar\)\]"/);
    assert.match(format, /bg-\[#FF7722\]/);
    assert.match(format, /bg-\[#C4A35A\]/);
    assert.match(format, /bg-\[#1F4C15\]/);
    const ladder = read("src/components/beranda/RisikoLadder.tsx");
    assert.match(ladder, /kelasRisikoChip\(kab\.kelas_risiko\)/);
    assert.match(ladder, /kelasRisikoBar\(kab\.kelas_risiko\)/);
    assert.match(ladder, /text-\[var\(--text-dim\)\]/);
    const bars = read("src/components/beranda/YearBars.tsx");
    assert.match(bars, /var\(--chart-2\)/);
    assert.doesNotMatch(bars, /--chart-bar/);
  });

  it("lays the red number band on one shared baseline", () => {
    const css = read("src/app/globals.css");
    const darkAt = css.indexOf('html[data-theme="dark"]');
    const light = css.slice(0, darkAt);
    const dark = css.slice(darkAt);
    assert.match(light, /--band-bg:\s*#c8102e/);
    assert.match(dark, /--band-bg:\s*#c8102e/);
    assert.match(light, /--band-fg:\s*#ffffff/);
    assert.match(light, /--band-dim:\s*rgba\(255,\s*255,\s*255,\s*0\.85\)/);
    assert.match(light, /--band-rule:\s*#8e1224/);
    assert.ok(contrastRatio("#ffffff", "#c8102e") >= 4.5);
    assert.ok(contrastRatio(compositeWhite("#c8102e", 0.85), "#c8102e") >= 4.5);
    const hero = read("src/components/beranda/DataHero.tsx");
    assert.match(hero, /min-h-\[2\.5rem\]/);
    assert.match(hero, /min-h-\[3\.25rem\]/);
    assert.match(hero, /bg-white\/20/);
    assert.match(hero, /border-\[var\(--band-rule\)\]/);
    assert.doesNotMatch(hero, /data-ink-field/);
    const spark = read("src/components/beranda/MetricSpark.tsx");
    assert.match(spark, /text-\[var\(--band-fg\)\]/);
    assert.match(spark, /opacity="0\.55"/);
    assert.match(spark, /fill="none"/);
    const figure = read("src/components/beranda/primitives.tsx");
    assert.match(figure, /flex items-baseline/);
    assert.match(figure, /tone === "band" \? "text-\[var\(--band-fg\)\]"/);
  });

  it("shows the invitation card once on desktop and keeps a 56px FAB", () => {
    const bot = read("src/components/panduan/GuideBot.tsx");
    const store = read("src/lib/panduan/open-tanggapi.ts");
    const footer = read("src/components/SiteFooter.tsx");
    assert.match(bot, /hidden max-w-\[16rem\] sm:block/);
    assert.match(bot, /setTimeout\(dismiss, 6000\)/);
    assert.match(bot, /shouldShowTanggapiInvite/);
    assert.match(bot, /h-14 w-14/);
    assert.match(store, /localStorage/);
    assert.doesNotMatch(store, /sessionStorage\.setItem\(TANGGAPI_BUBBLE_STORAGE/);
    assert.match(footer, /pb-20/);
    assert.match(footer, /sm:pb-10/);
  });
});
