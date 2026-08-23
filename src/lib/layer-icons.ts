import type { AreaLayerKey, MarkerLayerKey } from "@/lib/types";

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
  helipad: "icon-helipad.png",
  starlink: "icon-starlink.png",
  citizenReports: "icon-laporan-warga.png",
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
  return `${FLAT_ICON_BASE}/${file}`;
}

export function getLayerIconPath(key: MarkerLayerKey): string {
  return flatIconPath(LAYER_ICON_FILES[key]);
}

export function getAreaLayerIconPath(key: AreaLayerKey): string {
  return flatIconPath(AREA_LAYER_ICON_FILES[key]);
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
