import { isGuideHref } from "./faq";
import type { GuideAnswer, GuideLocale, GuideSlots } from "./types";

const CLIENT_TIMEOUT_MS = 15000;

let enabledCache: boolean | null = null;
let enabledPromise: Promise<boolean> | null = null;

export function resetGroundedAskEnabledCache() {
  enabledCache = null;
  enabledPromise = null;
}

export async function isGroundedAskEnabled(): Promise<boolean> {
  if (enabledCache !== null) return enabledCache;
  if (!enabledPromise) {
    enabledPromise = fetch("/api/panduan/ask", { method: "GET" })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = (await res.json()) as { enabled?: unknown };
        return data.enabled === true;
      })
      .catch(() => false)
      .then((value) => {
        enabledCache = value;
        return value;
      });
  }
  return enabledPromise;
}

function asAnswer(raw: unknown): GuideAnswer | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as GuideAnswer;
  if (typeof row.body !== "string" || row.body.trim().length < 12) return null;
  if (typeof row.intent !== "string") return null;
  const links = Array.isArray(row.links)
    ? row.links.filter((item) => item && isGuideHref(item.href))
    : [];
  return {
    intent: row.intent,
    body: row.body.trim(),
    links,
    source: typeof row.source === "string" ? row.source : undefined,
  };
}

export async function askGroundedLlm(input: {
  query: string;
  locale: GuideLocale;
  pathname: string;
  slots?: GuideSlots;
}): Promise<GuideAnswer | null> {
  const enabled = await isGroundedAskEnabled();
  if (!enabled) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch("/api/panduan/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        query: input.query,
        locale: input.locale,
        pathname: input.pathname,
        slots: input.slots,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; answer?: unknown };
    if (!data.ok) return null;
    return asAnswer(data.answer);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
