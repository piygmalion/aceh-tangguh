/**
 * Offline routing/retrieve/validator probe. No provider keys required.
 * Usage: node --import tsx scripts/probe-tanggapi-routing.mjs
 */
const { matchGuideIntent } = await import("../src/lib/panduan/match.ts");
const { shouldUseGroundedLlm } = await import("../src/lib/panduan/llm-gate.ts");
const { retrieveKnowledgeChunks, contextKeysForRetrieval } = await import(
  "../src/lib/panduan/retrieve.ts"
);
const { validateGroundedBody } = await import("../src/lib/panduan/llm/validate.ts");

const queries = [
  "bandingkan destana dan IRBI",
  "apa itu tanggapi",
  "apa itu tanggapi aceh",
  "bagaimana membaca DIBI",
  "apakah ada 12 korban di aceh utara?",
  "analisis cuaca banda aceh",
  "jelaskan tren kejadian aceh utara 2024",
  "destana aceh utara",
  "peringatan dini",
  "apa itu banjir bandang",
];

const rows = queries.map((query) => {
  const match = matchGuideIntent(query, "id");
  const llm = shouldUseGroundedLlm(match);
  const knowledge = retrieveKnowledgeChunks(query, "id");
  return {
    query,
    intent: match.intent,
    reason: match.reason,
    faq: match.faq?.id ?? null,
    llm,
    liveKeys: contextKeysForRetrieval(match),
    knowledgeIds: knowledge.map((chunk) => chunk.sourceId),
  };
});

const destanaChunks = retrieveKnowledgeChunks("bandingkan destana dan IRBI", "id");
const validatorCases = [
  {
    name: "invented casualty",
    body: "Ada 12 korban jiwa di lokasi itu.",
    chunks: destanaChunks,
    query: "apakah ada 12 korban di aceh utara?",
  },
  {
    name: "structural 2-vs-3 not in chunks",
    body: "Destana menilai kesiapsiagaan desa; IRBI menilai indeks risiko kabupaten. Dua konsep berbeda.",
    chunks: destanaChunks,
    query: "bandingkan destana dan IRBI",
  },
  {
    name: "sourceId citation plus year not in corpus",
    body: "Menurut concept-destana, Destana adalah program desa tangguh sejak 2016.",
    chunks: destanaChunks,
    query: "bandingkan destana dan IRBI",
  },
  {
    name: "only words from snippets, no extra numbers",
    body: destanaChunks[0]
      ? `${destanaChunks[0].text.slice(0, 80)} Sumber: ${destanaChunks[0].sourceId}.`
      : "Destana dan IRBI berbeda. Sumber: concept-destana.",
    chunks: destanaChunks,
    query: "bandingkan destana dan IRBI",
  },
  {
    name: "arabic 2 not in chunks",
    body: "Destana dan IRBI adalah 2 konsep berbeda.",
    chunks: destanaChunks,
    query: "bandingkan destana dan IRBI",
  },
  {
    name: "word dua no digits",
    body: "Destana dan IRBI adalah dua konsep berbeda.",
    chunks: destanaChunks,
    query: "bandingkan destana dan IRBI",
  },
];

const validator = validatorCases.map((row) => ({
  name: row.name,
  pass: validateGroundedBody(row.body, row.chunks, row.query),
  numbersInChunks: Array.from(
    new Set(
      destanaChunks.flatMap((chunk) =>
        Array.from(chunk.text.matchAll(/\b\d+(?:[.,]\d+)?\b/g), (m) => m[0])
      )
    )
  ),
}));

console.log(
  JSON.stringify(
    {
      routing: rows,
      validator,
      knowledgeForBanding: destanaChunks.map((c) => ({
        id: c.sourceId,
        title: c.title,
      })),
    },
    null,
    2
  )
);
