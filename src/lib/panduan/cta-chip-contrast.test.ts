import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const WHITE_ON_ORANGE =
  /(?:bg-\[var\(--accent\)\]|#FF7722)[^\n]*text-white|text-white[^\n]*(?:bg-\[var\(--accent\)\]|#FF7722)/;

const INK_ON_ORANGE =
  /text-\[var\(--accent-fg\)\]|text-accent-foreground|text-\[var\(--accent-foreground\)\]/;

describe("panduan CTA chip contrast", () => {
  it("ships a shared Chip accent tone as ink-on-orange", () => {
    const chip = read("src/components/ui/Chip.tsx");
    const accentLine = chip.split("\n").find((line) => /^\s*accent:/.test(line));
    assert.ok(accentLine, "Chip is missing an accent tone");
    assert.match(accentLine!, /bg-\[var\(--accent\)\]/);
    assert.match(accentLine!, INK_ON_ORANGE);
    assert.equal(
      /text-white/.test(accentLine!),
      false,
      "Chip accent tone still uses text-white on orange"
    );
  });

  it("does not put white text on accent orange in panduan chips", () => {
    const files = [
      "src/components/panduan/GuidePanel.tsx",
      "src/components/panduan/GuideMessage.tsx",
    ];
    for (const file of files) {
      const src = read(file);
      assert.equal(WHITE_ON_ORANGE.test(src), false, `${file} still white-on-orange`);
      assert.match(src, /tone=\{[^}]*"accent"/);
    }
  });

  it("keeps approved and ok chips on ink, not brand red", () => {
    const chip = read("src/components/ui/Chip.tsx");
    assert.match(chip, /forest:\s*"border border-\[var\(--ink\)\] bg-\[var\(--ink\)\] text-\[var\(--paper\)\]/);
    assert.match(
      chip,
      /ok:\s*"border border-\[var\(--ink\)\] bg-\[var\(--bg-muted\)\] text-\[var\(--text\)\]/,
    );
    assert.equal(/ok:[^\n]*--primary/.test(chip), false);
    assert.match(chip, /warn:\s*"border border-\[var\(--map-keyline\)\]/);
    assert.match(chip, /danger:\s*"border border-\[var\(--map-keyline\)\]/);
  });
});
