import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { completeGrounded, stripInternalSourceIds, validateGroundedBody } from "./llm";
import {
  DEFAULT_GROK_MODEL,
  FALLBACK_GROK_MODEL,
  grokModelCandidates,
  isGrokModelUnavailable,
} from "./llm/grok";
import {
  getPanduanLlmProvider,
  isPanduanLlmEnabled,
  PANDUAN_LLM_ENABLED,
  shouldUseGroundedLlm,
} from "./llm-gate";
import { llmSourceCap } from "./llm";
import { matchGuideIntent } from "./match";
import { composeGuideAnswer } from "./answers";
import { askGroundedLlm, resetGroundedAskEnabledCache } from "./ask";
import type { GuideContext } from "./types";

const emptyCtx = (): GuideContext => ({ failed: [] });

const ENV_KEYS = [
  "PANDUAN_LLM_ENABLED",
  "PANDUAN_LLM_PROVIDER",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "XAI_API_KEY",
  "PANDUAN_LLM_MODEL",
] as const;

const envSnapshot: Record<string, string | undefined> = {};

function snapEnv() {
  for (const key of ENV_KEYS) envSnapshot[key] = process.env[key];
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (envSnapshot[key] === undefined) delete process.env[key];
    else process.env[key] = envSnapshot[key];
  }
}

snapEnv();

