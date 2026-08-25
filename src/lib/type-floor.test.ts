import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import {
  MAP_DOT_RADIUS_PX,
  MAP_PIN_DISC_PX,
  MAP_PIN_GLYPH_PX,
  TOOLBAR_DISC_PX,
  TOOLBAR_GLYPH_PX,
} from "./map-marker-chrome";
import {
  TYPE_FLOOR_CLASS,
  TYPE_FLOOR_PX,
  TYPE_FLOOR_REM,
  TYPE_HERO_DISPLAY_CLASS,
  TYPE_HERO_DISPLAY_MAX_REM,
  TYPE_HERO_LEADING,
  TYPE_KICKER_CLASS,
  TYPE_KICKER_TRACKING_EM,
  TYPE_STACK,
  TYPE_STAMP_CLASS,
} from "./type-floor";

const ROOT = process.cwd();

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkFiles(full, acc);
    } else if (/\.(tsx|ts|css)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Sub-12px / tight-tracking leftovers in product chrome. */
const SUB_FLOOR_TYPE = /text-\[(?:0\.(?:[0-6]\d*|7[0-4])rem|1[01]px)\]/;
const HEAVY_KICKER_TRACKING = /tracking-\[0\.(?:1[2-9]|2\d*)em\]/;
const HERO_OVERSIZE = /lg:text-\[4\.4rem\]|leading-\[1\.05\]/;

const SKIP_SUB_FLOOR = new Set([
  path.join(ROOT, "src/lib/type-floor.ts"),
  path.join(ROOT, "src/lib/type-floor.test.ts"),
]);

describe("signed type-floor", () => {
  it("locks 12px / 0.75rem floor, 0.08em kicker tracking, 3.5rem hero cap", () => {
    assert.equal(TYPE_FLOOR_PX, 12);
    assert.equal(TYPE_FLOOR_REM, 0.75);
    assert.equal(TYPE_KICKER_TRACKING_EM, 0.08);
    assert.equal(TYPE_HERO_DISPLAY_MAX_REM, 3.5);
    assert.equal(TYPE_HERO_LEADING, 1.2);
    assert.equal(TYPE_FLOOR_CLASS.includes("type-floor"), true);
    assert.equal(TYPE_FLOOR_CLASS.includes("text-[0.75rem]"), true);
    assert.equal(TYPE_KICKER_CLASS, "type-kicker");
    assert.equal(TYPE_STAMP_CLASS.includes("type-stamp"), true);
    assert.equal(TYPE_HERO_DISPLAY_CLASS, "type-hero-display");
    assert.match(TYPE_STACK, /ui-sans-serif/);
  });

  it("publishes the floor in CSS and keeps the system ui-sans stack", () => {
    const css = readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
    assert.match(css, /--type-floor:\s*0\.75rem/);
    assert.match(css, /--type-kicker-tracking:\s*0\.08em/);
    assert.match(css, /--type-hero-display-max:\s*3\.5rem/);
    assert.match(css, /--type-hero-leading:\s*1\.2/);
    assert.match(css, /\.type-kicker\s*\{/);
    assert.match(css, /\.type-stamp\s*\{/);
    assert.match(css, /\.type-hero-display\s*\{/);
    assert.match(
      css,
      /font-family:\s*ui-sans-serif,\s*system-ui/
    );
    assert.equal(/@font-face/.test(css), false);
    assert.equal(/fonts\.googleapis|next\/font/.test(css), false);
  });

  it("caps the hero display and leaves the highlighter mark/copy wiring alone", () => {
    const hero = readFileSync(
      path.join(ROOT, "src/components/HeroSection.tsx"),
      "utf8"
    );
    assert.match(hero, /TYPE_HERO_DISPLAY_CLASS/);
    assert.match(hero, /TYPE_KICKER_CLASS/);
    assert.equal(HERO_OVERSIZE.test(hero), false);
    assert.match(
      hero,
      /<mark className="whitespace-nowrap rounded-\[0\.16em\] bg-\[var\(--orange\)\] px-\[0\.28em\] pb-\[0\.06em\] pt-\[0\.04em\] font-\[inherit\] text-\[var\(--accent-fg\)\]/
    );
    assert.match(hero, /t\.rich\("title"/);
    assert.match(hero, /brand: \(chunks\) =>/);
  });

  it("raises Peringatan Dini stamps to the 12px floor", () => {
    const file = readFileSync(
      path.join(ROOT, "src/components/PeringatanDiniSection.tsx"),
      "utf8"
    );
    assert.match(file, /TYPE_STAMP_CLASS/);
    assert.equal(/text-\[0\.58rem\]/.test(file), false);
    assert.equal(SUB_FLOOR_TYPE.test(file), false);
    assert.equal(HEAVY_KICKER_TRACKING.test(file), false);
  });

  it("keeps map chrome sizes (7px dots, 24/28 pins, 20/32 discs) unchanged", () => {
    assert.equal(MAP_DOT_RADIUS_PX, 7);
    assert.equal(MAP_PIN_GLYPH_PX, 24);
    assert.equal(MAP_PIN_DISC_PX, 28);
    assert.equal(TOOLBAR_GLYPH_PX, 20);
    assert.equal(TOOLBAR_DISC_PX, 32);
  });

  it("has no sub-12px UI type or 0.14–0.22em kicker tracking in product chrome", () => {
    const roots = [
      path.join(ROOT, "src/components"),
      path.join(ROOT, "src/app"),
    ];
    const leftovers: string[] = [];
    for (const root of roots) {
      for (const file of walkFiles(root)) {
        if (SKIP_SUB_FLOOR.has(file)) continue;
        if (file.includes(`${path.sep}laporan${path.sep}`)) continue;
        const text = readFileSync(file, "utf8");
        if (SUB_FLOOR_TYPE.test(text) || HEAVY_KICKER_TRACKING.test(text) || HERO_OVERSIZE.test(text)) {
          leftovers.push(path.relative(ROOT, file));
        }
      }
    }
    assert.deepEqual(leftovers, []);
  });
});
