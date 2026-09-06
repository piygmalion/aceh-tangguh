#!/usr/bin/env node
/**
 * Dissolve villageDistribution.geojson → kecamatanDistribution.geojson.
 *
 * Group key: properties.kode_kecamatan (6-digit BPS) only. Never name.
 * Leftovers without kode stay out. No invented codes.
 * Bucket: sum(rumah_rr+rumah_rs+rumah_rb) + villageDistribution terciles (106 / 1184).
 *
 * Geometry union uses shapely (scripts/lib/unary-union-geoms.py).
 * Usage: node scripts/dissolve-kecamatan-distribution.mjs
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VILLAGE_DISTRIBUTION_TERCILES,
  buildKecamatanProperties,
  groupVillageFeaturesByKodeKecamatan,
} from "./lib/kecamatan-dissolve.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public/fixtures/areas/villageDistribution.geojson");
const OUT = join(ROOT, "public/fixtures/areas/kecamatanDistribution.geojson");
const UNION_PY = join(ROOT, "scripts/lib/unary-union-geoms.py");

const geo = JSON.parse(readFileSync(SRC, "utf8"));
const { groups, leftover_excluded, skipped_non_six_digit } =
  groupVillageFeaturesByKodeKecamatan(geo.features);

const stagedFeatures = [...groups.values()]
  .sort((a, b) => a.kode_kecamatan.localeCompare(b.kode_kecamatan))
  .map((group) => ({
    type: "Feature",
    properties: buildKecamatanProperties(group),
    geometry: {
      type: "GeometryCollection",
      geometries: group.geometries,
    },
  }));

const staged = {
  type: "FeatureCollection",
  metadata: {
    source: "villageDistribution.geojson",
    group_key: "kode_kecamatan",
    leftover_excluded,
    skipped_non_six_digit,
    groups: stagedFeatures.length,
    bucket:
      `villageDistribution terciles t1=${VILLAGE_DISTRIBUTION_TERCILES.t1} ` +
      `t2=${VILLAGE_DISTRIBUTION_TERCILES.t2} on sum(rumah_rr+rumah_rs+rumah_rb); ` +
      "same Distribusi scale as desa — not recomputed, not majority",
  },
  features: stagedFeatures,
};

const dir = mkdtempSync(join(tmpdir(), "kec-dissolve-"));
const stagedPath = join(dir, "staged.geojson");
writeFileSync(stagedPath, JSON.stringify(staged));

const result = spawnSync("python3", [UNION_PY, stagedPath, OUT], { stdio: "inherit" });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const written = JSON.parse(readFileSync(OUT, "utf8"));
console.log(
  JSON.stringify(
    {
      out: "public/fixtures/areas/kecamatanDistribution.geojson",
      groups: written.features?.length ?? 0,
      leftover_excluded,
      skipped_non_six_digit,
      bucket: staged.metadata.bucket,
    },
    null,
    2
  )
);
