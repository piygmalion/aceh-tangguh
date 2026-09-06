import { isBasemapId } from "@/lib/basemap";
import type { BasemapId } from "@/lib/types";

/** Map page default when `?basemap=` is omitted — Carto stays selectable. */
export const DEFAULT_MAP_BASEMAP: BasemapId = "satellite";

export function resolveMapBasemap(raw: string | null | undefined): BasemapId {
  if (!raw) return DEFAULT_MAP_BASEMAP;
  return isBasemapId(raw) ? raw : DEFAULT_MAP_BASEMAP;
}
