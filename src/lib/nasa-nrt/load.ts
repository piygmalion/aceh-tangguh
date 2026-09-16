import { unstable_cache } from "next/cache";
import { fetchFirmsCsv } from "./firms";
import { emptyFirmsResponse, firmsHttpStatus, type FirmsResponse } from "./types";

async function loadCachedFirms(mapKey: string): Promise<FirmsResponse> {
  return unstable_cache(
    async () => fetchFirmsCsv(mapKey),
    ["nasa-nrt-firms-viirs-snpp"],
    { revalidate: 600 },
  )();
}

export async function getFirmsHotspots(): Promise<{
  body: FirmsResponse;
  status: number;
}> {
  const mapKey = process.env.FIRMS_MAP_KEY?.trim();
  if (!mapKey) {
    const body = emptyFirmsResponse("unconfigured");
    return { body, status: firmsHttpStatus(body) };
  }
  try {
    const body = await loadCachedFirms(mapKey);
    return { body, status: firmsHttpStatus(body) };
  } catch {
    const body = emptyFirmsResponse("upstream", new Date().toISOString());
    return { body, status: firmsHttpStatus(body) };
  }
}
