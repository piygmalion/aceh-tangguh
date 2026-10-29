import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { toneLevel, TONE_CHIP, TONE_DOT, TONE_EDGE } from "@/components/beranda/format";
import { magmaTone, normalizeEvent, type MagmaRaw } from "@/lib/peringatan-dini/magma-parse";
import type { PeringatanTone } from "@/lib/peringatan-dini-types";

const ROOT = process.cwd();
const TONES: PeringatanTone[] = ["neutral", "warn", "siaga", "danger"];

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("PD legend tones", () => {
  it("maps SIAGA to orange and only AWAS to danger red", () => {
    assert.equal(toneLevel("neutral"), "aman");
    assert.equal(toneLevel("warn"), "waspada");
    assert.equal(toneLevel("siaga"), "siaga");
    assert.equal(toneLevel("danger"), "awas");
    for (const tone of TONES) {
      if (tone !== "danger") assert.notEqual(toneLevel(tone), "awas", tone);
    }
    for (const paint of [TONE_DOT.siaga, TONE_CHIP.siaga, TONE_EDGE.siaga]) {
      assert.match(paint, /status-siaga/);
      assert.equal(paint.includes("#B42318"), false);
      assert.equal(paint.includes("status-awas"), false);
    }
    for (const paint of [TONE_DOT.danger, TONE_CHIP.danger, TONE_EDGE.danger]) {
      assert.match(paint, /status-awas/);
      assert.equal(paint.includes("#B42318"), false);
      assert.equal(paint.includes("status-siaga"), false);
    }
    assert.match(TONE_CHIP.siaga, /map-keyline/);
    assert.match(TONE_CHIP.danger, /map-keyline/);
  });

  it("keeps a MAGMA SIAGA level on the orange tone and AWAS on danger", () => {
    const raw = (level: string): MagmaRaw => ({
      magnitude: 2.1,
      mmi: null,
      magtype: "SR",
      area: "Aceh",
      level,
    });
    assert.equal(magmaTone(normalizeEvent(raw("SIAGA")), raw("SIAGA")), "siaga");
    assert.equal(magmaTone(normalizeEvent(raw("AWAS")), raw("AWAS")), "danger");
    assert.equal(toneLevel("siaga"), "siaga");
    assert.equal(toneLevel("danger"), "awas");
  });

  it("labels INFO, Siaga, and Awas from the message catalog", () => {
    const id = JSON.parse(read("messages/id.json")) as {
      peringatanDini: { tone: Record<string, string> };
    };
    const en = JSON.parse(read("messages/en.json")) as {
      peringatanDini: { tone: Record<string, string> };
    };
    assert.equal(id.peringatanDini.tone.info, "INFO");
    assert.equal(en.peringatanDini.tone.info, "INFO");
    assert.equal(id.peringatanDini.tone.siaga, "Siaga");
    assert.equal(en.peringatanDini.tone.siaga, "Alert");
    assert.equal(id.peringatanDini.tone.danger, "Awas");
    assert.equal(en.peringatanDini.tone.danger, "Warning");
    assert.equal(id.peringatanDini.tone.warn, "Waspada");
    assert.equal(id.peringatanDini.tone.neutral, "Normal");
  });
});
