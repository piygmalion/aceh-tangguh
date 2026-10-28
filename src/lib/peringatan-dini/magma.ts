import { unstable_cache } from "next/cache";
import { ACEH_BBOX } from "@/lib/basemap";
import { readOverlayLiveForPd } from "@/lib/overlay-live";
import { applyMagmaFetchReason, unavailableMagmaCard, type MagmaCard } from "@/lib/peringatan-dini-types";
import { magmaCardFromOverlayRead } from "./overlay-cards";

const getCachedMagmaOverlay = unstable_cache(
  async () => readOverlayLiveForPd("magmaQuakes"),
  // "ledger" drops a cached select from before the refresh row was part of the payload.
  ["peringatan-magma-aceh", "ledger"],
  { revalidate: 600, tags: ["peringatan-magma"] },
);

export async function getMagmaPeringatan(): Promise<MagmaCard> {
  try {
    const select = await getCachedMagmaOverlay();
    if (select.kind === "select-impossible") return unavailableMagmaCard();
    const requestAt = new Date().toISOString();
    return applyMagmaFetchReason(
      magmaCardFromOverlayRead(select.result, requestAt, {
        rowFetchedAt: select.rowsFetchedAt,
        ledgerFetchedAt: select.refreshedAt,
        ledger: select.ledger,
      }),
      select.refreshError,
    );
  } catch (err) {
    console.error("[peringatan-dini/magma]", err);
    return unavailableMagmaCard();
  }
}

export const MAGMA_BBOX = ACEH_BBOX;
