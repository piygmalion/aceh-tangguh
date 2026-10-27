import {
  MAGMA_HOMES,
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
  if (!res.ok) throw new Error(`MAGMA homepage ${res.status}`);
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
  if (!res.ok) throw new Error(`MAGMA ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("MAGMA JSON unreadable");
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
export async function fetchMagmaQuakeRaws(
  fetchImpl: typeof fetch = fetch,
): Promise<MagmaRaw[]> {
  const errors: string[] = [];
  for (const url of MAGMA_MAPS_URLS) {
    try {
      const payload = await fetchMagmaJson(url, fetchImpl);
      const raws = magmaRawsFromPublicPayload(payload);
      if (raws.length === 0) {
        errors.push(`${url} (empty)`);
        continue;
      }
      return mergeMagmaRaws([raws, await readOptionalList(fetchImpl)]);
    } catch (err) {
      errors.push(`${url} (${err instanceof Error ? err.message : String(err)})`);
    }
  }
  for (const url of MAGMA_HOMES) {
    try {
      const html = await fetchMagmaHtml(url, fetchImpl);
      return extractMarkersGempa(html);
    } catch (err) {
      errors.push(`${url} (${err instanceof Error ? err.message : String(err)})`);
    }
  }
  throw new Error(`MAGMA unavailable: ${errors.join("; ")}`);
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
    return { ...card, stale: false, source: "live" };
  } catch (err) {
    console.error("[peringatan-dini/magma]", err);
    return unavailableMagmaCard();
  }
}
