import { mergeLaporanOverlays } from "@/lib/laporan/peta-features";
import { summarizeMarkerLayers } from "@/lib/laporan/markers-summary";
import { mergeOperasiDisasterEvents, mergePengungsianOverlays } from "@/lib/sik/public";
import { loadMarkers } from "@/lib/markers";

/** Same merge chain as GET /api/layers/markers — do not skip operasi or pengungsian. */
export async function loadPublicMarkerCollection() {
  const withLaporan = await mergeLaporanOverlays(await loadMarkers());
  const withOps = await mergeOperasiDisasterEvents(withLaporan);
  return mergePengungsianOverlays(withOps);
}

export { summarizeMarkerLayers };
