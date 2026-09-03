import { isInsideAcehBbox, mentionsAceh } from "@/lib/peringatan-dini/aceh";

/**
 * Keep a station only when it is in Aceh.
 * GPS outside the Aceh bbox is always dropped — even if the project name
 * mentions Aceh, or a lookalike toponym (e.g. Desa Tamiang in Kalimantan).
 * Stations without coordinates are kept only when project/pos text is Aceh.
 */
export function isAcehTatonasStation(opts: {
  project?: string | null;
  posName?: string | null;
  lat?: number | null;
  lng?: number | null;
}): boolean {
  const { project, posName, lat, lng } = opts;
  const hasCoords =
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng);

  if (hasCoords) return isInsideAcehBbox(lng, lat);
  return mentionsAceh(project) || mentionsAceh(posName);
}
