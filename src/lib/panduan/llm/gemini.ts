import { getPanduanLlmProvider, providerApiKey } from "../llm-gate";
import type { GroundedCompleteInput, GroundedCompleteResult } from "./types";

const DEFAULT_MODEL = "gemini-2.0-flash";
const TIMEOUT_MS = 8000;

export async function completeGemini(
  input: GroundedCompleteInput
): Promise<GroundedCompleteResult | null> {
  if (getPanduanLlmProvider() !== "gemini") return null;
  const key = providerApiKey("gemini");
  if (!key) return null;

  const model = process.env.PANDUAN_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: [{ role: "user", parts: [{ text: input.query }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
        }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const body = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    return body ? { body } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