describe("panduan grounded LLM gate", () => {
  afterEach(() => restoreEnv());

  it("keeps the client-visible flag closed", () => {
    assert.equal(PANDUAN_LLM_ENABLED, false);
  });

  it("stays disabled without a provider key", () => {
    process.env.PANDUAN_LLM_ENABLED = "1";
    process.env.PANDUAN_LLM_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.XAI_API_KEY;
    assert.equal(isPanduanLlmEnabled(), false);
  });

  it("defaults to grok and stays off without XAI_API_KEY", async () => {
    process.env.PANDUAN_LLM_ENABLED = "1";
    delete process.env.PANDUAN_LLM_PROVIDER;
    delete process.env.XAI_API_KEY;
    assert.equal(getPanduanLlmProvider(), "grok");
    assert.equal(isPanduanLlmEnabled(), false);
    let called = 0;
    const body = await completeGrounded(
      {
        system: "sys",
        chunks: [{ sourceId: "concept-tanggapi-asisten", title: "Tanggapi", text: "Asisten situs." }],
        query: "apa itu tanggapi",
      },
      async () => {
        called += 1;
        return { body: "Tidak boleh dipanggil." };
      }
    );
    assert.equal(body, null);
    assert.equal(called, 0);
  });

  it("does not call the adapter without a key or without chunks", async () => {
    process.env.PANDUAN_LLM_ENABLED = "1";
    process.env.PANDUAN_LLM_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;
    let called = 0;
    const invoke = async () => {
      called += 1;
      return { body: "Jawaban dari model yang tidak boleh dipanggil." };
    };
    const noKey = await completeGrounded(
      {
        system: "sys",
        chunks: [{ sourceId: "juklak-banjir-bandang", title: "Banjir bandang", text: "Label katalog." }],
        query: "apa itu banjir bandang",
      },
      invoke
    );
    assert.equal(noKey, null);
    assert.equal(called, 0);

    process.env.GEMINI_API_KEY = "test-not-a-real-key";
    const empty = await completeGrounded(
      { system: "sys", chunks: [], query: "apa itu banjir bandang" },
      invoke
    );
    assert.equal(empty, null);
    assert.equal(called, 0);
  });

  it("rejects a model that invents casualty figures", async () => {
    process.env.PANDUAN_LLM_ENABLED = "1";
    process.env.PANDUAN_LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-not-a-real-key";
    const chunks = [
      {
        sourceId: "juklak-banjir-bandang",
        title: "Banjir bandang",
        text: "Banjir bandang adalah nama kejadian katalog Juklak, bukan jumlah korban.",
      },
    ];
    assert.equal(
      validateGroundedBody("Ada 12 korban jiwa di lokasi itu.", chunks, "apa itu banjir bandang"),
      false
    );
    const body = await completeGrounded(
      { system: "sys", chunks, query: "apa itu banjir bandang" },
      async () => ({ body: "Ada 12 korban jiwa di lokasi itu." })
    );
    assert.equal(body, null);
  });

  it("allows sentence counters 1–10 on Destana/IRBI snippets without digits", () => {
    const chunks = [
      {
        sourceId: "concept-destana",
        title: "Destana",
        text: "Destana adalah status ketangguhan desa (belum / pratama / madya / utama) dari katalog SIK publik.",
      },
      {
        sourceId: "concept-irbi-krb",
        title: "IRBI dan KRB",
        text: "IRBI adalah kelas indeks risiko BNPB. Situs ini menampilkan kelas IRBI, bukan zona KRB.",
      },
    ];
    assert.equal(validateGroundedBody("Dua konsep ini membedakan kesiapsiagaan desa dan kelas risiko.", chunks), true);
    assert.equal(validateGroundedBody("2 konsep ini membedakan Destana dan IRBI.", chunks), true);
    assert.equal(validateGroundedBody("Ada 2 korban jiwa di lokasi itu.", chunks), false);
    assert.equal(validateGroundedBody("Ada dua korban jiwa di lokasi itu.", chunks), false);
  });

  it("strips internal sourceId tokens before the body is returned", async () => {
    process.env.PANDUAN_LLM_ENABLED = "1";
    process.env.PANDUAN_LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-not-a-real-key";
    const chunks = [
      {
        sourceId: "concept-destana",
        title: "Destana",
        text: "Destana adalah status ketangguhan desa dari katalog SIK publik.",
      },
    ];
    assert.equal(
      stripInternalSourceIds("Destana [concept-destana] membedakan kesiapsiagaan. concept-destana", chunks),
      "Destana membedakan kesiapsiagaan."
    );
    const body = await completeGrounded(
      { system: "sys", chunks, query: "apa itu destana vs IRBI" },
      async () => ({ body: "Destana [concept-destana] adalah status desa, bukan evakuasi." })
    );
    assert.match(body ?? "", /Destana/);
    assert.doesNotMatch(body ?? "", /concept-destana/);
  });

  it("rejects casualty figures that appear only in the user query", () => {
    const chunks = [
      {
        sourceId: "juklak-banjir-bandang",
        title: "Banjir bandang",
        text: "Banjir bandang adalah nama kejadian katalog Juklak, bukan jumlah korban.",
      },
    ];
    assert.equal(
      validateGroundedBody(
        "Ada 12 korban jiwa di lokasi itu.",
        chunks,
        "apakah ada 12 korban di aceh utara?"
      ),
      false
    );
  });

  it("accepts a cited definition that uses numbers already in the snippets", async () => {
    process.env.PANDUAN_LLM_ENABLED = "1";
    process.env.PANDUAN_LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-not-a-real-key";
    const chunks = [
      {
        sourceId: "juklak-101",
        title: "Banjir",
        text: "Banjir (kode 101) adalah bencana alam dalam Juklak BNPB No. 7 Tahun 2023.",
      },
    ];
    const body = await completeGrounded(
      { system: "sys", chunks, query: "apa itu banjir" },
      async () => ({
        body: "Banjir berkode 101 pada Juklak BNPB No. 7 Tahun 2023. Sumber: juklak-101.",
      })
    );
    assert.match(body ?? "", /kode 101/);
  });

  it("uses V1 for tour, emergency, FAQ, and live templates", () => {
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("mulai tur", "id")), false);
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("saya terluka butuh ambulans", "id")), false);
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("bencana di jakarta", "id")), false);
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("apa itu destana", "id")), false);
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("peringatan dini", "id")), false);
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("kejadian banjir aceh utara 2024", "id")), false);
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("analisis cuaca banda aceh", "id")), false);
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("analisis data bencana", "id")), false);
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("jelaskan tren kejadian aceh utara 2024", "id")), false);
  });

  it("allows LLM for unknown or uncovered knowledge questions", () => {
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("xyzabc", "id")), true);
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("apa itu banjir bandang", "id")), true);
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("apa itu destana vs IRBI", "id")), true);
    assert.equal(shouldUseGroundedLlm(matchGuideIntent("bandingkan destana dan IRBI", "id")), true);
  });

  it("does not POST ask when GET reports the gate closed", async () => {
    resetGroundedAskEnabledCache();
    const methods: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      methods.push((init?.method ?? "GET").toUpperCase());
      void input;
      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    }) as typeof fetch;
    try {
      const answer = await askGroundedLlm({ query: "xyzabc", locale: "id", pathname: "/" });
      assert.equal(answer, null);
      assert.equal(methods.includes("GET"), true);
      assert.equal(methods.includes("POST"), false);
    } finally {
      globalThis.fetch = original;
      resetGroundedAskEnabledCache();
    }
  });

  it("defaults Grok to a current catalog id and falls back on model 4xx", () => {
    assert.notEqual(DEFAULT_GROK_MODEL, "grok-4-fast");
    assert.equal(DEFAULT_GROK_MODEL, "grok-4.20-0309-non-reasoning");
    assert.deepEqual(grokModelCandidates(), [DEFAULT_GROK_MODEL, FALLBACK_GROK_MODEL]);
    assert.deepEqual(grokModelCandidates("grok-4.6"), ["grok-4.6"]);
    assert.equal(isGrokModelUnavailable(404, ""), true);
    assert.equal(isGrokModelUnavailable(400, '{"error":{"code":"model_not_found"}}'), true);
    assert.equal(isGrokModelUnavailable(401, "unauthorized"), false);
    assert.equal(isGrokModelUnavailable(429, "rate limited"), false);
  });

  it("labels grounded answers as Tanggapi, not Grokbot", () => {
    assert.match(llmSourceCap("id"), /Tanggapi/);
    assert.doesNotMatch(llmSourceCap("id"), /Grok|Grokbot/i);
  });

  it("keeps unknown V1 answers free of fake operational numbers", () => {
    const answer = composeGuideAnswer(matchGuideIntent("xyzabc", "id"), emptyCtx(), "id");
    assert.doesNotMatch(answer.body, /korban jiwa \d+/i);
    assert.doesNotMatch(answer.body, /\b\d{2,}\b/);
  });
});
