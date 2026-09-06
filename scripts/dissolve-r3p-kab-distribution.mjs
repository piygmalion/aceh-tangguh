#!/usr/bin/env node
/**
 * Dissolve kecamatanDistribution.geojson → r3pDistribution.geojson.
 *
 * Group key: kode_kabupaten / kode_kab (4-digit BPS). Never invent codes.
 * Bucket: r3pDistribution legend terciles (1362 / 10795).
 *
 * Geometry: keep existing kab outlines when kode_kab matches; otherwise
 * unary-union kecamatan members (scripts/lib/unary-union-geoms.py).
 *
 * Usage: node --import tsx scripts/dissolve-r3p-kab-distribution.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  R3P_KAB_TERCILES,
  buildR3pKabProperties,
  groupKecamatanFeaturesByKabupaten,
} from "../src/lib/r3p-kab-aggregate.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public/fixtures/areas/kecamatanDistribution.geojson");
const OUT = join(ROOT, "public/fixtures/areas/r3pDistribution.geojson");
const UNION_PY = join(ROOT, "scripts/lib/unary-union-geoms.py");

const geo = JSON.parse(readFileSync(SRC, "utf8"));
const { groups, leftover_excluded } = groupKecamatanFeaturesByKabupaten(
  geo.features
);

function normName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Existing kab outlines use a different 4-digit scheme than kecamatan/desa.
 * Match geometry by kabupaten name only — never by kode — then stamp the
 * kecamatan-side kode_kab so LOD prefix filters stay aligned.
 */
const existingByName = new Map();
if (existsSync(OUT)) {
  const prev = JSON.parse(readFileSync(OUT, "utf8"));
  for (const feature of prev.features || []) {
    const name = normName(feature.properties?.name ?? feature.properties?.kabupaten);
    if (name && feature.geometry && !existingByName.has(name)) {
      existingByName.set(name, feature.geometry);
    }
  }
}

const sorted = [...groups.values()].sort((a, b) =>
  a.kode_kab.localeCompare(b.kode_kab)
);
const reused = [];
const needUnion = [];
for (const group of sorted) {
  const props = buildR3pKabProperties(group);
  const geom = existingByName.get(normName(props.name ?? props.kabupaten));
  const feature = {
    type: "Feature",
    properties: props,
    geometry: geom ?? {
      type: "GeometryCollection",
      geometries: group.geometries,
    },
  };
  if (geom) reused.push(feature);
  else needUnion.push(feature);
}

const metadata = {
  source: "kecamatanDistribution.geojson",
  group_key: "kode_kabupaten",
  leftover_excluded,
  groups: sorted.length,
  geometry_reused: reused.length,
  geometry_unioned: needUnion.length,
  bucket:
    `r3pDistribution terciles t1=${R3P_KAB_TERCILES.t1} ` +
    `t2=${R3P_KAB_TERCILES.t2} on sum(rumah_rr+rumah_rs+rumah_rb)`,
};

function writeCollection(features) {
  writeFileSync(
    OUT,
    JSON.stringify(
      { type: "FeatureCollection", metadata, features },
      null,
      0
    )
  );
}

if (needUnion.length === 0) {
  writeCollection(reused);
} else {
  const dir = mkdtempSync(join(tmpdir(), "r3p-kab-dissolve-"));
  const stagedPath = join(dir, "staged.geojson");
  writeFileSync(
    stagedPath,
    JSON.stringify({
      type: "FeatureCollection",
      metadata,
      features: [...reused, ...needUnion],
    })
  );

  function runPython(bin) {
    return spawnSync(bin, [UNION_PY, stagedPath, OUT], { stdio: "inherit" });
  }

  let result = runPython("python");
  if (result.status !== 0) result = runPython("python3");
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const written = JSON.parse(readFileSync(OUT, "utf8"));
console.log(
  JSON.stringify(
    {
      out: "public/fixtures/areas/r3pDistribution.geojson",
      groups: written.features?.length ?? 0,
      leftover_excluded,
      geometry_reused: reused.length,
      geometry_unioned: needUnion.length,
      bucket: metadata.bucket,
    },
    null,
    2
  )
);
