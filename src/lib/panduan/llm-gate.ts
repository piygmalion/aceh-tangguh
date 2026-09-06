import { normalizeGuideQuery } from "./match-text";
import type { GuideMatch } from "./types";

/**
 * Client-visible constant stays closed. The browser never reads provider keys.
 * A successful POST /api/panduan/ask is the only way a grounded LLM answer appears.
 */
export const PANDUAN_LLM_ENABLED = false;

export type PanduanLlmProvider = "grok" | "gemini" | "openai";

export function getPanduanLlmProvider(): PanduanLlmProvider | null {
  const raw = (process.env.PANDUAN_LLM_PROVIDER ?? "grok").trim().toLowerCase();
  if (raw === "openai") return "openai";
  if (raw === "gemini") return "gemini";
  if (raw === "grok" || raw === "xai") return "grok";
  return null;
}

export function providerApiKey(provider: PanduanLlmProvider): string {
  if (provider === "openai") return process.env.OPENAI_API_KEY?.trim() ?? "";
  if (provider === "gemini") return process.env.GEMINI_API_KEY?.trim() ?? "";
  return process.env.XAI_API_KEY?.trim() ?? "";
}

export function isPanduanLlmEnabled(): boolean {
  if (process.env.PANDUAN_LLM_ENABLED !== "1") return false;
  const provider = getPanduanLlmProvider();
  if (!provider) return false;
  return Boolean(providerApiKey(provider));
}

const KNOWLEDGE_PATTERNS = [
  "apa itu",
  "apa artinya",
  "arti ",
  "mengapa",
  "kenapa",
  "beda ",
  "perbedaan",
  "bagaimana membaca",
  "cara membaca",
  "what is",
  "what does",
  "why ",
  "difference between",
  " vs ",
  " versus ",
];

const RESEARCH_PATTERNS = [
  "analisis",
  "analisa",
  "bandingkan",
  "perbandingan",
  "tren ",
  " tren",
  "riset",
  "jelaskan",
  "implikasi",
  "bagaimana membaca",
  "cara membaca",
  "mengapa",
  "kenapa",
  "analyse",
  "analyze",
  "compare",
  "comparison",
  "trend",
  "research",
  "explain",
  "implication",
];

export function isKnowledgeQuestion(query: string): boolean {
  const text = ` ${normalizeGuideQuery(query)} `;
  return KNOWLEDGE_PATTERNS.some((pattern) => text.includes(pattern));
}

export function isResearchQuestion(query: string): boolean {
  const text = ` ${normalizeGuideQuery(query)} `;
  return RESEARCH_PATTERNS.some((pattern) => text.includes(pattern));
}

const LIVE_V1_INTENTS = new Set([
  "peringatan",
  "cuaca",
  "nomor",
  "destana",
  "kejadian",
  "analisisData",
]);

export function isComparativeResearch(query: string): boolean {
  const text = ` ${normalizeGuideQuery(query)} `;
  return (
    /\b(vs|versus|beda|perbedaan|bandingkan|compare|perbandingan|comparison)\b/.test(text) ||
    /\bdan (irbi|krb|dibi|destana)\b/.test(text)
  );
}

function faqClosesQuery(match: GuideMatch): boolean {
  if (!match.faq) return false;
  if (isComparativeResearch(match.query) && (match.faq.id === "apa-itu-destana" || match.faq.id === "apa-itu-tatonas")) {
    return false;
  }
  return true;
}

export function shouldUseGroundedLlm(match: GuideMatch): boolean {
  if (match.reason === "emergency" || match.reason === "out_of_scope") return false;
  if (match.intent === "tour") return false;
  if (faqClosesQuery(match)) return false;
  if (
    LIVE_V1_INTENTS.has(match.intent) &&
    !isComparativeResearch(match.query) &&
    !isKnowledgeQuestion(match.query)
  ) {
    return false;
  }
  if (match.intent === "unknown") return true;
  return isKnowledgeQuestion(match.query) || isResearchQuestion(match.query);
}
