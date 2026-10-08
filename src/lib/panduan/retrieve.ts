import { CONTEXT_FOR_INTENT } from "./intents";
import { getKnowledgeCards, knowledgeBody } from "./knowledge";
import { loadGuideContext } from "./context";
import { isComparativeResearch, isKnowledgeQuestion, isResearchQuestion } from "./llm-gate";
import { normalizeGuideQuery } from "./match-text";
import type {
  GuideContext,
  GuideContextKey,
  GuideHref,
  GuideLocale,
  GuideMatch,
} from "./types";

export type RetrievedChunk = {
  sourceId: string;
  title: string;
  text: string;
  href?: GuideHref;
  hash?: string;
  labelKey?: string;
  delayed?: boolean;
};

const MIN_CHUNKS = 1;
const MAX_KNOWLEDGE = 4;
const MAX_LIVE = 4;
const MAX_TOTAL = 8;

const RESEARCH_KEY_TERMS: { key: GuideContextKey; terms: string[] }[] = [
  { key: "dibi", terms: ["dibi", "historis", "dampak"] },
  { key: "irbi", terms: ["irbi", "indeks risiko"] },
  { key: "krb", terms: ["krb", "kawasan rawan"] },
  { key: "publikasi", terms: ["publikasi", "artikel", "tanggapi aceh"] },
];

function uniqueKeys(keys: GuideContextKey[]): GuideContextKey[] {
  return Array.from(new Set(keys));
}

function researchLiveKeys(query: string): GuideContextKey[] {
  if (!isResearchQuestion(query) && !isComparativeResearch(query)) return [];
  const text = normalizeGuideQuery(query);
  return RESEARCH_KEY_TERMS.filter((row) =>
    row.terms.some((term) => text.includes(normalizeGuideQuery(term)))
  ).map((row) => row.key);
}

/** Public GET keys only — never staff SIK, pengungsian-kaji, or laporan PII. */
export function contextKeysForRetrieval(match: GuideMatch): GuideContextKey[] {
  if (isKnowledgeQuestion(match.query) && !isComparativeResearch(match.query)) {
    return [];
  }

  const extra = researchLiveKeys(match.query);
  if (match.intent !== "unknown") {
    return uniqueKeys([...(CONTEXT_FOR_INTENT[match.intent] ?? []), ...extra]);
  }

  const text = normalizeGuideQuery(match.query);
  const keys = new Set<GuideContextKey>(extra);

  if (match.kabupaten || match.jenis || match.year || match.desa) {
    keys.add("sikStats");
    keys.add("kejadian");
    keys.add("liveStats");
  }
  if (match.desa || /destana|desa tangguh/.test(text)) keys.add("destana");
  if (/\birbi\b|indeks risiko/.test(text)) keys.add("irbi");
  if (/\bkrb\b|kawasan rawan/.test(text)) keys.add("krb");
  if (/cuaca|bmkg|hujan/.test(text)) {
    keys.add("weather");
    keys.add("peringatan");
  }
  if (/tatonas|muka air|magma|sipongi|hotspot|peringatan/.test(text)) {
    keys.add("peringatan");
  }
  if (/\bdibi\b/.test(text)) keys.add("dibi");
  if (/pelatihan/.test(text)) keys.add("pelatihan");
  if (/mitra/.test(text)) keys.add("mitra");
  if (/publikasi/.test(text)) keys.add("publikasi");
  if (/nomor penting|pusdalops|\b112\b/.test(text)) keys.add("nomor");
  return uniqueKeys(Array.from(keys));
}

function scoreTerms(query: string, terms: string[]): number {
  const text = normalizeGuideQuery(query);
  let score = 0;
  for (const term of terms) {
    const t = normalizeGuideQuery(term);
    if (!t || !text.includes(t)) continue;
    if (t.length >= 12) score += 10;
    else if (t.length >= 6) score += 5;
    else score += 2;
  }
  return score;
}

