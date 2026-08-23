import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import type { FeatureCollection } from "geojson";
import type { AreaLayerKey, LegendModel } from "@/lib/types";

export const dynamic = "force-dynamic";

const AREA_KEYS: AreaLayerKey[] = [
  "villageDistribution",
  "r3pDistribution",
  "ngoDistribution",
  "regencyFundAllocation",
  "irbi2025",
];

const FILE_BY_KEY: Record<AreaLayerKey, string> = {
  villageDistribution: "villageDistribution.geojson",
  r3pDistribution: "r3pDistribution.geojson",
  ngoDistribution: "ngoDistribution.geojson",
  regencyFundAllocation: "regencyFundAllocation.geojson",
  irbi2025: "irbi2025.geojson",
};

const LEGEND_BY_KEY: Record<AreaLayerKey, LegendModel> = {
  villageDistribution: {
    title: "Distribusi desa (rumah rusak RR+RS+RB)",
    items: [
      { color: "#c7f0d2", label: "Rendah (≤106)" },
      { color: "#6bcf8e", label: "Sedang (≤1184)" },
      { color: "#2e9e4e", label: "Tinggi (>1184)" },
    ],
  },
  r3pDistribution: {
    title: "Distribusi R3P (rumah rusak RR+RS+RB)",
    items: [
      { color: "#c7f0d2", label: "Rendah (≤1362)" },
      { color: "#6bcf8e", label: "Sedang (≤10795)" },
      { color: "#2e9e4e", label: "Tinggi (>10795)" },
    ],
  },
  ngoDistribution: {
    title: "Distribusi NGO",
    items: [
      { color: "#c7f0d2", label: "Rendah" },
      { color: "#6bcf8e", label: "Sedang" },
      { color: "#2e9e4e", label: "Tinggi" },
    ],
  },
  regencyFundAllocation: {
    title: "Alokasi dana kab/kota",
    items: [
      { color: "#fed7aa", label: "Tahap 1" },
      { color: "#fb923c", label: "Tahap 2" },
      { color: "#2e9e4e", label: "Tinggi" },
    ],
  },
  irbi2025: {
    title: "IRBI 2025 — kelas risiko kab/kota",
    items: [
      { color: "#c7f0d2", label: "Rendah" },
      { color: "#6bcf8e", label: "Sedang" },
      { color: "#2e9e4e", label: "Tinggi" },
    ],
  },
};

function isAreaLayerKey(key: string): key is AreaLayerKey {
  return (AREA_KEYS as string[]).includes(key);
}

async function loadLegend(
  areasDir: string,
  key: AreaLayerKey
): Promise<LegendModel> {
  const legendFile = path.join(areasDir, `${key}.legend.json`);
  try {
    const raw = await readFile(legendFile, "utf8");
    return JSON.parse(raw) as LegendModel;
  } catch {
    return LEGEND_BY_KEY[key];
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: { key: string } }
) {
  const { key } = context.params;
  if (!isAreaLayerKey(key)) {
    return NextResponse.json({ error: "Unknown area layer" }, { status: 404 });
  }

  const areasDir = path.join(process.cwd(), "public/fixtures/areas");
  const file = path.join(areasDir, FILE_BY_KEY[key]);
  const raw = await readFile(file, "utf8");
  const fc = JSON.parse(raw) as FeatureCollection;
  const legend = await loadLegend(areasDir, key);

  return NextResponse.json({
    type: "FeatureCollection",
    features: fc.features,
    legend,
  });
}
