import type { AreaLayerKey, MarkerLayerKey, OverlayLayerKey } from "@/lib/types";
import { withBasePath } from "@/lib/preview/env";

export const FLAT_ICON_BASE = "/icons/flat";

/** Flat icon assets for all marker layers on map + panel. */
export const LAYER_ICON_FILES: Record<MarkerLayerKey, string> = {
  disasterEvents: "icon-kejadian-bencana.png",
  missingPersons: "icon-orang-hilang.png",
  tendPoints: "icon-titik-pengungsian.png",
  policeOffices: "icon-kantor-polisi.png",
  poskos: "icon-posko.png",
  facHealth: "icon-fasilitas-kesehatan.png",
  facEducation: "icon-fasilitas-pendidikan.png",
  facGov: "icon-fasilitas-pemerintahan.png",
  facReligious: "icon-fasilitas-keagamaan.png",
  infraRoadBridge: "icon-jalan-jembatan.png",
  laporanKejadian: "icon-laporan-warga.png",
  laporanPenanganan: "icon-posko.png",
};

export const AREA_LAYER_ICON_FILES: Record<AreaLayerKey, string> = {
  villageDistribution: "icon-distribusi-desa.png",
  r3pDistribution: "icon-distribusi-r3p.png",
  irbi2025: "icon-irbi-2025.png",
  ngoDistribution: "icon-distribusi-ngo.png",
  regencyFundAllocation: "icon-alokasi-dana.png",
};

export const DISASTER_JENIS_ICON_FILES: Record<string, string> = {
  Kebakaran: "icon-kebakaran.png",
  Banjir: "icon-banjir.png",
  "Kebakaran Hutan dan Lahan": "icon-kebakaran-hutan-lahan.png",
  "Angin Puting Beliung": "icon-angin-puting-belung.png",
  Longsor: "icon-longsor.png",
  "Banjir Bandang": "icon-banjir-bandang.png",
  "Gempa Bumi": "icon-gempa-bumi.png",
  "Banjir Bandang dan Tanah Longsor": "icon-banjir-bandang-longsor.png",
  Abrasi: "icon-abrasi.png",
  Lainnya: "icon-lainnya.png",
  "Kebakaran Pemukiman": "icon-kebakaran-pemukiman.png",
  "Tanah Longsor": "icon-tanah-longsor.png",
  Kekeringan: "icon-kekeringan.png",
};

export function flatIconPath(file: string): string {
  return withBasePath(`${FLAT_ICON_BASE}/${file}`);
}

export function getLayerIconPath(key: MarkerLayerKey): string {
  return flatIconPath(LAYER_ICON_FILES[key]);
}

export function getAreaLayerIconPath(key: AreaLayerKey): string {
  return flatIconPath(AREA_LAYER_ICON_FILES[key]);
}

/** Reuse existing flat glyphs — no new overlay art. */
export const OVERLAY_LAYER_ICON_FILES: Record<OverlayLayerKey, string> = {
  maritimePorts: "icon-abrasi.png",
  maritimeWaters: "icon-banjir.png",
  bmkgQuakes: "icon-gempa-bumi.png",
  magmaQuakes: "icon-gempa-bumi.png",
  magmaVolcanoes: "icon-lainnya.png",
  sipongiHotspots: "icon-kebakaran-hutan-lahan.png",
  tatonasStations: "icon-banjir.png",
  seismicSensors: "icon-gempa-bumi.png",
  inariskSumateraFault: "icon-gempa-bumi.png",
  inariskMegathrust: "icon-gempa-bumi.png",
  inariskBahayaGempa: "icon-gempa-bumi.png",
  inariskBahayaTsunami: "icon-abrasi.png",
  inariskBahayaLongsor: "icon-longsor.png",
  inariskBahayaBanjir: "icon-banjir.png",
  inariskBahayaKarhutla: "icon-kebakaran-hutan-lahan.png",
  inariskBahayaGunungApi: "icon-lainnya.png",
};

export function getOverlayLayerIconPath(key: OverlayLayerKey): string {
  return flatIconPath(OVERLAY_LAYER_ICON_FILES[key]);
}

export function getDisasterJenisIconPath(jenis: string): string | null {
  const file = DISASTER_JENIS_ICON_FILES[jenis];
  return file ? flatIconPath(file) : null;
}

export function hasFlatLayerIcon(key: MarkerLayerKey): boolean {
  return key in LAYER_ICON_FILES;
}

export function getMarkerIconPath(
  layer: MarkerLayerKey,
  jenisBencana?: string | null,
): string {
  if (layer === "disasterEvents") {
    if (jenisBencana) {
      const jenisIcon = getDisasterJenisIconPath(jenisBencana);
      if (jenisIcon) return jenisIcon;
    }
    return getLayerIconPath("disasterEvents");
  }
  return getLayerIconPath(layer);
}

export function slugIconId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function markerIconImageId(
  layer: MarkerLayerKey,
  jenisBencana?: string | null
): string {
  if (layer === "disasterEvents" && jenisBencana) {
    const file = DISASTER_JENIS_ICON_FILES[jenisBencana];
    if (file) return `jenis:${slugIconId(jenisBencana)}`;
  }
  return `layer:${layer}`;
}

export type MapSymbolIcon = { id: string; url: string };

/** Existing flat glyphs only — no new art. Used as map-pin faces after disc composite. */
export function listMapSymbolIcons(): MapSymbolIcon[] {
  const seen = new Set<string>();
  const out: MapSymbolIcon[] = [];
  for (const key of Object.keys(LAYER_ICON_FILES) as MarkerLayerKey[]) {
    const id = `layer:${key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, url: getLayerIconPath(key) });
  }
  for (const jenis of Object.keys(DISASTER_JENIS_ICON_FILES)) {
    const id = `jenis:${slugIconId(jenis)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const url = getDisasterJenisIconPath(jenis);
    if (url) out.push({ id, url });
  }
  return out;
}
