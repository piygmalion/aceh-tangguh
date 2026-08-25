import {
  MAGMA_HOMES,
  unavailableMagmaCard,
  type MagmaCard,
} from "@/lib/peringatan-dini-types";
import { parseMagmaHomepage, type MagmaLiveCard } from "./magma-parse";

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
 * Try official MAGMA homepages in order. Same `markersGempa` parser for both.
 * Does not invent a third unofficial API.
 */
export async function fetchMagmaLive(
  fetchImpl: typeof fetch = fetch,
): Promise<MagmaLiveCard> {
  const errors: string[] = [];
  for (const url of MAGMA_HOMES) {
    try {
      const html = await fetchMagmaHtml(url, fetchImpl);
      return parseMagmaHomepage(html);
    } catch (err) {
      errors.push(`${url} (${err instanceof Error ? err.message : String(err)})`);
    }
  }
  throw new Error(`MAGMA unavailable: ${errors.join("; ")}`);
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
