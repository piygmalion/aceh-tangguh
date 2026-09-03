import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { LIVE_STATS_FALLBACK } from "./preview/fallbacks";
import { normalizePoskoCount, STALE_SEEDED_POSKO_COUNT } from "./live-stats";

const ROOT = process.cwd();

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })) return acc;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkFiles(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

/** Seed / fixture / UI assignments of the stale 656 — not a WHERE used to clear it. */
const SEEDED_POSKO_656 = /(?:poskoCount|posko_count)\s*:\s*656\b/;
const INSERT_POSKO_656 = /values\s*\(\s*1\s*,\s*3\s*,\s*656\b/i;
const UI_POSKO_CHIP = /chipPosko|t\(["']chipPosko["']\)|data\?\.poskoCount/;

describe("live_stats.posko_count is absent, not the stale 656 seed", () => {
  it("treats the stale seed and missing values as absent, never as inventory", () => {
    assert.equal(STALE_SEEDED_POSKO_COUNT, 656);
    assert.equal(normalizePoskoCount(656), null);
    assert.equal(normalizePoskoCount(undefined), null);
    assert.equal(normalizePoskoCount(null), null);
    assert.equal(normalizePoskoCount("656"), null);
    assert.equal(normalizePoskoCount(Number.NaN), null);
    assert.notEqual(normalizePoskoCount(null), 0);
    assert.notEqual(LIVE_STATS_FALLBACK.poskoCount, 0);
    assert.equal(LIVE_STATS_FALLBACK.poskoCount, null);
    assert.equal(normalizePoskoCount(LIVE_STATS_FALLBACK.poskoCount), null);
  });

  it("does not seed posko_count=656 in SQL or live-stats fallbacks", () => {
    const clearer = path.join(
      ROOT,
      "supabase/migrations/20260905_live_stats_clear_stale_posko.sql"
    );
    const files = [
      path.join(ROOT, "src/lib/preview/fallbacks.ts"),
      ...walkFiles(path.join(ROOT, "supabase/migrations")).filter(
        (f) => f.endsWith(".sql") && f !== clearer
      ),
    ];
    const leaks: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (SEEDED_POSKO_656.test(text) || INSERT_POSKO_656.test(text)) {
        leaks.push(path.relative(ROOT, file));
      }
    }
    assert.deepEqual(leaks, []);

    const clearerSql = readFileSync(clearer, "utf8");
    assert.match(clearerSql, /alter column posko_count drop not null/i);
    assert.match(clearerSql, /alter column posko_count drop default/i);
    assert.match(clearerSql, /set posko_count = null/i);
    assert.match(clearerSql, /where posko_count = 656/i);
    assert.equal(INSERT_POSKO_656.test(clearerSql), false);

    const initSql = readFileSync(
      path.join(ROOT, "supabase/migrations/20260823_init_aceh_tangguh_backend.sql"),
      "utf8"
    );
    assert.match(initSql, /posko_count int,/);
    assert.equal(/posko_count int not null default 0/.test(initSql), false);
    assert.match(initSql, /values\s*\(\s*1\s*,\s*3\s*,\s*null\s*,\s*0\s*\)/i);
  });

  it("does not show a posko KPI sourced from live_stats on the homepage hero", () => {
    const hero = readFileSync(
      path.join(ROOT, "src/components/HeroSection.tsx"),
      "utf8"
    );
    assert.equal(UI_POSKO_CHIP.test(hero), false);
    assert.equal(hero.includes("poskoCount"), false);
    assert.equal(hero.includes("/api/stats/live"), false);
    assert.match(hero, /peringatanDini/);
    assert.match(hero, /HeroStatusPanel/);

    for (const locale of ["id.json", "en.json"]) {
      const messages = JSON.parse(
        readFileSync(path.join(ROOT, "messages", locale), "utf8")
      ) as { hero?: Record<string, unknown> };
      assert.equal("chipPosko" in (messages.hero ?? {}), false);
      const blob = JSON.stringify(messages.hero ?? {});
      assert.equal(/\b656\b/.test(blob), false);
    }
  });

  it("does not leave posko_count=656 in public fixtures", () => {
    const fixtures = walkFiles(path.join(ROOT, "public/fixtures")).filter((f) =>
      /\.(json|geojson|sql)$/.test(f)
    );
    const leaks: string[] = [];
    for (const file of fixtures) {
      const text = readFileSync(file, "utf8");
      if (SEEDED_POSKO_656.test(text) || INSERT_POSKO_656.test(text)) {
        leaks.push(path.relative(ROOT, file));
      }
    }
    assert.deepEqual(leaks, []);
  });
});