export function retrieveKnowledgeChunks(
  query: string,
  locale: GuideLocale,
  limit = MAX_KNOWLEDGE
): RetrievedChunk[] {
  const scored = getKnowledgeCards()
    .map((card) => ({
      card,
      score: scoreTerms(query, [...card.terms, card.title]),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.card.sourceId.localeCompare(b.card.sourceId));

  const picked = scored.slice(0, limit).map(({ card }) => ({
    sourceId: card.sourceId,
    title: card.title,
    text: knowledgeBody(card, locale),
    href: card.href,
    hash: card.hash,
    labelKey: card.labelKey,
  }));

  const methods = scored
    .filter((row) => row.card.sourceId.startsWith("method-"))
    .slice(0, 2)
    .map(({ card }) => ({
      sourceId: card.sourceId,
      title: card.title,
      text: knowledgeBody(card, locale),
      href: card.href,
      hash: card.hash,
      labelKey: card.labelKey,
    }));

  const seen = new Set(methods.map((chunk) => chunk.sourceId));
  const rest = picked.filter((chunk) => !seen.has(chunk.sourceId));
  return [...methods, ...rest].slice(0, limit);
}

function delayedChunk(
  sourceId: string,
  title: string,
  href: GuideHref,
  labelKey: string,
  locale: GuideLocale
): RetrievedChunk {
  return {
    sourceId,
    title,
    text:
      locale === "en"
        ? `${title} data is delayed. Do not invent figures.`
        : `Data ${title} sedang tertunda. Angka tidak diisi.`,
    href,
    labelKey,
    delayed: true,
  };
}

export function contextToChunks(ctx: GuideContext, locale: GuideLocale): RetrievedChunk[] {
  const chunks: RetrievedChunk[] = [];
  const failed = new Set(ctx.failed);

  if (failed.has("peringatan") || ctx.peringatan === null) {
    if (failed.has("peringatan")) {
      chunks.push(delayedChunk("live:peringatan", "peringatan dini", "/", "linkPeringatan", locale));
    }
  } else if (ctx.peringatan) {
    const p = ctx.peringatan;
    const parts = [
      p.cuacaEmpty
        ? locale === "en"
          ? "Weather: no attention-worthy condition."
          : "Cuaca: tidak ada kondisi yang perlu perhatian."
        : p.cuacaHighlight
          ? `${locale === "en" ? "Weather" : "Cuaca"}: ${p.cuacaHighlight}`
          : null,
      p.magmaEmpty
        ? locale === "en"
          ? "MAGMA: no Aceh quake on the feed."
          : "MAGMA: tidak ada gempa Aceh pada umpan."
        : p.magmaSummary
          ? `MAGMA: ${p.magmaSummary}`
          : null,
      p.sipongiEmpty
        ? locale === "en"
          ? "Sipongi: no medium/high Aceh hotspot."
          : "Sipongi: tidak ada hotspot Aceh medium/tinggi."
        : `Sipongi: ${p.sipongiCount}${p.sipongiPlace ? ` (${p.sipongiPlace})` : ""}`,
      p.tatonasEmpty
        ? locale === "en"
          ? "Tatonas: no hydrology highlight."
          : "Tatonas: tidak ada sorotan hidrologi."
        : p.tatonasHighlight
          ? `Tatonas: ${p.tatonasHighlight}`
          : null,
      p.stale
        ? locale === "en"
          ? "Some warning feeds are marked delayed."
          : "Sebagian umpan peringatan berlabel data tertunda."
        : null,
    ].filter(Boolean);
    chunks.push({
      sourceId: "live:peringatan",
      title: locale === "en" ? "Early warning" : "Peringatan dini",
      text: parts.join(" "),
      href: "/",
      hash: "status",
      labelKey: "linkPeringatan",
    });
  }

  if (failed.has("weather")) {
    chunks.push(delayedChunk("live:weather", "cuaca", "/", "linkCuaca", locale));
  } else if (ctx.weather) {
    const temp = ctx.weather.tempC != null ? `${ctx.weather.tempC}°C` : "";
    chunks.push({
      sourceId: "live:weather",
      title: locale === "en" ? "Weather" : "Cuaca",
      text: `${ctx.weather.kabupaten}: ${ctx.weather.desc}${temp ? ` ${temp}` : ""}`.trim(),
      href: "/",
      hash: "cuaca",
      labelKey: "linkCuaca",
    });
  }

  if (failed.has("liveStats")) {
    chunks.push(delayedChunk("live:stats", "statistik live", "/data-bencana", "linkDataBencana", locale));
  } else if (ctx.liveStats) {
    chunks.push({
      sourceId: "live:stats",
      title: "Live stats",
      text: locale === "en"
        ? `Active incidents ${ctx.liveStats.activeIncidents}; reports last 24h ${ctx.liveStats.reportsLast24h}.`
        : `Kejadian aktif ${ctx.liveStats.activeIncidents}; laporan 24 jam ${ctx.liveStats.reportsLast24h}.`,
      href: "/data-bencana",
      labelKey: "linkDataBencana",
    });
  }

  if (failed.has("sikStats")) {
    chunks.push(
      delayedChunk(
        "live:sik-stats",
        locale === "en" ? "Operational incidents" : "Kejadian operasional",
        "/data-bencana",
        "linkDataBencana",
        locale,
      ),
    );
  } else if (ctx.sikStats) {
    const top = ctx.sikStats.byJenis
      .slice(0, 3)
      .map((row) => `${row.jenis} ${row.count}`)
      .join(", ");
    const line =
      locale === "en"
        ? `Operational incidents ${ctx.sikStats.year}: ${ctx.sikStats.total} events`
        : `Kejadian operasional ${ctx.sikStats.year}: ${ctx.sikStats.total} kejadian`;
    chunks.push({
      sourceId: "live:sik-stats",
      title: line,
      text: `${line}.${top ? ` ${top}.` : ""}`,
      href: "/data-bencana",
      labelKey: "linkDataBencana",
    });
  }

  if (failed.has("nomor")) {
    chunks.push(delayedChunk("live:nomor", "nomor penting", "/nomor-penting", "linkNomor", locale));
  } else if (ctx.nomor?.length) {
    const lines = ctx.nomor
      .slice(0, 4)
      .map((row) => `${row.nama} ${row.telepon}`)
      .join("; ");
    chunks.push({
      sourceId: "live:nomor",
      title: locale === "en" ? "Contacts" : "Nomor penting",
      text: lines,
      href: "/nomor-penting",
      labelKey: "linkNomor",
    });
  }

  if (failed.has("destana")) {
    chunks.push(delayedChunk("live:destana", "Destana", "/destana", "linkDestana", locale));
  } else if (ctx.destanaDesa) {
    chunks.push({
      sourceId: "live:destana-desa",
      title: ctx.destanaDesa.nama,
      text: [
        ctx.destanaDesa.nama,
        ctx.destanaDesa.kabupaten,
        ctx.destanaDesa.kecamatan,
        ctx.destanaDesa.destanaLevel,
      ]
        .filter(Boolean)
        .join(" — "),
      href: "/destana",
      labelKey: "linkDestana",
    });
  } else if (ctx.destana) {
    const counts = Object.entries(ctx.destana.counts)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ");
    chunks.push({
      sourceId: "live:destana",
      title: "Destana",
      text: counts || (locale === "en" ? "Destana counts from the public catalogue." : "Rekap Destana dari katalog publik."),
      href: "/destana",
      labelKey: "linkDestana",
    });
  }

  if (failed.has("kejadian")) {
    chunks.push(delayedChunk("live:kejadian", "kejadian", "/data-bencana", "linkDataBencana", locale));
  } else if (ctx.kejadian) {
    const items = ctx.kejadian.items
      .slice(0, 4)
      .map((row) => [row.jenis, row.kabupaten, row.tanggal].filter(Boolean).join(" "))
      .join("; ");
    chunks.push({
      sourceId: "live:kejadian",
      title: locale === "en" ? "Incidents" : "Kejadian",
      text: `${locale === "en" ? "Total" : "Total"} ${ctx.kejadian.total}.${items ? ` ${items}` : ""}`,
      href: "/data-bencana",
      labelKey: "linkDataBencana",
    });
  }

  if (failed.has("dibi")) {
    chunks.push(delayedChunk("live:dibi", "DIBI", "/", "linkDibi", locale));
  } else if (ctx.dibi) {
    const extra =
      ctx.dibi.meninggal != null
        ? locale === "en"
          ? ` Deaths recorded in DIBI ${ctx.dibi.meninggal}.`
          : ` Meninggal tercatat DIBI ${ctx.dibi.meninggal}.`
        : "";
    chunks.push({
      sourceId: "live:dibi",
      title: "DIBI Aceh",
      text: `DIBI ${ctx.dibi.yearFrom}–${ctx.dibi.yearTo}: ${ctx.dibi.kejadian} ${locale === "en" ? "events" : "kejadian"}.${ctx.dibi.topKategori ? ` ${ctx.dibi.topKategori}.` : ""}${extra}`,
      href: "/",
      hash: "dibi",
      labelKey: "linkDibi",
    });
  }

  if (failed.has("irbi")) {
    chunks.push(delayedChunk("live:irbi", "IRBI", "/", "linkIrbi", locale));
  } else if (ctx.irbi) {
    chunks.push({
      sourceId: "live:irbi",
      title: "IRBI",
      text: [
        ctx.irbi.kab,
        ctx.irbi.kelas,
        ctx.irbi.irb != null ? String(ctx.irbi.irb) : null,
        ctx.irbi.provinsiKelas,
        ctx.irbi.provinsiIrb != null ? String(ctx.irbi.provinsiIrb) : null,
      ]
        .filter(Boolean)
        .join(" — "),
      href: "/",
      labelKey: "linkIrbi",
    });
  }

  if (failed.has("krb")) {
    chunks.push(delayedChunk("live:krb", "KRB", "/metodologi", "linkMetodologi", locale));
  } else if (ctx.krb) {
    chunks.push({
      sourceId: "live:krb",
      title: "KRB",
      text: [
        ctx.krb.kabupaten,
        ctx.krb.kawasanCount != null ? String(ctx.krb.kawasanCount) : null,
      ]
        .filter(Boolean)
        .join(" — ") || (locale === "en" ? "KRB inventory from the public API." : "Inventaris KRB dari API publik."),
      href: "/metodologi",
      labelKey: "linkMetodologi",
    });
  }

  if (failed.has("pelatihan")) {
    chunks.push(delayedChunk("live:pelatihan", "pelatihan", "/pelatihan", "linkPelatihan", locale));
  } else if (ctx.pelatihan?.length) {
    chunks.push({
      sourceId: "live:pelatihan",
      title: locale === "en" ? "Training" : "Pelatihan",
      text: ctx.pelatihan
        .slice(0, 3)
        .map((row) => [row.judul, row.tanggal, row.status].filter(Boolean).join(" "))
        .join("; "),
      href: "/pelatihan",
      labelKey: "linkPelatihan",
    });
  }

  if (failed.has("mitra")) {
    chunks.push(delayedChunk("live:mitra", "mitra", "/mitra", "linkMitra", locale));
  } else if (ctx.mitra?.length) {
    chunks.push({
      sourceId: "live:mitra",
      title: locale === "en" ? "Partners" : "Mitra",
      text: ctx.mitra.slice(0, 4).map((row) => row.judul).join("; "),
      href: "/mitra",
      labelKey: "linkMitra",
    });
  }

  if (failed.has("publikasi")) {
    chunks.push(delayedChunk("live:publikasi", "publikasi", "/publikasi", "linkPublikasi", locale));
  } else if (ctx.publikasi?.length) {
    chunks.push({
      sourceId: "live:publikasi",
      title: locale === "en" ? "Publications" : "Publikasi",
      text: ctx.publikasi
        .slice(0, 4)
        .map((row) => `${row.title} (${row.channel})`)
        .join("; "),
      href: "/publikasi",
      labelKey: "linkPublikasi",
    });
  }

  return chunks;
}

function pickLiveChunks(chunks: RetrievedChunk[], query: string): RetrievedChunk[] {
  if (chunks.length <= MAX_LIVE) return chunks;
  const scored = chunks
    .map((chunk) => ({
      chunk,
      score: scoreTerms(query, [chunk.title, chunk.sourceId.replace(/^(live|source|juklak|faq|concept|method)-/, "")]),
    }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_LIVE).map((row) => row.chunk);
}

export async function retrieveGuideChunks(
  match: GuideMatch,
  locale: GuideLocale
): Promise<RetrievedChunk[]> {
  const knowledge = retrieveKnowledgeChunks(match.query, locale, MAX_KNOWLEDGE);
  const keys = contextKeysForRetrieval(match);
  const ctx = keys.length ? await loadGuideContext(match, locale, keys) : { failed: [] as GuideContextKey[] };
  const live = pickLiveChunks(contextToChunks(ctx, locale), match.query);
  return [...knowledge, ...live].slice(0, MAX_TOTAL);
}

export function hasRetrievableChunk(chunks: RetrievedChunk[]): boolean {
  return chunks.filter((chunk) => chunk.sourceId.trim()).length >= MIN_CHUNKS;
}
