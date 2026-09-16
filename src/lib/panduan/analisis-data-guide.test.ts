import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { composeGuideAnswer } from "./answers";
import { STATIC_GUIDE_FAQ } from "./faq";
import { shouldUseGroundedLlm } from "./llm-gate";
import { validateGroundedBody } from "./llm/validate";
import { matchGuideIntent } from "./match";
import { chipsForPathname, GUIDE_CHIP_KEYS, welcomeQueryForPath } from "./page-context";
import { retrieveKnowledgeChunks } from "./retrieve";
import type { GuideContext } from "./types";

const ROOT = process.cwd();
const emptyCtx = (): GuideContext => ({ failed: [] });

function messages(locale: "id" | "en"): { panduan: { chips: Record<string, string> } } {
  return JSON.parse(readFileSync(join(ROOT, `messages/${locale}.json`), "utf8")) as {
    panduan: { chips: Record<string, string> };
  };
}

const ID_QUERIES = [
  "analisis data",
  "analisis data bencana",
  "cara memakai filter analisis data",
  "bagaimana membaca grafik analisis data",
  "beda analisis data dan data bencana",
  "analisis data vs dibi",
  "analisis data bukan publikasi tanggapi aceh",
] as const;

const EN_QUERIES = [
  "disaster analysis",
  "disaster data analysis",
  "how to use disaster analysis filters",
  "how to read disaster analysis charts",
  "disaster analysis vs disaster data",
  "disaster analysis is not dibi",
] as const;

