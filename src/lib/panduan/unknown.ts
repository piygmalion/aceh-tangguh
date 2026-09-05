import type { GuideLocale, GuideMatchReason } from "./types";

const REASONS = new Set<GuideMatchReason>(["emergency", "out_of_scope", "low_confidence"]);

export function sanitizeUnknownQuery(raw: string): string {
  return raw
    .replace(/\S+@\S+/g, "[email]")
    .replace(/\b(?:\+62|0)\d{8,15}\b/g, "[tel]")
    .replace(/\b\d{8,}\b/g, "[angka]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export function sanitizeUnknownPath(raw: string): string {
  const path = raw.split("?")[0]?.trim() || "/";
  if (!path.startsWith("/")) return "/";
  return path.slice(0, 80);
}

export function asUnknownReason(raw: string | undefined): GuideMatchReason {
  if (raw && REASONS.has(raw as GuideMatchReason)) return raw as GuideMatchReason;
  return "low_confidence";
}

export function asUnknownLocale(raw: string | undefined): GuideLocale {
  return raw === "en" ? "en" : "id";
}

export async function logUnknownIntent(input: {
  query: string;
  locale: GuideLocale;
  reason?: GuideMatchReason;
  pathname?: string;
}): Promise<void> {
  try {
    await fetch("/api/panduan/unknown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input.query,
        locale: input.locale,
        reason: input.reason,
        pathname: input.pathname,
      }),
    });
  } catch {
    // Fail closed on static preview and network errors.
  }
}
