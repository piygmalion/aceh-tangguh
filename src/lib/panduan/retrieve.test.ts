import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchGuideIntent } from "./match";
import {
  contextKeysForRetrieval,
  contextToChunks,
  retrieveKnowledgeChunks,
} from "./retrieve";

describe("panduan retrieve", () => {
  it("returns a Juklak card for banjir bandang, not casualty figures", () => {
    const chunks = retrieveKnowledgeChunks("apa itu banjir bandang", "id");
    assert.ok(
      chunks.some((chunk) => chunk.sourceId === "juklak-banjir-bandang"),
      chunks.map((chunk) => chunk.sourceId).join(",")
    );
    const bandang = chunks.find((chunk) => chunk.sourceId === "juklak-banjir-bandang");
    assert.match(bandang?.text ?? "", /Juklak|katalog/i);
    assert.doesNotMatch(bandang?.text ?? "", /korban \d+|meninggal \d+/i);
  });

  it("does not invent live keys for an empty unknown", () => {
    const match = matchGuideIntent("xyzabc", "id");
    assert.equal(match.intent, "unknown");
    assert.deepEqual(contextKeysForRetrieval(match), []);
    assert.equal(retrieveKnowledgeChunks(match.query, "id").length, 0);
  });

  it("retrieves the analisis-data card, not Tanggapi Aceh publications", () => {
    const chunks = retrieveKnowledgeChunks("analisis data bencana", "id");
    assert.ok(
      chunks.some((chunk) => chunk.sourceId === "concept-analisis-data"),
      chunks.map((chunk) => chunk.sourceId).join(",")
    );
    assert.equal(
      chunks.some((chunk) => chunk.sourceId === "concept-tanggapi-publikasi"),
      false
    );
  });

  it("distinguishes the Tanggapi assistant from the Tanggapi Aceh publication portal", () => {
    const assistant = retrieveKnowledgeChunks("apa itu tanggapi", "id");
    assert.ok(
      assistant.some((chunk) => chunk.sourceId === "concept-tanggapi-asisten"),
      assistant.map((chunk) => chunk.sourceId).join(",")
    );
    const portal = retrieveKnowledgeChunks("publikasi tanggapi aceh BTT", "id");
    assert.ok(
      portal.some((chunk) => chunk.sourceId === "concept-tanggapi-publikasi"),
      portal.map((chunk) => chunk.sourceId).join(",")
    );
    assert.doesNotMatch(
      assistant.find((chunk) => chunk.sourceId === "concept-tanggapi-asisten")?.text ?? "",
      /korban \d+/i
    );
  });

  it("includes the IRBI method card when comparing Destana and IRBI", () => {
    const chunks = retrieveKnowledgeChunks("bandingkan destana dan IRBI", "id");
    assert.ok(
      chunks.some((chunk) => chunk.sourceId === "method-irbi-krb"),
      chunks.map((chunk) => chunk.sourceId).join(",")
    );
  });

  it("adds research live keys for a Destana vs IRBI comparison", () => {
    const match = matchGuideIntent("bandingkan destana dan IRBI", "id");
    const keys = contextKeysForRetrieval(match);
    assert.equal(keys.includes("destana"), true);
    assert.equal(keys.includes("irbi"), true);
    assert.equal(keys.includes("dibi"), false);
    assert.equal(keys.includes("publikasi"), false);
  });

  it("includes the DIBI methodology card for a how-to-read query", () => {
    const chunks = retrieveKnowledgeChunks("bagaimana membaca DIBI", "id");
    assert.ok(
      chunks.some((chunk) => chunk.sourceId === "method-dibi"),
      chunks.map((chunk) => chunk.sourceId).join(",")
    );
    assert.deepEqual(contextKeysForRetrieval(matchGuideIntent("bagaimana membaca DIBI", "id")), []);
  });

  it("does not attach live incident feeds to a definition question", () => {
    const match = matchGuideIntent("apa itu banjir bandang", "id");
    assert.equal(match.intent, "kejadian");
    assert.deepEqual(contextKeysForRetrieval(match), []);
  });

  it("labels failed public APIs as delayed without filling figures", () => {
    const chunks = contextToChunks({ failed: ["peringatan"], peringatan: null }, "id");
    const live = chunks.find((chunk) => chunk.sourceId === "live:peringatan");
    assert.equal(live?.delayed, true);
    assert.match(live?.text ?? "", /tertunda/i);
    assert.doesNotMatch(live?.text ?? "", /\b\d{2,}\b/);
  });
});
