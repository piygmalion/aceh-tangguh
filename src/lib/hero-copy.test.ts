import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

type Messages = {
  hero: Record<string, unknown>;
  clusters: Record<string, unknown>;
  mapTeaser: Record<string, unknown>;
  participation: Record<string, unknown>;
  transparency: Record<string, unknown>;
  prrpkaChart: Record<string, unknown>;
};

const HERO_VISIBLE = [
  "kicker",
  "liveBadge",
  "statusTitle",
  "statusToday",
  "statusAll",
  "ctaDestana",
] as const;

const SECTION_KICKERS = [
  "clusters",
  "mapTeaser",
  "participation",
  "transparency",
  "prrpkaChart",
] as const;

const COMMAND_KEYS = ["statusAll", "ctaPeta", "ctaLaporKejadian", "ctaDestana"] as const;
const COMMAND_START = /^(Lihat|Buka|Laporkan|See|Open|Report)\b/;
const JARGON = /\b(hero|kicker)\b/i;
const KEY_SHAPED = /[A-Za-z]+\.[A-Za-z]+/;

describe("Homepage hero and section copy", () => {
  it("fills hero chrome with human commands, not Hero/Kicker key fallbacks", () => {
    for (const locale of ["id.json", "en.json"]) {
      const messages = JSON.parse(read(path.join("messages", locale))) as Messages;
      const hero = messages.hero;
      const tabs = hero.tabs as Record<string, unknown>;

      for (const key of HERO_VISIBLE) {
        const value = hero[key];
        assert.equal(typeof value, "string", `${locale} hero.${key}`);
        assert.equal(JARGON.test(String(value)), false, `${locale} hero.${key} still says hero/kicker`);
        assert.equal(KEY_SHAPED.test(String(value)), false, `${locale} hero.${key} looks like a key`);
      }

      assert.equal(typeof tabs.aria, "string", `${locale} hero.tabs.aria`);
      assert.equal(JARGON.test(String(tabs.aria)), false, `${locale} tabs.aria still says hero`);

      for (const key of COMMAND_KEYS) {
        assert.match(String(hero[key]), COMMAND_START, `${locale} hero.${key} is not a verb command`);
      }
    }
  });

  it("fills homepage section eyebrows so CLUSTER.KICKER does not leak", () => {
    for (const locale of ["id.json", "en.json"]) {
      const messages = JSON.parse(read(path.join("messages", locale))) as Messages;
      for (const ns of SECTION_KICKERS) {
        const value = messages[ns].kicker;
        assert.equal(typeof value, "string", `${locale} ${ns}.kicker`);
        assert.equal(JARGON.test(String(value)), false, `${locale} ${ns}.kicker still says hero/kicker`);
        assert.equal(KEY_SHAPED.test(String(value)), false, `${locale} ${ns}.kicker looks like a key`);
      }
    }
  });

  it("makes the status footer a command control that jumps to #status", () => {
    const src = read("src/components/HeroSection.tsx");
    assert.match(src, /href="#status"/);
    assert.match(src, /t\("statusAll"\)/);
    assert.match(src, /rounded-full/);
    assert.equal(/hero\.statusAll/i.test(src), false);
  });
});
