import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("FE-66 visual-1", () => {
  it("publishes the locked type scale and 390 section rhythm", () => {
    const css = read("src/app/globals.css");
    assert.match(css, /--type-display:\s*clamp\(2\.5rem,\s*2rem \+ 2\.6vw,\s*4rem\)/);
    assert.match(css, /--type-h2:\s*2\.25rem/);
    assert.match(css, /--type-h2-sm:\s*1\.75rem/);
    assert.match(css, /--type-figure-xl:\s*2\.5rem/);
    assert.match(css, /--type-lead:\s*1\.125rem/);
    assert.match(css, /--section-y-compact:\s*2rem/);
    assert.match(css, /--section-y:\s*3\.5rem/);
    assert.match(css, /--section-y-spacious:\s*4\.5rem/);
    assert.match(css, /@media \(max-width: 639px\) \{\s*:root,\s*html\[data-theme="light"\]/);
    assert.match(css, /--section-rule:\s*#e6e6e6/);
    assert.match(css, /--section-rule:\s*#2a2a2a/);
    assert.match(css, /html\[data-theme="dark"\] \[data-ink-field\]/);
    const tailwind = read("tailwind.config.ts");
    assert.match(tailwind, /display:\s*"var\(--type-display\)"/);
    const layout = read("src/app/[locale]/layout.tsx");
    assert.match(layout, /"800"/);
    assert.match(layout, /Plus_Jakarta_Sans/);
  });

  it("applies display and h2 on the beranda and rations kickers to hero and sumber", () => {
    const hero = read("src/components/beranda/DataHero.tsx");
    assert.match(hero, /className="type-display"/);
    assert.match(hero, /data-ink-field=""/);
    assert.match(hero, /data-section-density="spacious"/);
    const heading = read("src/components/beranda/primitives.tsx");
    assert.match(heading, /className="type-h2"/);
    assert.match(heading, /className="type-lead/);
    assert.match(heading, /text-\[0\.8125rem\].*\{prefix\}/);
    assert.doesNotMatch(heading, /text-\[0\.55em\]/);
    const mounted = [
      "src/components/beranda/DataHero.tsx",
      "src/components/beranda/TentangSection.tsx",
      "src/components/beranda/LaporCta.tsx",
      "src/components/beranda/FiturSection.tsx",
      "src/components/beranda/RisikoLadder.tsx",
      "src/components/beranda/BeritaSection.tsx",
      "src/components/beranda/CuacaStrip.tsx",
      "src/components/beranda/PeringatanBento.tsx",
      "src/components/beranda/SumberPanel.tsx",
      "src/components/beranda/MasukCta.tsx",
    ];
    const kickers = mounted.filter((file) => /TYPE_KICKER_CLASS|kicker=\{/.test(read(file)));
    assert.deepEqual(kickers, [
      "src/components/beranda/DataHero.tsx",
      "src/components/beranda/SumberPanel.tsx",
    ]);
    const lapor = read("src/components/beranda/LaporCta.tsx");
    assert.match(lapor, /flex-col items-start gap-4/);
    assert.match(lapor, /sm:flex-row/);
    assert.match(lapor, /type-h3 w-full/);
    assert.match(lapor, /section-y-compact/);
    assert.doesNotMatch(lapor, /sticky|fixed/);
    assert.match(read("src/components/beranda/CuacaStrip.tsx"), /data-ink-field=""/);
  });

  it("keeps the settings panel clear of the status legend and drops the 32rem cap", () => {
    const settings = read("src/components/map/MapSettings.tsx");
    assert.match(settings, /max-h-\[calc\(100svh-10rem\)\]/);
    const dialogMatch = settings.slice(settings.indexOf('role="dialog"')).match(/className="([^"]+)"/);
    assert.ok(dialogMatch);
    const dialogClass = dialogMatch[1];
    assert.match(dialogClass, /overflow-hidden/);
    assert.doesNotMatch(dialogClass, /overflow-y-auto/);
    assert.match(settings, /md:max-h-\[min\(calc\(100svh-10rem\),calc\(100svh-18rem\)\)\]/);
    assert.doesNotMatch(settings, /32rem/);
    const workspace = read("src/components/map/MapWorkspace.tsx");
    assert.match(workspace, /md:bottom-4/);
    assert.match(workspace, /onOpenChange=\{setSettingsOpen\}/);
    assert.match(workspace, /settingsOpen \? "hidden" : "hidden md:block"/);
    const stack = workspace.slice(workspace.indexOf("pointer-events-none absolute"));
    const legendAt = stack.indexOf("<StatusLegend");
    const settingsAt = stack.indexOf("<MapSettings");
    assert.ok(legendAt >= 0 && settingsAt > legendAt, "desktop legend sits above the settings button");
    assert.match(settings, /onOpenChange\?: \(open: boolean\) => void/);
    assert.match(settings, /buttonRef\.current\?\.focus\(\)/);
  });

  it("removes the retired r3p-kab tile script and alerts after three scheduled failures", () => {
    assert.equal(existsSync(path.join(ROOT, "scripts/build-r3p-kab-pmtiles.py")), false);
    const pkg = read("package.json");
    assert.doesNotMatch(pkg, /build:r3p-kab-tiles/);
    assert.doesNotMatch(pkg, /build-r3p-kab-pmtiles/);
    const yml = read(".github/workflows/dibi-refresh.yml");
    assert.match(yml, /issues: write/);
    assert.match(yml, /dibi-refresh-alert/);
    assert.match(yml, /dibi-refresh-streak\.mjs/);
    assert.match(yml, /should_alert/);
    assert.match(yml, /should_close/);
    assert.doesNotMatch(yml, /permissions:\s*\n\s*contents: write\s*\n\s*issues: write/);
    const alertJob = yml.slice(yml.indexOf("\n  alert:"));
    assert.match(alertJob, /issues: write/);
    assert.doesNotMatch(alertJob, /contents: write/);
    assert.match(alertJob, /GH_REPO: \$\{\{ github\.repository \}\}/);
    assert.match(alertJob, /GH_TOKEN: \$\{\{ github\.token \}\}/);
    assert.match(yml, /REASON: \$\{\{ steps\.streak\.outputs\.reason \}\}/);
    assert.match(yml, /FETCHED_AT: \$\{\{ steps\.streak\.outputs\.fetched_at \}\}/);
    const reportRun = yml.slice(yml.indexOf("name: Report failure"));
    assert.doesNotMatch(reportRun.slice(reportRun.indexOf("run:")), /\$\{\{ steps\.streak/);
    const alertRun = alertJob.slice(alertJob.indexOf("run: |"));
    assert.doesNotMatch(alertRun, /\$\{\{ /);
    assert.match(yml, /\[skip ci\] \[vercel skip\]/);
  });
});
