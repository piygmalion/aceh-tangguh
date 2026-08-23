import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import type { FeatureCollection } from "geojson";
import type { AreaLayerKey, LegendModel } from "@/lib/types";
import {
  AREA_LAYER_FILES,
  AREA_LAYER_LEGENDS,
  isAreaLayerKey,
} from "@/lib/area-layers";

export const dynamic = "force-dynamic";

async function loadLegend(
  areasDir: string,
  key: AreaLayerKey
): Promise<LegendModel> {
  const legendFile = path.join(areasDir, `${key}.legend.json`);
  try {
    const raw = await readFile(legendFile, "utf8");
    return JSON.parse(raw) as LegendModel;
  } catch {
    return AREA_LAYER_LEGENDS[key];
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
  const file = path.join(areasDir, AREA_LAYER_FILES[key]);
  const raw = await readFile(file, "utf8");
  const fc = JSON.parse(raw) as FeatureCollection;
  const legend = await loadLegend(areasDir, key);

  return NextResponse.json({
    type: "FeatureCollection",
    features: fc.features,
    legend,
  });
}
