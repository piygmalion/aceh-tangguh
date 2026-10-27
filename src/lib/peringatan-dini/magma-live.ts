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
export const MAGMA_JSON_URLS = [
  "https://magma.esdm.go.id/_api/home/maps",
  "https://magma.esdm.go.id/_api/earthquake/list",
] as const;

export const MAGMA_JSON_DIRECT_URLS = [
  "https://vsi.esdm.go.id/data/api/public/home/maps",
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

async function readJsonGroup(
  urls: readonly string[],
  fetchImpl: typeof fetch,
): Promise<{ raws: MagmaRaw[]; errors: string[] }> {
  const settled = await Promise.all(
    urls.map(async (url) => {
      try {
        return { url, payload: await fetchMagmaJson(url, fetchImpl) };
      } catch (err) {
        return { url, error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );
  const payloads: unknown[] = [];
  const errors: string[] = [];
  for (const item of settled) {
    if ("payload" in item) payloads.push(item.payload);
    else errors.push(`${item.url} (${item.error})`);
  }
  return { raws: mergeMagmaRaws(payloads.map(magmaRawsFromPublicPayload)), errors };
}

/**
 * Public quake rows. JSON first (the homepage no longer embeds `markersGempa`),
 * then the legacy HTML variable if a host still serves it.
 * Throws when nothing readable comes back — callers must not keep an old quake.
 */
export async function fetchMagmaQuakeRaws(
  fetchImpl: typeof fetch = fetch,
): Promise<MagmaRaw[]> {
  const errors: string[] = [];
  for (const group of [MAGMA_JSON_URLS, MAGMA_JSON_DIRECT_URLS]) {
    const read = await readJsonGroup(group, fetchImpl);
    errors.push(...read.errors);
    if (read.raws.length > 0) return read.raws;
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
