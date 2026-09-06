import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function leftoverSpace(src: string): string[] {
  return src
    .split("\n")
    .filter((line) => /space-[xy]-/.test(line) && !/space-[xy]-0/.test(line));
}

const WHITE_ON_ORANGE =
  /(?:bg-\[var\(--accent\)\]|#FF7722|variant="accent"|bg-accent)[^\n]*text-white|text-white[^\n]*(?:bg-\[var\(--accent\)\]|#FF7722|bg-accent)/;

describe("FE-35 PD/cuaca SoT-4 UX", () => {
  it("keeps Peringatan Dini card height + scroll isi, type floor, and contrast", () => {
    const src = read("src/components/PeringatanDiniSection.tsx");

    assert.match(src, /h-\[20rem\]/);
    assert.match(src, /overflow-hidden/);
    assert.match(src, /overflow-y-auto/);
    assert.match(src, /min-h-0 flex-1/);
    assert.equal(/min-h-\[16rem\]/.test(src), false);
    assert.equal(/line-clamp-/.test(src), false);

    assert.match(src, /TYPE_FLOOR_CLASS/);
    assert.equal(/text-xs/.test(src), false, "PD cards still use text-xs (12px)");
    assert.deepEqual(leftoverSpace(src), [], "PeringatanDiniSection still uses space-y-* / space-x-*");
    assert.equal(/lime|bg-lime|text-lime/.test(src), false);

    const kickerIdx = src.indexOf('t("kicker")');
    assert.ok(kickerIdx >= 0, "kicker missing");
    const kickerWindow = src.slice(Math.max(0, kickerIdx - 220), kickerIdx + 40);
    assert.equal(
      /accent-soft/.test(kickerWindow),
      false,
      "kicker still uses low-contrast --accent-soft",
    );
    assert.match(kickerWindow, /text-\[var\(--text-dim\)\]|text-\[var\(--text\)\]/);

    const archiveIdx = src.indexOf('t("archiveLink")');
    assert.ok(archiveIdx >= 0, "archiveLink missing");
    const archiveWindow = src.slice(Math.max(0, archiveIdx - 280), archiveIdx + 80);
    assert.equal(
      /accent-soft/.test(archiveWindow),
      false,
      "archive link still uses low-contrast --accent-soft",
    );
    assert.match(archiveWindow, /TYPE_FLOOR_CLASS/);
    assert.match(archiveWindow, /text-\[var\(--text\)\]|text-\[var\(--primary\)\]/);

    assert.match(src, /EmptyDescription className="[^"]*text-foreground/);
    assert.match(src, /text-\[var\(--text\)\]/);

    assert.equal(/tatonas\.kind\./.test(src), false);
    assert.match(src, /logger_kind\.toUpperCase\(\)/);
  });

  it("makes WeatherNext dialog CTA ink-on-orange with flex+gap, not a second homepage section", () => {
    const dialog = read("src/components/weather/WeatherInovasiStrip.tsx");
    const strip = read("src/components/weather/WeatherStrip.tsx");
    const page = read("src/app/[locale]/page.tsx");

    assert.match(dialog, /from ["']@\/components\/ui\/button["']/);
    assert.match(dialog, /variant="accent"/);
    assert.match(dialog, /text-\[var\(--accent-fg\)\]/);
    assert.match(dialog, /DialogTrigger/);
    assert.match(dialog, /TYPE_FLOOR_CLASS/);
    assert.equal(WHITE_ON_ORANGE.test(dialog), false, "dialog still white-on-orange");
    assert.equal(/text-white/.test(dialog), false, "dialog uses text-white");
    assert.equal(
      /bg-\[var\(--warn-dim\)\]/.test(dialog),
      false,
      "trigger still uses warn-dim, not accent CTA",
    );
    assert.deepEqual(leftoverSpace(dialog), [], "WeatherInovasiStrip still uses space-y-* / space-x-*");
    assert.equal(/lime|bg-lime|text-lime/.test(dialog), false);

    const stackedMt = dialog
      .split("\n")
      .filter((line) => /\bmt-\d/.test(line) && !/DialogTitle|DialogHeader/.test(line));
    assert.deepEqual(stackedMt, [], "dialog still uses mt-* between stacked blocks");
    assert.match(dialog, /flex flex-col gap-/);

    assert.doesNotMatch(dialog, /<section/);
    assert.doesNotMatch(dialog, /id="cuaca-inovasi"/);
    assert.match(dialog, /\/api\/weather\/inovasi/);
    assert.doesNotMatch(dialog, /summarizeWeatherWarning|scoreKab/);

    assert.match(strip, /WeatherInovasiStrip/);
    assert.doesNotMatch(strip, /\/api\/weather\/inovasi/);
    assert.match(page, /<WeatherStrip \/>/);
    assert.doesNotMatch(page, /WeatherInovasiStrip/);
    assert.doesNotMatch(page, /id="cuaca-inovasi"/);
  });
});
