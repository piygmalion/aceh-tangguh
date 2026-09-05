import { getPanduanLlmProvider, providerApiKey } from "../llm-gate";
import type { GroundedCompleteInput, GroundedCompleteResult } from "./types";

/** Non-reasoning chat id from the current xAI catalog. Override with PANDUAN_LLM_MODEL. */
export const DEFAULT_GROK_MODEL = "grok-4.20-0309-non-reasoning";
export const FALLBACK_GROK_MODEL = "grok-4.6";
const ATTEMPT_TIMEOUT_MS = 7000;

function warnGrok(reason: string, extra?: { status?: number; aborted?: boolean; model?: string }) {
  console.warn("[panduan-llm]", { provider: "grok", reason, ...extra });
}

export function grokModelCandidates(preferred?: string): string[] {
  const first = preferred?.trim() || DEFAULT_GROK_MODEL;
  return first === FALLBACK_GROK_MODEL ? [first] : [first, FALLBACK_GROK_MODEL];
}

export function isGrokModelUnavailable(status: number, bodyText: string): boolean {
  if (status === 404) return true;
  const lower = bodyText.toLowerCase();
  return (
    status === 400 &&
    (lower.includes("model_not_found") ||
      lower.includes("does not exist") ||
      lower.includes("invalid model") ||
      lower.includes("unknown model"))
  );
}

async function completeOnce(
  key: string,
  model: string,
  input: GroundedCompleteInput,
  signal: AbortSignal
): Promise<{ body: string | null; status: number; raw: string }> {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    signal,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.query },
      ],
    }),
  });
  const raw = await res.text();
  if (!res.ok) return { body: null, status: res.status, raw };
  try {
    const data = JSON.parse(raw) as { choices?: { message?: { content?: string } }[] };
    return { body: data.choices?.[0]?.message?.content?.trim() || null, status: res.status, raw };
  } catch {
    return { body: null, status: res.status, raw };
  }
}

export async function completeGrok(
  input: GroundedCompleteInput
): Promise<GroundedCompleteResult | null> {
  if (getPanduanLlmProvider() !== "grok") return null;
  const key = providerApiKey("grok");
  if (!key) return null;

  const models = grokModelCandidates(process.env.PANDUAN_LLM_MODEL);

  try {
    for (let i = 0; i < models.length; i += 1) {
      const model = models[i];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      try {
        const result = await completeOnce(key, model, input, controller.signal);
        if (result.body) return { body: result.body };
        if (result.status === 401 || result.status === 403) {
          warnGrok("unauthorized", { status: result.status, model });
          return null;
        }
        if (result.status >= 400 && isGrokModelUnavailable(result.status, result.raw) && i < models.length - 1) {
          warnGrok("model_not_found", { status: result.status, model });
          continue;
        }
        if (result.status >= 400) {
          warnGrok(result.status < 500 ? "model_4xx" : "upstream_error", {
            status: result.status,
            model,
          });
          return null;
        }
        return null;
      } catch (err) {
        const aborted = err instanceof Error && err.name === "AbortError";
        warnGrok(aborted ? "timeout" : "fetch_error", { aborted, model });
        if (aborted && i < models.length - 1) continue;
        return null;
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  } catch {
    warnGrok("fetch_error");
    return null;
  }
}
