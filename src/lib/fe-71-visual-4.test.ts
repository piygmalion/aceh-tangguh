import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("FE-71 visual-4", () => {
  it("anchors the phone invite above the Tanggapi button", () => {
    const bot = read("src/components/panduan/GuideBot.tsx");
    assert.match(bot, /hidden max-w-\[16rem\] sm:block/);
    assert.match(bot, /max-md:!block max-md:max-w-\[17\.5rem\]/);
    assert.doesNotMatch(bot, /top-24/);
    assert.doesNotMatch(bot, /max-sm:fixed/);
    assert.match(bot, /setTimeout\(dismiss, 6000\)/);
    assert.match(bot, /dismissInvite/);
    assert.match(bot, /-bottom-1\.5 right-6/);
    const bubble = bot.slice(bot.indexOf('key="bubble"'), bot.indexOf("visible ? ("));
    assert.match(bubble, /relative mb-1/);
    assert.doesNotMatch(bubble, /fixed/);
  });

  it("scrolls guide chips in one row with a 44px target", () => {
    const panel = read("src/components/panduan/GuidePanel.tsx");
    const chips = panel.slice(panel.indexOf("data-guide-chips"), panel.indexOf("{tourActive"));
    assert.match(chips, /flex flex-nowrap/);
    assert.match(chips, /overflow-x-auto/);
    assert.match(chips, /snap-x snap-mandatory/);
    assert.match(chips, /min-h-\[44px\] shrink-0 snap-start/);
    assert.doesNotMatch(chips, /flex-wrap/);
  });

  it("shortens the sticky popup header after the body scrolls and closes it when the layer panel opens", () => {
    const card = read("src/components/map/MapFeatureCard.tsx");
    assert.match(card, /data-card-kicker/);
    assert.match(card, /headerCompact && "hidden"/);
    assert.match(card, /scrollTop > 0/);
    assert.match(card, /data-card-heading/);
    assert.match(card, /sticky top-0 z-20/);
    const viewport = read("src/components/map/MapViewport.tsx");
    assert.match(viewport, /aceh:close-feature-popup/);
    assert.match(viewport, /getCanvas\(\)\?\.focus\(\)/);
    assert.doesNotMatch(viewport, /setAttribute\(\s*["']tabindex["']/);
    const toolbar = read("src/components/map/MapToolbar.tsx");
    assert.match(toolbar, /aceh:close-feature-popup/);
    assert.match(toolbar, /max-width: 767px/);
    assert.match(toolbar, /env\(safe-area-inset-bottom\)/);
    assert.match(toolbar, /max-md:max-h-\[4\.25rem\]/);
    assert.doesNotMatch(toolbar, /max-md:bottom-2/);
  });

  it("aligns the mobile Laporkan control with the other drawer links", () => {
    const nav = read("src/components/SiteNav.tsx");
    const mobile = nav.slice(nav.indexOf('data-nav-ia="mobile"'));
    assert.match(mobile, /shape="row"/);
    assert.doesNotMatch(mobile, /px-1 py-2/);
    const desktop = nav.slice(0, nav.indexOf('data-nav-ia="mobile"'));
    assert.match(desktop, /<ReportLaporDropdown active=\{laporActive\} surface="brand" \/>/);
    const lapor = read("src/components/laporan/ReportLaporDropdown.tsx");
    assert.match(lapor, /shape = "pill"/);
    assert.match(lapor, /shape,/);
  });
});
