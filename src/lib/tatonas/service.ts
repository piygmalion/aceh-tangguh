import { unstable_cache } from "next/cache";
import type { Feature, FeatureCollection, Point } from "geojson";
import { readOverlayLiveForPd } from "@/lib/overlay-live";
import { emptyTatonasCard } from "./parse";
import type { TatonasCard } from "./types";
import { tatonasCardFromOverlayRead } from "@/lib/peringatan-dini/overlay-cards";

const getCachedTatonasOverlay = unstable_cache(
  async () => readOverlayLiveForPd("tatonasStations"),
  ["peringatan-tatonas-aceh"],
  { revalidate: 600, tags: ["peringatan-tatonas"] },
);

export async function getTatonasPeringatan(): Promise<TatonasCard> {
  try {
    const select = await getCachedTatonasOverlay();
    if (select.kind === "select-impossible") {
      return emptyTatonasCard({ source: "unavailable" });
    }
    return tatonasCardFromOverlayRead(select.result);
  } catch (err) {
    console.error("[peringatan-dini/tatonas]", err);
    return emptyTatonasCard({ source: "unavailable" });
  }
}

export async function loadTatonasMarkerFeatures(): Promise<Feature<Point>[]> {
  try {
    const select = await readOverlayLiveForPd("tatonasStations");
    if (select.kind === "select-impossible") return [];
    return select.result.body.features.filter(
      (feature): feature is Feature<Point> => feature.geometry?.type === "Point",
    );
  } catch (err) {
    console.error("[tatonas/markers]", err);
    return [];
  }
}

export async function mergeTatonasOverlays<T extends FeatureCollection>(
  fc: T,
): Promise<T> {
  const extras = await loadTatonasMarkerFeatures();
  if (extras.length === 0) return fc;
  const without = fc.features.filter(
    (f) => String(f.properties?.layer ?? "") !== "tatonasStations",
  );
  const existingIds = new Set(without.map((f) => String(f.id ?? "")));
  const merged = extras.filter((f) => !existingIds.has(String(f.id)));
  return { ...fc, features: [...without, ...merged] };
}
