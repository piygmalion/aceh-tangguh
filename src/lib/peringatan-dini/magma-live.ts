import {
  MAGMA_HOMES,
  sanitizeMagmaReason,
  unavailableMagmaCard,
  type MagmaCard,
} from "@/lib/peringatan-dini-types";
import {
  cardFromMagmaRaws,
  extractMarkersGempa,
  magmaRawsFromPublicPayload,
  mergeMagmaRaws,
  type MagmaLiveCard,
  type MagmaRaw,
} from "./magma-parse";

const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; MAGMA gempa Aceh)";

class MagmaFetchError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "MagmaFetchError";
    this.code = code;
  }
}

export class MagmaUnavailableError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    const safe = sanitizeMagmaReason(reason) ?? "network";
    super(safe);
    this.name = "MagmaUnavailableError";
    this.reason = safe;
  }
}

function errorName(err: unknown): string {
  if (!err || typeof err !== "object" || !("name" in err)) return "";
  const name = (err as { name: unknown }).name;
  return typeof name === "string" ? name : "";
}

function isTimeout(err: unknown): boolean {
  const name = errorName(err);
  if (name === "TimeoutError" || name === "AbortError") return true;
  if (err && typeof err === "object" && "cause" in err) {
    const cause = (err as { cause?: unknown }).cause;
    if (cause && cause !== err) {
      const causeName = errorName(cause);
      if (causeName === "TimeoutError" || causeName === "AbortError") return true;
    }
  }
  return false;
}

function isNetwork(err: unknown): boolean {
  const name = errorName(err);
  return name === "TypeError" || name === "NetworkError" || name === "FetchError";
}

function upstreamCode(status: number): string {
  if (Number.isInteger(status) && status >= 100 && status <= 599) return `upstream_${status}`;
  return "network";
}

/** Classify by error class or HTTP status. Never returns the message, URL, or body. */
export function magmaFailureCode(err: unknown): string | undefined {
  if (isTimeout(err)) return "timeout";
  if (err instanceof MagmaFetchError) {
    const safe = sanitizeMagmaReason(err.code);
    if (safe && !safe.includes(";")) return safe;
  }
  if (err instanceof SyntaxError) return "json_unreadable";
  if (isNetwork(err)) return "network";
  if (err instanceof Error) {
    const status = /^MAGMA(?: homepage)? (\d{3})$/.exec(err.message);
    if (status) return upstreamCode(Number(status[1]));
    if (err.message === "MAGMA JSON unreadable") return "json_unreadable";
    if (
      err.message === "MAGMA homepage feed not found" ||
      err.message === "MAGMA homepage feed unreadable" ||
      err.message === "MAGMA homepage feed truncated" ||
      err.message === "MAGMA feed is not a list"
    ) {
      return "unreadable";
    }
  }
  return undefined;
}

async function fetchMagmaHtml(
  url: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const res = await fetchImpl(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": UA,
    },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new MagmaFetchError(upstreamCode(res.status));
  return res.text();
}

/**
 * Official JSON the current magma.esdm.go.id client calls.
 * `/_api` is that site's proxy; `vsi.esdm.go.id/data/api/public` is the same
 * public base the bundle names `apiBaseUrl`. Not a third-party feed.
 */
/** Required feed. A 403 here is a failed read, not an empty catalog. */
export const MAGMA_MAPS_URLS = [
  "https://magma.esdm.go.id/_api/home/maps",
  "https://vsi.esdm.go.id/data/api/public/home/maps",
] as const;

/** Optional enrichment. A 403 must not fail a maps read and must not replace one. */
export const MAGMA_LIST_URLS = [
  "https://magma.esdm.go.id/_api/earthquake/list",
  "https://vsi.esdm.go.id/data/api/public/earthquake/list",
] as const;

async function fetchMagmaJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const res = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": UA,
      Referer: "https://magma.esdm.go.id/",
    },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new MagmaFetchError(upstreamCode(res.status));
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MagmaFetchError("json_unreadable");
  }
}

/** List rows add a clock and ROQ id. Failure here is ignored. */
async function readOptionalList(fetchImpl: typeof fetch): Promise<MagmaRaw[]> {
  for (const url of MAGMA_LIST_URLS) {
    try {
      const payload = await fetchMagmaJson(url, fetchImpl);
      const raws = magmaRawsFromPublicPayload(payload);
      if (raws.length > 0) return raws;
    } catch {
      // Enrichment only. A 403 must not discard the maps rows.
    }
  }
  return [];
}

/**
 * Public quake rows. Maps is required. The earthquake list only enriches a
 * successful maps read. Then the legacy HTML variable, if a host still serves it.
 * Throws when maps (and the HTML fallback) are unreadable — never keep an old quake.
 */
const MAPS_SOURCES = ["maps", "vsi"] as const;
const HOME_SOURCES = ["home", "vsi-home"] as const;

function recordAttempt(
  attempts: { source: string; code: string }[],
  source: string,
  err: unknown,
) {
  attempts.push({ source, code: magmaFailureCode(err) ?? "network" });
}

export async function fetchMagmaQuakeRaws(
  fetchImpl: typeof fetch = fetch,
): Promise<MagmaRaw[]> {
  const attempts: { source: string; code: string }[] = [];
  for (let i = 0; i < MAGMA_MAPS_URLS.length; i += 1) {
    const source = MAPS_SOURCES[i] ?? "maps";
    try {
      const payload = await fetchMagmaJson(MAGMA_MAPS_URLS[i], fetchImpl);
      const raws = magmaRawsFromPublicPayload(payload);
      if (raws.length === 0) {
        attempts.push({ source, code: "empty" });
        continue;
      }
      return mergeMagmaRaws([raws, await readOptionalList(fetchImpl)]);
    } catch (err) {
      recordAttempt(attempts, source, err);
    }
  }
  for (let i = 0; i < MAGMA_HOMES.length; i += 1) {
    const source = HOME_SOURCES[i] ?? "home";
    try {
      const html = await fetchMagmaHtml(MAGMA_HOMES[i], fetchImpl);
      return extractMarkersGempa(html);
    } catch (err) {
      recordAttempt(attempts, source, err);
    }
  }
  throw new MagmaUnavailableError(attempts.map((attempt) => `${attempt.source}:${attempt.code}`).join(";"));
}

/** Latest Aceh quake from the public feed. Does not invent a third unofficial API. */
export async function fetchMagmaLive(
  fetchImpl: typeof fetch = fetch,
): Promise<MagmaLiveCard> {
  return cardFromMagmaRaws(await fetchMagmaQuakeRaws(fetchImpl));
}

export async function getMagmaPeringatanFromLive(
  live: () => Promise<MagmaLiveCard>,
): Promise<MagmaCard> {
  try {
    const card = await live();
    const { reason: _drop, ...rest } = card;
    return { ...rest, stale: false, source: "live" };
  } catch (err) {
    const reason = err instanceof MagmaUnavailableError ? err.reason : magmaFailureCode(err);
    console.error(
      "[peringatan-dini/magma]",
      err instanceof Error ? err.name : "error",
      reason ?? "unclassified",
    );
    return unavailableMagmaCard(new Date().toISOString(), reason);
  }
}
