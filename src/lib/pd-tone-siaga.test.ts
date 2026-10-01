import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import { toneLevel, TONE_CHIP, TONE_DOT, TONE_EDGE } from "@/components/beranda/format";
import type { PeringatanTone } from "@/lib/peringatan-dini-types";

const ROOT = process.cwd();
const TONES: PeringatanTone[] = ["neutral", "warn", "danger"];

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("PD tone danger is Siaga, never Awas", () => {
  it("maps every PeringatanTone off awas", () => {
    for (const tone of TONES) {
      assert.notEqual(toneLevel(tone), "awas", tone);
    }
    assert.equal(toneLevel("neutral"), "aman");
    assert.equal(toneLevel("warn"), "waspada");
    assert.equal(toneLevel("danger"), "siaga");
  });

  it("paints danger chrome with status-siaga and a #111 keyline", () => {
    for (const paint of [TONE_DOT.danger, TONE_CHIP.danger, TONE_EDGE.danger]) {
      assert.equal(paint.includes("status-awas"), false);
      assert.match(paint, /status-siaga/);
    }
    assert.match(TONE_CHIP.danger, /map-keyline/);
    assert.match(TONE_CHIP.danger, /map-status-siaga-fg/);
  });

  it("drops the local awas mappers on the two PD card surfaces", () => {
    for (const rel of [
      "src/components/beranda/PeringatanBento.tsx",
      "src/components/PeringatanDiniSection.tsx",
    ]) {
      const src = read(rel);
      assert.match(src, /toneLevel/);
      assert.equal(/function toneLevel|function pdToneLevel/.test(src), false, rel);
      assert.equal(src.includes("status-awas"), false, rel);
      assert.equal(src.includes('"awas"'), false, rel);
    }
  });

  it("labels the danger tone Siaga / Alert", () => {
    const id = JSON.parse(read("messages/id.json")) as {
      peringatanDini: { tone: Record<string, string> };
    };
    const en = JSON.parse(read("messages/en.json")) as {
      peringatanDini: { tone: Record<string, string> };
    };
    assert.equal(id.peringatanDini.tone.danger, "Siaga");
    assert.equal(en.peringatanDini.tone.danger, "Alert");
    assert.equal(id.peringatanDini.tone.warn, "Waspada");
    assert.equal(id.peringatanDini.tone.neutral, "Normal");
  });
});
