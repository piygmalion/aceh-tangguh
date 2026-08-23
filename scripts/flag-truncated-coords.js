#!/usr/bin/env node
/**
 * Flag marker features whose longitude or latitude is an integer
 * (Number.isInteger after Number()) — truncated GPS, not inventable.
 *
 * Sets:
 *   properties.coord_quality = "truncated_integer"
 *   properties.approx = true  (keeps existing approx if already true)
 *
 * Does not invent decimal places. Re-runnable.
 *
 * Usage:
 *   node scripts/flag-truncated-coords.js           # apply + print counts
 *   node scripts/flag-truncated-coords.js --dry-run # print only
 *
 * After merge, coordinator can re-seed Supabase marker_features from the
 * updated fixture via existing upsert_marker_features RPC (no service_role
 * required in this repo). This script only writes public/fixtures/markers.geojson.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MARKERS_PATH = path.join(ROOT, "public/fixtures/markers.geojson");
const DRY_RUN = process.argv.includes("--dry-run");

function isIntegerCoordinate(value) {
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n);
}

function hasTruncatedIntegerCoord(lon, lat) {
  return isIntegerCoordinate(lon) || isIntegerCoordinate(lat);
}

function main() {
  const raw = fs.readFileSync(MARKERS_PATH, "utf8");
  const fc = JSON.parse(raw);
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    throw new Error("markers.geojson is not a FeatureCollection");
  }

  const flaggedByLayer = {};
  const alreadyByLayer = {};
  let newlyFlagged = 0;
  let alreadyFlagged = 0;

  for (const feature of fc.features) {
    const geom = feature.geometry;
    if (!geom || geom.type !== "Point" || !Array.isArray(geom.coordinates)) {
      continue;
    }
    const [lon, lat] = geom.coordinates;
    if (!hasTruncatedIntegerCoord(lon, lat)) continue;

    const props = feature.properties && typeof feature.properties === "object"
      ? feature.properties
      : {};
    feature.properties = props;
    const layer = String(props.layer ?? "unknown");

    const wasFlagged = props.coord_quality === "truncated_integer";
    if (wasFlagged && props.approx === true) {
      alreadyFlagged += 1;
      alreadyByLayer[layer] = (alreadyByLayer[layer] || 0) + 1;
      continue;
    }

    props.coord_quality = "truncated_integer";
    props.approx = true;
    newlyFlagged += 1;
    flaggedByLayer[layer] = (flaggedByLayer[layer] || 0) + 1;
  }

  const totalByLayer = {};
  for (const layer of new Set([
    ...Object.keys(flaggedByLayer),
    ...Object.keys(alreadyByLayer),
  ])) {
    totalByLayer[layer] =
      (flaggedByLayer[layer] || 0) + (alreadyByLayer[layer] || 0);
  }

  const totalFlagged = newlyFlagged + alreadyFlagged;
  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        newlyFlagged,
        alreadyFlagged,
        totalFlagged,
        byLayer: Object.fromEntries(
          Object.entries(totalByLayer).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        ),
        newlyByLayer: flaggedByLayer,
        note:
          "Integer lon/lat kept as-is. Do not invent decimals. Re-seed marker_features via upsert_marker_features after merge.",
      },
      null,
      2
    )
  );

  if (DRY_RUN) return;

  fs.writeFileSync(
    MARKERS_PATH,
    JSON.stringify(fc, null, 0) + "\n",
    "utf8"
  );
  console.log(`wrote ${MARKERS_PATH}`);
}

main();
