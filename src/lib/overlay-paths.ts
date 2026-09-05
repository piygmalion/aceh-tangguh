import { OVERLAY_STATIC_FIXTURES } from "@/lib/overlay-layers";
import type { OverlayLayerKey } from "@/lib/types";

/** Same five keys as overlay-live OVERLAY_LIVE_REFRESH_KEYS — keep this module client-safe. */
const LIVE_VECTOR_KEYS = new Set<OverlayLayerKey>([
  "bmkgQuakes",
  "magmaQuakes",
  "magmaVolcanoes",
  "sipongiHotspots",
  "tatonasStations",
]);

/** AN-19: vector overlay GET path. Raster InaRISK stays on /api/overlay/tiles. */
export function overlayVectorApiPath(key: OverlayLayerKey): string {
  if (LIVE_VECTOR_KEYS.has(key)) return `/api/overlay/${key}`;
  if (key === "maritimeWaters") return "/api/overlay/maritime/perairan";
  if (OVERLAY_STATIC_FIXTURES[key]) return `/api/overlay/static/${key}`;
  throw new Error(`overlayVectorApiPath: ${key} is not a vector overlay`);
}
