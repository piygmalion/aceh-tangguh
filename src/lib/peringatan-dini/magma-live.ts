import {
  MAGMA_HOMES,
  applyMagmaFetchReason,
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

const REASON_CODE = /^(upstream_[1-9]\d{2}|timeout|json_unreadable|empty|network)$/;

/** Messages this process throws. Compared exactly; never copied onto the card. */
const UNREADABLE_FEED = new Set([
  "MAGMA homepage feed not found",
  "MAGMA homepage feed unreadable",
  "MAGMA feed is not a list",
  "MAGMA homepage feed truncated",
  "MAGMA JSON unreadable",
]);

class MagmaSourceError extends Error {
  readonly code: string;

  constructor(code: string) {
    const safe = REASON_CODE.test(code) ? code : "network";
    super(safe);
    this.name = "MagmaSourceError";
    this.code = safe;
  }
}

class MagmaUnavailableError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = "MagmaUnavailableError";
    this.reason = reason;
  }
}

function isTimeout(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err && typeof err.name === "string" ? err.name : "";
  if (name === "AbortError" || name === "TimeoutError") return true;
  const cause = "cause" in err ? err.cause : undefined;
  if (!cause || typeof cause !== "object" || !("name" in cause)) return false;
  return cause.name === "AbortError" || cause.name === "TimeoutError";
}

function codeFromThrown(err: unknown): string {
  if (err instanceof MagmaSourceError) return err.code;
  if (isTimeout(err)) return "timeout";
  if (err instanceof SyntaxError) return "json_unreadable";
  if (err instanceof Error && UNREADABLE_FEED.has(err.message)) return "json_unreadable";
  return "network";
}

function upstreamCode(status: number): string {
  if (Number.isInteger(status) && status >= 100 && status <= 599) return `upstream_${status}`;
  return "network";
}

async function fetchMagmaHtml(
  url: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": UA,
      },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new MagmaSourceError(codeFromThrown(err));
  }
  if (!res.ok) throw new MagmaSourceError(upstreamCode(res.status));
  try {
    return await res.text();
  } catch (err) {
    throw new MagmaSourceError(codeFromThrown(err));
  }
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
  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
        Referer: "https://magma.esdm.go.id/",
      },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new MagmaSourceError(codeFromThrown(err));
  }
  if (!res.ok) throw new MagmaSourceError(upstreamCode(res.status));
  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    throw new MagmaSourceError(codeFromThrown(err));
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MagmaSourceError("json_unreadable");
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
function reasonPart(label: "maps" | "vsi" | "home" | "vsi-home", code: string): string | null {
  if (!REASON_CODE.test(code)) return null;
  return `${label}:${code}`;
}

export async function fetchMagmaQuakeRaws(
  fetchImpl: typeof fetch = fetch,
): Promise<MagmaRaw[]> {
  const parts: string[] = [];
  const note = (label: "maps" | "vsi" | "home" | "vsi-home", err: unknown) => {
    const piece = reasonPart(label, codeFromThrown(err));
    if (piece) parts.push(piece);
  };
  const sources = [
    ["maps", MAGMA_MAPS_URLS[0]],
    ["vsi", MAGMA_MAPS_URLS[1]],
  ] as const;
  for (const [label, url] of sources) {
    try {
      const payload = await fetchMagmaJson(url, fetchImpl);
      const raws = magmaRawsFromPublicPayload(payload);
      if (raws.length === 0) {
        const piece = reasonPart(label, "empty");
        if (piece) parts.push(piece);
        continue;
      }
      return mergeMagmaRaws([raws, await readOptionalList(fetchImpl)]);
    } catch (err) {
      note(label, err);
    }
  }
  const pages = [
    ["home", MAGMA_HOMES[0]],
    ["vsi-home", MAGMA_HOMES[1]],
  ] as const;
  for (const [label, url] of pages) {
    try {
      const html = await fetchMagmaHtml(url, fetchImpl);
      return extractMarkersGempa(html);
    } catch (err) {
      note(label, err);
    }
  }
  throw new MagmaUnavailableError(parts.join(";"));
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
    return applyMagmaFetchReason({ ...card, stale: false, source: "live" });
  } catch (err) {
    const reason = err instanceof MagmaUnavailableError ? err.reason : undefined;
    console.error(
      "[peringatan-dini/magma]",
      reason ?? (err instanceof Error ? err.name : "unavailable"),
    );
    return unavailableMagmaCard(new Date().toISOString(), reason);
  }
}
