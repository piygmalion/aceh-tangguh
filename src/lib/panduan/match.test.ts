import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { composeGuideAnswer } from "./answers";
import { PANDUAN_LLM_ENABLED } from "./llm-gate";
import {
  extractDesa,
  extractKabupaten,
  extractJenis,
  matchGuideIntent,
  shouldShowGuideBot,
} from "./match";
import { mergeFaqCatalog, parseFaqCatalogItems } from "./faq";
import { chipsForPathname, welcomeQueryForPath } from "./page-context";
import type { GuideContext } from "./types";
import { sanitizeUnknownQuery } from "./unknown";

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

  it("matches Tatonas and water-level questions as early warning", () => {
    assert.equal(matchGuideIntent("cek muka air tatonas", "id").intent, "peringatan");
    assert.equal(matchGuideIntent("pos hidrologi hari ini", "id").intent, "peringatan");
    const faq = matchGuideIntent("apa itu tatonas", "id");
    assert.equal(faq.intent, "peringatan");
    assert.equal(faq.faq?.id, "apa-itu-tatonas");
  });

  it("includes Tatonas in the early-warning answer and does not invent a level", () => {
    const withFeed = composeGuideAnswer(
      { intent: "peringatan", query: "tatonas" },
      {
        failed: [],
        peringatan: {
          cuacaEmpty: true,
          cuacaTone: "ok",
          magmaEmpty: true,
          sipongiEmpty: true,
          sipongiCount: 0,
          tatonasEmpty: false,
          tatonasHighlight: "Pos Krueng Aceh WL 1.2 m (WASPADA)",
          tatonasLevel: "WASPADA",
          stale: false,
        },
      },
      "id"
    );
    assert.match(withFeed.body, /Tatonas/i);
    assert.match(withFeed.body, /Pos Krueng Aceh/);
    const delayed = composeGuideAnswer(
      { intent: "peringatan", query: "tatonas" },
      { failed: ["peringatan"], peringatan: null },
      "id"
    );
    assert.match(delayed.body, /tertunda/i);
    assert.doesNotMatch(delayed.body, /WASPADA|AWAS/);
  });

  it("reuses session slots on a follow-up without an LLM", () => {
    const first = matchGuideIntent("kejadian banjir", "id");
    assert.equal(first.intent, "kejadian");
    assert.equal(first.jenis, "Banjir");
    const follow = matchGuideIntent("yang di Aceh Utara", "id", {
      lastIntent: "kejadian",
      jenis: first.jenis,
    });
    assert.equal(follow.intent, "kejadian");
    assert.equal(follow.kabupaten, "Aceh Utara");
    assert.equal(follow.jenis, "Banjir");
    const year = matchGuideIntent("tahun 2024", "id", {
      lastIntent: "kejadian",
      kabupaten: "Aceh Utara",
      jenis: "Banjir",
    });
    assert.equal(year.intent, "kejadian");
    assert.equal(year.year, 2024);
    assert.equal(year.kabupaten, "Aceh Utara");
  });

  it("routes analisis data to analisisData, not publikasi or cuaca", () => {
    const id = matchGuideIntent("analisis data bencana", "id");
    assert.equal(id.intent, "analisisData");
    assert.equal(id.faq?.id, "apa-itu-analisis-data");
    assert.equal(matchGuideIntent("disaster analysis", "en").intent, "analisisData");
    assert.equal(matchGuideIntent("analisis cuaca banda aceh", "id").intent, "cuaca");
    assert.equal(matchGuideIntent("publikasi analisis", "id").intent, "publikasi");
    const answer = composeGuideAnswer(id, emptyCtx(), "id");
    assert.match(answer.body, /Data bencana/i);
    assert.equal(answer.links.some((l) => l.href === "/analisis-data"), true);
    assert.doesNotMatch(answer.body, /korban jiwa \d+/i);
  });

  it("extracts a village name and does not treat Destana as a village", () => {
    assert.equal(extractDesa("destana desa pande aceh besar"), "Pande");
    assert.equal(extractDesa("desa tangguh di aceh utara"), undefined);
    const match = matchGuideIntent("gampong pande", "id");
    assert.equal(match.intent, "destana");
    assert.equal(match.desa, "Pande");
  });

  it("locks page chips and welcome to Destana / contacts", () => {
    assert.equal(chipsForPathname("/destana")[0], "destana");
    assert.equal(chipsForPathname("/nomor-penting")[0], "nomor");
    assert.equal(chipsForPathname("/").includes("risetBanding"), true);
    assert.equal(chipsForPathname("/").at(-1), "lapor");
    assert.equal(welcomeQueryForPath("/destana", "id"), "destana");
    assert.equal(welcomeQueryForPath("/", "id"), "apa itu aceh tangguh");
  });

  it("answers the three screenshot queries without an empty body", () => {
    const cuaca = matchGuideIntent("bagaimana cuaca hari ini", "id");
    assert.equal(cuaca.intent, "cuaca");
    const cuacaAnswer = composeGuideAnswer(cuaca, { failed: ["weather", "peringatan"] }, "id");
    assert.ok(cuacaAnswer.body.trim().length >= 12);
    assert.match(cuacaAnswer.body, /tertunda|cuaca/i);
    assert.doesNotMatch(cuacaAnswer.body, /korban jiwa \d+/i);

    const lapor = matchGuideIntent("saya mau melapor", "id");
    assert.equal(lapor.intent, "lapor");
    const laporAnswer = composeGuideAnswer(lapor, emptyCtx(), "id");
    assert.ok(laporAnswer.body.trim().length >= 12);
    assert.equal(laporAnswer.links.some((item) => item.href === "/lapor/kejadian"), true);

    const banding = matchGuideIntent("bandingkan data kabupaten", "id");
    const bandingAnswer = composeGuideAnswer(banding, emptyCtx(), "id");
    assert.ok(bandingAnswer.body.trim().length >= 12);
    assert.doesNotMatch(bandingAnswer.body, /korban jiwa \d+/i);
  });

  it("drops kejadian-shaped FAQ payloads so matcher still answers", () => {
    const junk = [
      {
        id: "64655b98-0afa-47a4-805f-8ee1a32f65f8",
        jenis_bencana: "Kebakaran gedung dan permukiman",
        kabupaten: "Banda Aceh",
      },
    ];
    assert.equal(parseFaqCatalogItems(junk).length, 0);
    const catalog = mergeFaqCatalog(junk);
    assert.ok(catalog.every((entry) => Array.isArray(entry.patterns.id)));
    const cuaca = matchGuideIntent("bagaimana cuaca hari ini", "id", { faq: catalog });
    assert.equal(cuaca.intent, "cuaca");
    assert.doesNotThrow(() =>
      matchGuideIntent("saya mau melapor", "id", { faq: junk as never })
    );
  });

  it("sanitizes unknown logs and keeps the LLM gate closed", () => {
    assert.equal(PANDUAN_LLM_ENABLED, false);
    const cleaned = sanitizeUnknownQuery("hubungi admin@example.com 081234567890 12345678");
    assert.doesNotMatch(cleaned, /example\.com/);
    assert.match(cleaned, /\[email\]/);
    assert.match(cleaned, /\[tel\]|\[angka\]/);
    const unknown = composeGuideAnswer(matchGuideIntent("xyzabc", "id"), emptyCtx(), "id");
    assert.doesNotMatch(unknown.body, /korban jiwa \d+/i);
    assert.doesNotMatch(unknown.body, /\b\d{2,}\b/);
  });
});
