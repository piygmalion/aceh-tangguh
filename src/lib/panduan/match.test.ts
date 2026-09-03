import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { composeGuideAnswer } from "./answers";
import {
  extractKabupaten,
  extractJenis,
  matchGuideIntent,
  shouldShowGuideBot,
} from "./match";
import type { GuideContext } from "./types";

const emptyCtx = (): GuideContext => ({ failed: [] });

describe("panduan matcher", () => {
  it("matches a site tour in Indonesian", () => {
    const match = matchGuideIntent("mulai tur situs", "id");
    assert.equal(match.intent, "tour");
  });

  it("matches early warning", () => {
    assert.equal(matchGuideIntent("ada peringatan dini?", "id").intent, "peringatan");
  });

  it("matches emergency contacts and English report help", () => {
    assert.equal(matchGuideIntent("nomor darurat BPBA", "id").intent, "nomor");
    assert.equal(matchGuideIntent("how do I report an incident", "en").intent, "lapor");
  });

  it("prefers Pidie Jaya over Pidie and keeps Destana", () => {
    assert.equal(extractKabupaten("destana di pidie jaya"), "Pidie Jaya");
    assert.equal(extractKabupaten("cuaca pidie hari ini"), "Pidie");
    const match = matchGuideIntent("destana pidie jaya", "id");
    assert.equal(match.intent, "destana");
    assert.equal(match.kabupaten, "Pidie Jaya");
  });

  it("extracts jenis and treats a kabupaten-only question as kejadian", () => {
    assert.equal(extractJenis("banjir bandang kemarin"), "Banjir");
    const match = matchGuideIntent("kejadian banjir aceh utara 2024", "id");
    assert.equal(match.intent, "kejadian");
    assert.equal(match.kabupaten, "Aceh Utara");
    assert.equal(match.jenis, "Banjir");
    assert.equal(match.year, 2024);
  });

  it("returns unknown for off-topic text and out-of-Aceh places", () => {
    const off = matchGuideIntent("resep rendang enak", "id");
    assert.equal(off.intent, "unknown");
    assert.equal(off.reason, "low_confidence");
    const away = matchGuideIntent("bencana di jakarta", "id");
    assert.equal(away.intent, "unknown");
    assert.equal(away.reason, "out_of_scope");
  });

  it("routes medical emergency language to unknown without inventing figures", () => {
    const match = matchGuideIntent("saya terluka butuh ambulans", "id");
    assert.equal(match.intent, "unknown");
    assert.equal(match.reason, "emergency");
    const answer = composeGuideAnswer(match, emptyCtx(), "id");
    assert.match(answer.body, /112|nomor penting/i);
    assert.equal(answer.links.some((l) => l.href === "/nomor-penting"), true);
    assert.doesNotMatch(answer.body, /korban jiwa \d+/i);
  });

  it("does not invent operational numbers on a low-confidence unknown", () => {
    const answer = composeGuideAnswer(
      matchGuideIntent("xyzabc", "id"),
      emptyCtx(),
      "id"
    );
    assert.equal(answer.intent, "unknown");
    assert.doesNotMatch(answer.body, /\b\d{2,}\b/);
  });

  it("hides the widget on the full map and admin", () => {
    assert.equal(shouldShowGuideBot("/"), true);
    assert.equal(shouldShowGuideBot("/destana"), true);
    assert.equal(shouldShowGuideBot("/peta"), false);
    assert.equal(shouldShowGuideBot("/admin/login"), false);
    assert.equal(shouldShowGuideBot("/admin/sik/kejadian"), false);
  });
});