describe("Tanggapi analisis data guidance", () => {
  it("exposes an analisisData chip on home and as lead on /analisis-data", () => {
    assert.equal(GUIDE_CHIP_KEYS.includes("analisisData"), true);
    assert.equal(chipsForPathname("/").includes("analisisData"), true);
    assert.equal(chipsForPathname("/").at(-1), "lapor");
    assert.equal(chipsForPathname("/analisis-data")[0], "analisisData");
    assert.equal(chipsForPathname("/data-bencana").includes("analisisData"), true);
    assert.equal(chipsForPathname("/data-bencana")[0], "kejadian");
    assert.equal(welcomeQueryForPath("/analisis-data", "id"), "analisis data");
    assert.equal(welcomeQueryForPath("/analisis-data", "en"), "disaster analysis");
    const bot = readFileSync(join(ROOT, "src/components/panduan/GuideBot.tsx"), "utf8");
    assert.match(bot, /analisisData:\s*\{\s*id:\s*"analisis data"/);
    assert.match(bot, /en:\s*"disaster analysis"/);
  });

  it("ships i18n chip labels for analisisData in ID and EN", () => {
    assert.equal(messages("id").panduan.chips.analisisData, "Analisis data");
    assert.equal(messages("en").panduan.chips.analisisData, "Data analysis");
    for (const key of GUIDE_CHIP_KEYS) {
      assert.equal(typeof messages("id").panduan.chips[key], "string", `id chips.${key}`);
      assert.equal(typeof messages("en").panduan.chips[key], "string", `en chips.${key}`);
    }
  });

  it("matches common ID and EN analysis questions to analisisData, not unknown", () => {
    for (const query of ID_QUERIES) {
      const match = matchGuideIntent(query, "id");
      assert.equal(match.intent, "analisisData", query);
      assert.notEqual(match.intent, "unknown", query);
    }
    for (const query of EN_QUERIES) {
      const match = matchGuideIntent(query, "en");
      assert.equal(match.intent, "analisisData", query);
    }
    assert.equal(matchGuideIntent("analisis cuaca banda aceh", "id").intent, "cuaca");
    assert.equal(matchGuideIntent("publikasi analisis", "id").intent, "publikasi");
    assert.equal(matchGuideIntent("bagaimana membaca DIBI", "id").intent, "dibi");
  });

  it("routes how-to and vs questions to specific FAQ ids before the overview", () => {
    const ids = STATIC_GUIDE_FAQ.map((entry) => entry.id);
    assert.equal(ids.includes("filter-url-analisis-data"), true);
    assert.equal(ids.includes("grafik-analisis-data"), true);
    assert.equal(ids.includes("beda-analisis-data-sumber"), true);
    const overviewIdx = ids.indexOf("apa-itu-analisis-data");
    assert.ok(overviewIdx >= 0);
    assert.ok(ids.indexOf("filter-url-analisis-data") < overviewIdx);
    assert.ok(ids.indexOf("grafik-analisis-data") < overviewIdx);
    assert.ok(ids.indexOf("beda-analisis-data-sumber") < overviewIdx);

    assert.equal(
      matchGuideIntent("cara memakai filter analisis data", "id").faq?.id,
      "filter-url-analisis-data"
    );
    assert.equal(
      matchGuideIntent("how to use disaster analysis filters", "en").faq?.id,
      "filter-url-analisis-data"
    );
    assert.equal(
      matchGuideIntent("bagaimana membaca grafik analisis data", "id").faq?.id,
      "grafik-analisis-data"
    );
    assert.equal(
      matchGuideIntent("how to read disaster analysis charts", "en").faq?.id,
      "grafik-analisis-data"
    );
    assert.equal(
      matchGuideIntent("beda analisis data dan data bencana", "id").faq?.id,
      "beda-analisis-data-sumber"
    );
    assert.equal(
      matchGuideIntent("disaster analysis vs disaster data", "en").faq?.id,
      "beda-analisis-data-sumber"
    );
    assert.equal(matchGuideIntent("analisis data", "id").faq?.id, "apa-itu-analisis-data");
  });

  it("answers V1 without inventing casualty figures and with the analisis-data link", () => {
    const samples = [
      composeGuideAnswer(matchGuideIntent("analisis data", "id"), emptyCtx(), "id"),
      composeGuideAnswer(matchGuideIntent("cara memakai filter analisis data", "id"), emptyCtx(), "id"),
      composeGuideAnswer(matchGuideIntent("bagaimana membaca grafik analisis data", "id"), emptyCtx(), "id"),
      composeGuideAnswer(matchGuideIntent("beda analisis data dan DIBI", "id"), emptyCtx(), "id"),
      composeGuideAnswer(matchGuideIntent("disaster analysis", "en"), emptyCtx(), "en"),
      composeGuideAnswer(matchGuideIntent("how to read disaster analysis charts", "en"), emptyCtx(), "en"),
    ];
    for (const answer of samples) {
      assert.equal(answer.intent, "analisisData");
      assert.ok(answer.body.trim().length >= 40, answer.body);
      assert.equal(answer.links.some((link) => link.href === "/analisis-data"), true);
      assert.doesNotMatch(answer.body, /korban jiwa \d+|meninggal \d+|tewas \d+/i);
      assert.doesNotMatch(answer.body, /\b\d{2,}\b/);
      assert.equal(shouldUseGroundedLlm(matchGuideIntent("analisis data", "id")), false);
    }

    const overview = composeGuideAnswer(matchGuideIntent("analisis data", "id"), emptyCtx(), "id");
    assert.match(overview.body, /filter/i);
    assert.match(overview.body, /URL/i);
    assert.match(overview.body, /DIBI/i);
    assert.match(overview.body, /tidak dijumlahkan/i);
    assert.match(overview.body, /tanggapi\.acehprov\.go\.id|BTT/i);

    const filters = composeGuideAnswer(
      matchGuideIntent("cara memakai filter analisis data", "id"),
      emptyCtx(),
      "id"
    );
    assert.match(filters.body, /jenis/i);
    assert.match(filters.body, /kabupaten/i);
    assert.match(filters.body, /from|to|URL/i);

    const charts = composeGuideAnswer(
      matchGuideIntent("bagaimana membaca grafik analisis data", "id"),
      emptyCtx(),
      "id"
    );
    assert.match(charts.body, /grafik|batang|tren/i);
    assert.match(charts.body, /filter/i);

    const vs = composeGuideAnswer(
      matchGuideIntent("beda analisis data dan data bencana", "id"),
      emptyCtx(),
      "id"
    );
    assert.match(vs.body, /Data bencana/i);
    assert.match(vs.body, /DIBI/i);
    assert.match(vs.body, /publikasi|BTT|tanggapi\.acehprov/i);
    assert.equal(vs.links.some((link) => link.href === "/data-bencana"), true);
  });

  it("retrieves analisis knowledge cards and keeps V1 bodies grounded", () => {
    const overview = retrieveKnowledgeChunks("analisis data bencana", "id");
    assert.ok(overview.some((chunk) => chunk.sourceId === "concept-analisis-data"));
    assert.equal(
      overview.some((chunk) => chunk.sourceId === "concept-tanggapi-publikasi"),
      false
    );

    const filters = retrieveKnowledgeChunks("cara memakai filter analisis data", "id");
    assert.ok(
      filters.some((chunk) => chunk.sourceId === "concept-analisis-filter-url"),
      filters.map((chunk) => chunk.sourceId).join(",")
    );
    const charts = retrieveKnowledgeChunks("grafik tren waktu analisis data", "id");
    assert.ok(
      charts.some((chunk) => chunk.sourceId === "concept-analisis-grafik"),
      charts.map((chunk) => chunk.sourceId).join(",")
    );
    const vs = retrieveKnowledgeChunks("beda analisis data dan DIBI", "id");
    assert.ok(
      vs.some((chunk) => chunk.sourceId === "concept-analisis-vs-sumber"),
      vs.map((chunk) => chunk.sourceId).join(",")
    );

    const answer = composeGuideAnswer(matchGuideIntent("analisis data", "id"), emptyCtx(), "id");
    assert.equal(
      validateGroundedBody(
        answer.body,
        retrieveKnowledgeChunks("analisis data", "id").map((chunk) => ({ text: chunk.text }))
      ),
      true
    );
    assert.equal(
      validateGroundedBody("Ada 12 korban jiwa pada grafik analisis.", overview),
      false
    );
  });
});
