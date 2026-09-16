import { readFile } from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";
import { readOverlayLiveForPd } from "@/lib/overlay-live";
import { SIPONGI_PETA, type SipongiCard } from "@/lib/peringatan-dini-types";
import { sipongiCardFromOverlayRead } from "./overlay-cards";

const getCachedSipongiOverlay = unstable_cache(
  async () => readOverlayLiveForPd("sipongiHotspots"),
  ["peringatan-sipongi-aceh"],
  { revalidate: 600, tags: ["peringatan-sipongi"] },
);

function isSipongiCard(value: unknown): value is SipongiCard {
  if (!value || typeof value !== "object") return false;
  const rec = value as SipongiCard;
  return rec.kind === "sipongi" && Array.isArray(rec.points);
}

async function loadSipongiFixture(): Promise<SipongiCard> {
  const file = path.join(process.cwd(), "public/fixtures/peringatan-sipongi.json");
  const raw = await readFile(file, "utf8");
  const data: unknown = JSON.parse(raw);
  if (!isSipongiCard(data)) {
    return {
      kind: "sipongi",
      tone: "neutral",
      empty: true,
      points: [],
      fetched_at: new Date().toISOString(),
      href: SIPONGI_PETA,
      stale: true,
      source: "fixture",
      example: true,
    };
  }
  return { ...data, stale: true, source: "fixture", example: true };
}

export async function getSipongiPeringatan(): Promise<SipongiCard> {
  try {
    const select = await getCachedSipongiOverlay();
    if (select.kind === "select-impossible") return loadSipongiFixture();
    return sipongiCardFromOverlayRead(select.result);
  } catch (err) {
    console.error("[peringatan-dini/sipongi]", err);
    return loadSipongiFixture();
  }
}
