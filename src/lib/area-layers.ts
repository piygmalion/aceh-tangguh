import type { AreaLayerKey, LegendModel } from "@/lib/types";
import { CHOROPLETH_DAMAGED_HOME, FOREST_SCALE, STATUS_HEX } from "@/lib/chart-colors";

export const AREA_LAYER_KEYS: AreaLayerKey[] = [
  "villageDistribution",
  "r3pDistribution",
  "ngoDistribution",
  "regencyFundAllocation",
  "irbi2025",
];

/** Stub rectangles only — toolbar may list them, MapViewport must not paint them. */
export const STUB_AREA_LAYER_KEYS = [
  "ngoDistribution",
  "regencyFundAllocation",
] as const satisfies readonly AreaLayerKey[];

/** Soft-retired in the DB catalog. Toolbar may still list them for Tanggapi chrome. */
export const RETIRED_AREA_LAYER_KEYS = [
  "ngoDistribution",
  "regencyFundAllocation",
] as const satisfies readonly AreaLayerKey[];

/** Visible AREA radios. Hardcoded — not derived from map_layers.enabled. */
export const AREA_TOOLBAR_LAYER_KEYS = [
  "villageDistribution",
  "r3pDistribution",
  "ngoDistribution",
  "regencyFundAllocation",
  "irbi2025",
] as const satisfies readonly AreaLayerKey[];

export function isStubAreaLayer(key: string | null | undefined): boolean {
  return !!key && (STUB_AREA_LAYER_KEYS as readonly string[]).includes(key);
}

export const AREA_LAYER_FILES: Record<AreaLayerKey, string> = {
  villageDistribution: "villageDistribution.geojson",
  r3pDistribution: "r3pDistribution.geojson",
  ngoDistribution: "ngoDistribution.geojson",
  regencyFundAllocation: "regencyFundAllocation.geojson",
  irbi2025: "irbi2025.geojson",
};

export const AREA_LAYER_LEGENDS: Record<AreaLayerKey, LegendModel> = {
  villageDistribution: {
    title: "Distribusi desa (rumah rusak RR+RS+RB)",
    items: [
      { color: CHOROPLETH_DAMAGED_HOME.sangat_rendah, label: "Sangat rendah (≤20)" },
      { color: CHOROPLETH_DAMAGED_HOME.rendah, label: "Rendah (≤191)" },
      { color: CHOROPLETH_DAMAGED_HOME.sedang, label: "Sedang (≤731)" },
      { color: CHOROPLETH_DAMAGED_HOME.tinggi, label: "Tinggi (≤2849)" },
      { color: CHOROPLETH_DAMAGED_HOME.sangat_tinggi, label: "Sangat tinggi (>2849)" },
      { color: CHOROPLETH_DAMAGED_HOME.belum_diketahui, label: "Belum diketahui" },
    ],
  },
  r3pDistribution: {
    title: "Distribusi R3P (rumah rusak RR+RS+RB)",
    items: [
      { color: CHOROPLETH_DAMAGED_HOME.sangat_rendah, label: "Sangat rendah (≤20)" },
      { color: CHOROPLETH_DAMAGED_HOME.rendah, label: "Rendah (≤191)" },
      { color: CHOROPLETH_DAMAGED_HOME.sedang, label: "Sedang (≤731)" },
      { color: CHOROPLETH_DAMAGED_HOME.tinggi, label: "Tinggi (≤2849)" },
      { color: CHOROPLETH_DAMAGED_HOME.sangat_tinggi, label: "Sangat tinggi (>2849)" },
      { color: CHOROPLETH_DAMAGED_HOME.belum_diketahui, label: "Belum diketahui" },
    ],
  },
  ngoDistribution: {
    title: "Distribusi NGO",
    items: [
      { color: FOREST_SCALE[200], label: "Rendah" },
      { color: FOREST_SCALE[400], label: "Sedang" },
      { color: FOREST_SCALE[700], label: "Tinggi" },
    ],
  },
  regencyFundAllocation: {
    title: "Alokasi dana kab/kota",
    items: [
      { color: "#E6D3A0", label: "Tahap 1" },
      { color: "#FF8F42", label: "Tahap 2" },
      { color: FOREST_SCALE[700], label: "Tinggi" },
    ],
  },
  irbi2025: {
    title: "IRBI 2025 — kelas risiko kab/kota",
    items: [
      { color: STATUS_HEX.RENDAH, label: "Rendah" },
      { color: STATUS_HEX.SEDANG, label: "Sedang" },
      { color: STATUS_HEX.TINGGI, label: "Tinggi" },
    ],
  },
};

export function isAreaLayerKey(key: string): key is AreaLayerKey {
  return (AREA_LAYER_KEYS as string[]).includes(key);
}

/** Accept live and retired keys so old ?area= URLs still resolve. */
export function parseAreaLayerKey(raw: string | null | undefined): AreaLayerKey | null {
  if (!raw) return null;
  return isAreaLayerKey(raw) ? raw : null;
}
