#!/usr/bin/env node
/**
 * Read osmium GeoJSON-seq on stdin, split into OpenMapTiles-style layer files.
 *
 * Usage:
 *   osmium export filtered.osm.pbf -f geojsonseq | node scripts/lib/osm-to-openmaptiles-build.mjs <outDir>
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import readline from "node:readline";
import { classifyOsmFeature, toTippecanoeFeature } from "./osm-to-openmaptiles.mjs";
import {
  ACEH_OSM_OPTIONAL_LAYERS,
  ACEH_OSM_REQUIRED_LAYERS,
} from "./aceh-osm-layers.mjs";

const outDir = process.argv[2];
if (!outDir) {
  console.error("Usage: node scripts/lib/osm-to-openmaptiles-build.mjs <outDir>");
  process.exit(2);
}

await mkdir(outDir, { recursive: true });

/** @type {Record<string, import("geojson").Feature[]>} */
const buckets = Object.fromEntries(
  [...ACEH_OSM_REQUIRED_LAYERS, ...ACEH_OSM_OPTIONAL_LAYERS].map((id) => [id, []]),
);

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let read = 0;
let kept = 0;
for await (const line of rl) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  read += 1;
  let feature;
  try {
    feature = JSON.parse(trimmed);
  } catch {
    continue;
  }
  if (feature?.type === "FeatureCollection" && Array.isArray(feature.features)) {
    for (const child of feature.features) {
      kept += take(child);
    }
    continue;
  }
  kept += take(feature);
}

function take(feature) {
  let n = 0;
  for (const classified of classifyOsmFeature(feature)) {
    const list = buckets[classified.layer];
    if (!list) continue;
    list.push(toTippecanoeFeature(feature, classified));
    n += 1;
  }
  return n;
}

const counts = {};
for (const [layer, features] of Object.entries(buckets)) {
  counts[layer] = features.length;
  const fc = { type: "FeatureCollection", features };
  await writeFile(join(outDir, `${layer}.geojson`), JSON.stringify(fc));
}

console.log(
  JSON.stringify({ read, classified: kept, layers: counts, outDir }, null, 2),
);
