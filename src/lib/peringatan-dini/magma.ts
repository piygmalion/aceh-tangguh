import { unstable_cache } from "next/cache";
import { ACEH_BBOX } from "@/lib/basemap";
import type { MagmaCard } from "@/lib/peringatan-dini-types";
import { fetchMagmaLive, getMagmaPeringatanFromLive } from "./magma-live";

export {
  extractMarkersGempa,
  formatCoordDepth,
  formatWib,
  parseMagmaHomepage,
} from "./magma-parse";
export { fetchMagmaLive, getMagmaPeringatanFromLive } from "./magma-live";

const getCachedMagmaLive = unstable_cache(
  fetchMagmaLive,
  ["peringatan-magma-aceh"],
  { revalidate: 600, tags: ["peringatan-magma"] },
);

export async function getMagmaPeringatan(): Promise<MagmaCard> {
  return getMagmaPeringatanFromLive(getCachedMagmaLive);
}

export const MAGMA_BBOX = ACEH_BBOX;
