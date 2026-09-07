import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function listPages(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const next = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "admin") continue;
      out.push(...listPages(next));
    } else if (entry.name === "page.tsx") {
      out.push(next);
    }
  }
  return out;
}

describe("operational stats live only on staff console", () => {
  it("does not mount OperationalStatsSection on the public homepage", () => {
    const home = read("src/app/[locale]/page.tsx");
    assert.doesNotMatch(home, /OperationalStatsSection/);
  });

  it("does not mount OperationalStatsSection on other public locale pages", () => {
    const localeRoot = join(ROOT, "src/app/[locale]");
    const pages = listPages(localeRoot);
    assert.ok(pages.some((p) => p.endsWith(`${join("src", "app", "[locale]", "page.tsx")}`)));
    for (const file of pages) {
      const src = readFileSync(file, "utf8");
      assert.equal(
        src.includes("OperationalStatsSection"),
        false,
        `${file} still mounts operational stats on a public page`
      );
    }
  });

  it("mounts OperationalStatsSection on the staff console overview", () => {
    const overview = read("src/app/[locale]/admin/(console)/page.tsx");
    assert.match(overview, /OperationalStatsSection/);
    assert.match(overview, /<OperationalStatsSection/);
  });
});
