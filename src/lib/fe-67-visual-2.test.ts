import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("FE-67 visual-2", () => {
  it("draws the hero bars on the chart surface and hatches only the open year", () => {
    const bars = read("src/components/beranda/YearBars.tsx");
    const hero = read("src/components/beranda/DataHero.tsx");
    assert.match(bars, /bg-\[var\(--chart-surface\)\]/);
    assert.match(bars, /var\(--chart-2\)/);
    assert.match(bars, /HERO_BAR_HIGHLIGHT_YEAR/);
    assert.match(bars, /BERJALAN_YEAR/);
    assert.match(bars, /fontSize="13"/);
    assert.match(bars, /index % 2 === 0/);
    assert.match(bars, /max-sm:pr-16/);
    assert.match(hero, /opacity-\[0\.07\]/);
    assert.doesNotMatch(hero, /AreaChart/);
    assert.doesNotMatch(bars, /#C8102E|#c8102e/);
  });

  it("keeps sparklines on the year-range payload and leaves Hilang as a number", () => {
    const hero = read("src/components/beranda/DataHero.tsx");
    const spark = read("src/components/beranda/MetricSpark.tsx");
    assert.match(hero, /bandShowsSparklines/);
    assert.match(hero, /spark\(null\)/);
    assert.match(hero, /statistik\.scaleNote/);
    assert.match(hero, /data-testid="number-band-block"/);
    assert.match(spark, /text-\[var\(--band-fg\)\]/);
    assert.doesNotMatch(spark, /chart-2|#C8102E|#c8102e/);
    const id = JSON.parse(read("messages/id.json")) as {
      beranda: { statistik: Record<string, string> };
      laporHub: Record<string, string>;
    };
    const en = JSON.parse(read("messages/en.json")) as {
      beranda: { statistik: Record<string, string> };
      laporHub: Record<string, string>;
    };
    assert.equal(id.beranda.statistik.scaleNote, "skala per metrik · 2026 berjalan");
    assert.equal(en.beranda.statistik.scaleNote, "per-metric scale · 2026 ongoing");
    assert.equal(id.beranda.statistik.berjalan, "berjalan");
    assert.equal(id.laporHub.kicker, "Partisipasi warga");
    assert.equal(en.laporHub.kicker, "Public participation");
    assert.match(id.laporHub.helper, /moderasi/);
    assert.match(en.laporHub.helper, /moderation/);
    const hub = read("src/components/laporan/ReportChoiceHub.tsx");
    assert.match(hub, /text-\[var\(--eyebrow\)\][\s\S]{0,40}t\("kicker"\)/);
    assert.doesNotMatch(hub, /text-\[var\(--accent-soft\)\][\s\S]{0,40}t\("kicker"\)/);
  });

  it("adds the settings scroll hint, hides the mobile status card, and notes the canvas hole", () => {
    const settings = read("src/components/map/MapSettings.tsx");
    const workspace = read("src/components/map/MapWorkspace.tsx");
    assert.match(settings, /data-settings-scroll-fade/);
    assert.match(settings, /terlihat di tangkapan headless/);
    assert.match(workspace, /settingsOpen && "hidden"/);
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
