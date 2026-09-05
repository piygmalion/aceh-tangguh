import { getPanduanLlmProvider, providerApiKey } from "../llm-gate";
import type { GroundedCompleteInput, GroundedCompleteResult } from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 8000;

export async function completeOpenAi(
  input: GroundedCompleteInput
): Promise<GroundedCompleteResult | null> {
  if (getPanduanLlmProvider() !== "openai") return null;
  const key = providerApiKey("openai");
  if (!key) return null;

  const model = process.env.PANDUAN_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.query },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const body = data.choices?.[0]?.message?.content?.trim();
    return body ? { body } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
