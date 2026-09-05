/**
 * Live probe for Tanggapi ↔ xAI Grok. Never prints secrets.
 * Usage: node --env-file=.env.local scripts/probe-tanggapi-grok.mjs
 */
const TIMEOUT_MS = 12000;
const MODELS_TO_TRY = [
  process.env.PANDUAN_LLM_MODEL?.trim(),
  "grok-4-fast",
  "grok-4.20-0309-non-reasoning",
  "grok-4.3",
  "grok-3-mini",
].filter((value, index, list) => value && list.indexOf(value) === index);

function redact(text) {
  return String(text ?? "")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[key]")
    .replace(/xai-[A-Za-z0-9_-]{8,}/g, "[key]")
    .slice(0, 400);
}

async function timedFetch(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const raw = await res.text();
    return { ok: res.ok, status: res.status, ms: Date.now() - started, raw };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - started,
      raw: "",
      aborted: err instanceof Error && err.name === "AbortError",
      error: err instanceof Error ? err.name : "error",
    };
  } finally {
    clearTimeout(timer);
  }
}

const key = process.env.XAI_API_KEY?.trim() ?? "";
const report = {
  gateFlag: process.env.PANDUAN_LLM_ENABLED === "1",
  provider: process.env.PANDUAN_LLM_PROVIDER || "(unset→grok)",
  keyPresent: Boolean(key),
  keyLen: key.length,
  modelEnv: Boolean(process.env.PANDUAN_LLM_MODEL?.trim()),
  models: [],
  chats: [],
};

if (!key) {
  console.log(JSON.stringify({ ...report, note: "no XAI_API_KEY — cannot call xAI" }, null, 2));
  process.exit(0);
}

const headers = {
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const listed = await timedFetch("https://api.x.ai/v1/models", { headers });
report.modelsList = { status: listed.status, ms: listed.ms, aborted: listed.aborted ?? false };
if (listed.ok) {
  try {
    const data = JSON.parse(listed.raw);
    const ids = (data.data ?? data.models ?? [])
      .map((row) => row.id || row)
      .filter((id) => typeof id === "string");
    report.models = ids.filter((id) => /grok/i.test(id)).slice(0, 40);
  } catch {
    report.modelsParse = "failed";
  }
} else {
  report.modelsError = redact(listed.raw || listed.error);
}

const ping = "Reply with exactly: ok. Do not add numbers.";
for (const model of MODELS_TO_TRY) {
  const chat = await timedFetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 16,
      messages: [{ role: "user", content: ping }],
    }),
  });
  let body = "";
  try {
    body = JSON.parse(chat.raw)?.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    body = "";
  }
  report.chats.push({
    model,
    status: chat.status,
    ms: chat.ms,
    aborted: chat.aborted ?? false,
    bodyOk: /^ok\.?$/i.test(body),
    error: chat.ok ? undefined : redact(chat.raw || chat.error),
  });
}

console.log(JSON.stringify(report, null, 2));
