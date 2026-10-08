import { isGuideHref } from "../faq";
import { getPanduanLlmProvider, isPanduanLlmEnabled } from "../llm-gate";
import type { RetrievedChunk } from "../retrieve";
import { hasRetrievableChunk } from "../retrieve";
import type { GuideAnswer, GuideLink, GuideLocale, GuideMatch } from "../types";
import { completeGemini } from "./gemini";
import { completeGrok } from "./grok";
import { completeOpenAi } from "./openai";
import type { GroundedCompleteInput, GroundedInvoker } from "./types";
import { stripInternalSourceIds, validateGroundedBody } from "./validate";

export { stripInternalSourceIds, validateGroundedBody } from "./validate";

function pickInvoker() {
  const provider = getPanduanLlmProvider();
  if (provider === "openai") return completeOpenAi;
  if (provider === "gemini") return completeGemini;
  return completeGrok;
}

function systemPrompt(locale: GuideLocale): string {
  if (locale === "en") {
    return [
      "You are Tanggapi, the SIK Aceh civic research assistant — not the Tanggapi Aceh BTT publication portal.",
      "Rephrase only the provided site snippets. Cite the human titles of those snippets, not sourceId values.",
      "Do not invent casualties, emergency decrees, alert levels, or evacuation orders.",
      "If a snippet is marked delayed, say the data is delayed and do not fill numbers.",
      "If you are not sure, say you do not know so the site can use the V1 answer.",
    ].join(" ");
  }
  return [
    "Anda Tanggapi, asisten riset sipil SIK Aceh — bukan portal publikasi Tanggapi Aceh (BTT).",
    "Rangkai hanya cuplikan situs yang diberi. Sitasi judul manusia pada cuplikan, bukan sourceId.",
    "Dilarang mengarang korban, SK darurat, siaga, atau perintah evakuasi.",
    "Jika cuplikan berlabel tertunda, katakan data tertunda dan jangan mengisi angka.",
    "Jika tidak yakin, katakan tidak yakin agar situs memakai jawaban V1.",
  ].join(" ");
}

export function buildGroundedUserPrompt(query: string, chunks: RetrievedChunk[], locale: GuideLocale): string {
  const header = locale === "en" ? "Snippets:" : "Cuplikan:";
  const ask = locale === "en" ? "Question:" : "Pertanyaan:";
  const lines = chunks.map(
    (chunk) => `[${chunk.sourceId}] ${chunk.title}${chunk.delayed ? " (delayed)" : ""}\n${chunk.text}`
  );
  return `${header}\n\n${lines.join("\n\n")}\n\n${ask} ${query}`;
}

function linksFromChunks(chunks: RetrievedChunk[]): GuideLink[] {
  const seen = new Set<string>();
  const links: GuideLink[] = [];
  for (const chunk of chunks) {
    if (!chunk.href || !isGuideHref(chunk.href)) continue;
    const key = `${chunk.href}:${chunk.hash ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      href: chunk.href,
      hash: chunk.hash,
      labelKey: chunk.labelKey || "linkSumber",
      accent: chunk.href.startsWith("/lapor"),
    });
    if (links.length >= 4) break;
  }
  return links;
}

export function llmSourceCap(locale: GuideLocale): string {
  return locale === "en"
    ? "Compiled by Tanggapi from site sources"
    : "Dirangkai Tanggapi dari sumber situs";
}

export async function completeGrounded(
  input: GroundedCompleteInput,
  invoke?: GroundedInvoker
): Promise<string | null> {
  if (!isPanduanLlmEnabled()) return null;
  if (!hasRetrievableChunk(input.chunks)) return null;

  const run = invoke ?? pickInvoker();

  const result = await run(input);
  if (!result?.body) return null;
  if (!validateGroundedBody(result.body, input.chunks, input.query)) return null;
  return stripInternalSourceIds(result.body.trim(), input.chunks);
}

export async function composeGroundedAnswer(
  match: GuideMatch,
  chunks: RetrievedChunk[],
  locale: GuideLocale,
  invoke?: GroundedInvoker
): Promise<GuideAnswer | null> {
  const user = buildGroundedUserPrompt(match.query, chunks, locale);
  const body = await completeGrounded(
    { system: systemPrompt(locale), chunks, query: user },
    invoke
  );
  if (!body) return null;
  return {
    intent: match.intent,
    body,
    links: linksFromChunks(chunks),
    source: llmSourceCap(locale),
  };
}
