import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const HOMEPAGE_CHROME = [
  "src/components/HeroSection.tsx",
  "src/components/MapTeaserSection.tsx",
  "src/components/ParticipationSection.tsx",
  "src/components/TransparencySection.tsx",
  "src/components/PeringatanDiniSection.tsx",
  "src/components/weather/WeatherStrip.tsx",
] as const;

const ORANGE_CTA_FILES = [
  "src/components/HeroSection.tsx",
  "src/components/ui/button-legacy.tsx",
  "src/components/laporan/ReportLaporDropdown.tsx",
  "src/components/ParticipationSection.tsx",
] as const;

const UNTOUCHED = [
  "src/components/map/MapViewport.tsx",
  "src/components/map/AreaProfilPanel.tsx",
  "src/components/SiteFooter.tsx",
  "src/lib/peringatan-dini/magma.ts",
  "src/components/sik/OperationalStatsSection.tsx",
] as const;

describe("shadcn Fase 3 homepage chrome + CTA contrast", () => {
  it("uses ink on orange CTAs (not white-on-orange)", () => {
    for (const file of ORANGE_CTA_FILES) {
      const src = read(file);
      assert.match(src, /text-accent-foreground/);
      assert.equal(
        /bg-accent[^\n]*text-white|bg-\[var\(--accent\)\][^\n]*text-white/.test(src),
        false,
        `${file} still paints white on orange`
      );
    }

    const shimmer = read("src/components/ui/shimmer-button.tsx");
    assert.match(shimmer, /text-accent-foreground/);
    assert.match(shimmer, /accentBg/);
  });

  it("highlights the hero brand with orange background + ink text", () => {
    const hero = read("src/components/HeroSection.tsx");
    assert.match(hero, /t\.rich\("title"/);
    assert.match(hero, /<br \/>/);
    assert.match(hero, /bg-accent/);
    assert.match(hero, /text-accent-foreground/);
    assert.equal(/text-\[var\(--orange\)\]/.test(hero), false);
    assert.match(hero, /GlassPanel/);
    assert.match(hero, /<Badge/);
    assert.match(hero, /<Separator/);
    assert.match(hero, /<Skeleton/);
  });

  it("removes MapTeaser lime and uses forest / primary tokens", () => {
    const teaser = read("src/components/MapTeaserSection.tsx");
    assert.equal(teaser.includes("#2e9e4e"), false);
    assert.equal(teaser.includes("#81c784"), false);
    assert.equal(/emerald/.test(teaser), false);
    assert.match(teaser, /colorFrom="var\(--primary\)"/);
    assert.match(teaser, /colorTo="var\(--accent-soft\)"/);
    assert.match(teaser, /GlassPanel/);
    assert.match(teaser, /badgeVariants/);
  });

  it("uses Card/Badge/Separator/Skeleton/Empty on homepage where natural", () => {
    const participation = read("src/components/ParticipationSection.tsx");
    assert.match(participation, /<GlassPanel/);
    assert.match(participation, /<Card /);
    assert.match(participation, /<Badge/);

    const transparency = read("src/components/TransparencySection.tsx");
    assert.match(transparency, /<GlassPanel/);
    assert.match(transparency, /<Card /);

    const peringatan = read("src/components/PeringatanDiniSection.tsx");
    assert.match(peringatan, /<Skeleton/);
    assert.match(peringatan, /<Empty/);

    const weather = read("src/components/weather/WeatherStrip.tsx");
    assert.match(weather, /<Skeleton/);
    assert.match(weather, /<Empty/);

    const r3p = read("src/components/R3PChartSection.tsx");
    assert.match(r3p, /<GlassPanel/);
    assert.match(r3p, /<Skeleton/);
    assert.match(r3p, /<Empty/);
  });

  it("keeps GlassPanel and ShimmerButton wrappers", () => {
    assert.equal(existsSync(path.join(ROOT, "src/components/ui/GlassPanel.tsx")), true);
    assert.equal(existsSync(path.join(ROOT, "src/components/ui/shimmer-button.tsx")), true);
    assert.match(read("src/components/ui/shimmer-button.tsx"), /export const ShimmerButton/);
  });

  it("does not use space-y on Fase 3 homepage sections", () => {
    for (const file of HOMEPAGE_CHROME) {
      const src = read(file);
      const leftover = src
        .split("\n")
        .filter((line) => /space-y-/.test(line) && !/space-y-0/.test(line));
      assert.deepEqual(leftover, [], `${file} still uses space-y-*`);
    }
  });

  it("leaves map chrome, MAGMA, SIK ops, and footer sumber untouched", () => {
    for (const file of UNTOUCHED) {
      assert.equal(existsSync(path.join(ROOT, file)), true, `missing ${file}`);
    }
    const magma = read("src/lib/peringatan-dini/magma.ts");
    assert.equal(/from ["']@\/components\/ui\/(card|badge|empty|skeleton)["']/.test(magma), false);
    const viewport = read("src/components/map/MapViewport.tsx");
    assert.equal(/text-accent-foreground/.test(viewport), false);
    const footer = read("src/components/SiteFooter.tsx");
    assert.equal(/from ["']@\/components\/ui\/(card|badge|empty)["']/.test(footer), false);
  });
});
