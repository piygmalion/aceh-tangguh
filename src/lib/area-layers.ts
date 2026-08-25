import type { AreaLayerKey, LegendModel } from "@/lib/types";

export const AREA_LAYER_KEYS: AreaLayerKey[] = [
  "villageDistribution",
  "r3pDistribution",
  "ngoDistribution",
  "regencyFundAllocation",
  "irbi2025",
];

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
      { color: "#c7f0d2", label: "Rendah (≤106)" },
      { color: "#6bcf8e", label: "Sedang (≤1184)" },
      { color: "#1F4C15", label: "Tinggi (>1184)" },
    ],
  },
  r3pDistribution: {
    title: "Distribusi R3P (rumah rusak RR+RS+RB)",
    items: [
      { color: "#c7f0d2", label: "Rendah (≤1362)" },
      { color: "#6bcf8e", label: "Sedang (≤10795)" },
      { color: "#1F4C15", label: "Tinggi (>10795)" },
    ],
  },
  ngoDistribution: {
    title: "Distribusi NGO",
    items: [
      { color: "#c7f0d2", label: "Rendah" },
      { color: "#6bcf8e", label: "Sedang" },
      { color: "#1F4C15", label: "Tinggi" },
    ],
  },
  regencyFundAllocation: {
    title: "Alokasi dana kab/kota",
    items: [
      { color: "#fed7aa", label: "Tahap 1" },
      { color: "#fb923c", label: "Tahap 2" },
      { color: "#1F4C15", label: "Tinggi" },
    ],
  },
  irbi2025: {
    title: "IRBI 2025 — kelas risiko kab/kota",
    items: [
      { color: "#c7f0d2", label: "Rendah" },
      { color: "#6bcf8e", label: "Sedang" },
      { color: "#1F4C15", label: "Tinggi" },
    ],
  },
};

export function isAreaLayerKey(key: string): key is AreaLayerKey {
  return (AREA_LAYER_KEYS as string[]).includes(key);
}
