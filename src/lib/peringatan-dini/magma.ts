import { unstable_cache } from "next/cache";
import { ACEH_BBOX } from "@/lib/basemap";
import { readOverlayLiveForPd } from "@/lib/overlay-live";
import {
  applyMagmaRefreshReason,
  unavailableMagmaCard,
  type MagmaCard,
} from "@/lib/peringatan-dini-types";
import { magmaCardFromOverlayRead } from "./overlay-cards";

const getCachedMagmaOverlay = unstable_cache(
  async () => readOverlayLiveForPd("magmaQuakes"),
  ["peringatan-magma-aceh"],
  { revalidate: 600, tags: ["peringatan-magma"] },
);

export async function getMagmaPeringatan(): Promise<MagmaCard> {
  try {
    const select = await getCachedMagmaOverlay();
    if (select.kind === "select-impossible") return unavailableMagmaCard();
    return applyMagmaRefreshReason(
      magmaCardFromOverlayRead(select.result),
      select.refreshError,
    );
  } catch (err) {
    console.error("[peringatan-dini/magma]", err);
    return unavailableMagmaCard();
  }
}

export const MAGMA_BBOX = ACEH_BBOX;
