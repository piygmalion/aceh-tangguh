import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import { MotifKontur, motifPaths } from "../components/brand/MotifKontur";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(full);
  }
  return acc;
}

describe("INS-49 visual-1 Kontur Pesisir", () => {
  it("points --font-display at Plus Jakarta Sans and caps the hero at 3.5rem", () => {
    const css = read("src/app/globals.css");
    const layout = read("src/app/[locale]/layout.tsx");
    assert.match(css, /--font-display:\s*var\(--font-sans\)/);
    assert.match(css, /font-family:\s*var\(--font-display\)/);
    assert.match(css, /--type-display:\s*clamp\(2\.5rem,\s*2rem \+ 2\.6vw,\s*3\.5rem\)/);
    assert.match(css, /--type-hero-display-max:\s*3\.5rem/);
    assert.match(css, /\.type-display,\s*\.type-hero-display\s*\{[^}]*font-weight:\s*800/);
    assert.match(layout, /Plus_Jakarta_Sans/);
    assert.match(layout, /"800"/);
    assert.equal((layout.match(/from "next\/font/g) ?? []).length, 1);
    assert.equal(/Archivo|@font-face|fonts\.googleapis/.test(css + layout), false);
  });

  it("publishes surface tokens from the existing Peudeung hex, including chart-surface", () => {
    const css = read("src/app/globals.css");
    const darkAt = css.indexOf('html[data-theme="dark"]');
    const light = css.slice(0, darkAt);
    const dark = css.slice(darkAt);
    assert.match(light, /--surface-paper:\s*#f7f7f7/);
    assert.match(light, /--surface-raised:\s*#ffffff/);
    assert.match(light, /--surface-ink:\s*#111111/);
    assert.match(light, /--surface-brand:\s*#c8102e/);
    assert.match(light, /--chart-surface:\s*#ffffff/);
    assert.match(light, /--motif-opacity:\s*0\.07/);
    assert.match(dark, /--surface-paper:\s*#0a0a0a/);
    assert.match(dark, /--surface-raised:\s*#1a1a1a/);
    assert.match(dark, /--surface-ink:\s*#111111/);
    assert.match(dark, /--surface-brand:\s*#c8102e/);
    assert.match(dark, /--chart-surface:\s*#0a0a0a/);
    assert.match(css, /--section-y-compact:\s*2\.5rem/);
    assert.match(css, /--section-y:\s*5rem/);
    assert.match(css, /--section-y-spacious:\s*7rem/);
    assert.match(css, /html\[data-theme="dark"\] \{/);
    const narrow = css.slice(css.indexOf("@media (max-width: 639px)"));
    assert.match(narrow, /--section-y-compact:\s*2rem/);
    assert.match(narrow, /--section-y:\s*3\.5rem/);
    assert.match(narrow, /--section-y-spacious:\s*4\.5rem/);
    assert.match(narrow, /html\[data-theme="dark"\]/);
  });

  it("gives SectionShell tone and density, and keeps Lapor on the brand surface", () => {
    const shell = read("src/components/beranda/SectionShell.tsx");
    assert.match(shell, /export type SectionTone = "paper" \| "raised" \| "ink" \| "brand"/);
    assert.match(shell, /data-section-tone/);
    assert.match(shell, /--surface-paper/);
    assert.match(shell, /--surface-raised/);
    assert.match(shell, /--surface-ink/);
    assert.match(shell, /--surface-brand/);
    assert.match(shell, /section-y-compact/);
    assert.match(shell, /section-y-spacious/);
    const lapor = read("src/components/beranda/LaporCta.tsx");
    assert.match(lapor, /--surface-brand/);
    assert.doesNotMatch(lapor, /sticky|fixed/);
  });

  it("mounts one procedural contour, hidden from assistive tech, with no party-flag geometry", () => {
    const users = walk(path.join(ROOT, "src"))
      .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
      .filter((file) => readFileSync(file, "utf8").includes("<MotifKontur"))
      .map((file) => path.relative(ROOT, file));
    assert.deepEqual(users, ["src/components/beranda/PeringatanBento.tsx"]);

    const html = renderToStaticMarkup(createElement(MotifKontur));
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /data-motif="kontur-pesisir"/);
    assert.match(html, /class="motif-kontur/);
    assert.equal((html.match(/<path /g) ?? []).length, motifPaths().length);
    assert.equal((html.match(/fill="none"/g) ?? []).length, motifPaths().length);
    assert.match(html, /stroke="currentColor"/);
    assert.doesNotMatch(html, /<(rect|polygon|circle|ellipse|text)\b/);
    assert.doesNotMatch(html, /#(?:c8102e|000000|ffffff|fff|000)/i);
    assert.doesNotMatch(html, /pintu|rebung|pucuk|crescent|bintang/i);

    const source = read("src/components/brand/MotifKontur.tsx");
    assert.doesNotMatch(source, /pintu|rebung|pucuk|bendera/i);
    assert.match(read("src/app/globals.css"), /\.motif-kontur\s*\{[^}]*opacity:\s*var\(--motif-opacity\)/);
    assert.match(read("public/media/CREDITS.md"), /dokumentasi Aceh Tangguh/);
    assert.doesNotMatch(read("src/components/beranda/DataHero.tsx"), /MotifKontur|opacity-\[0\.07\]/);
  });
});
