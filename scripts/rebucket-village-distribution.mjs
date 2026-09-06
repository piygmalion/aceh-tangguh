#!/usr/bin/env node
/**
 * Stamp 5-class + unknown buckets onto existing area fixtures.
 * Does not invent BPS codes or rumah totals. Geometry is unchanged.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHOROPLETH_DAMAGED_HOME,
  VILLAGE_DISTRIBUTION_QUINTILES,
  bucketFromVillageProps,
  groupVillageTotalsByKabupatenName,
  normalizeKabupatenName,
  villageDistributionBucket,
  villageDistributionLegendItems,
  rumahTotal,
} from "./lib/village-distribution-buckets.mjs";
import {
  buildKecamatanProperties,
  groupVillageFeaturesByKodeKecamatan,
} from "./lib/kecamatan-dissolve.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AREAS = join(ROOT, "public/fixtures/areas");

const villagePath = join(AREAS, "villageDistribution.geojson");
const village = JSON.parse(readFileSync(villagePath, "utf8"));
let unknown = 0;
for (const feature of village.features) {
  const next = bucketFromVillageProps(feature.properties);
  if (next === "belum_diketahui") unknown += 1;
  feature.properties.bucket = next;
  feature.properties.value = rumahTotal(
    feature.properties.rumah_rr,
    feature.properties.rumah_rs,
    feature.properties.rumah_rb
  );
}
writeFileSync(villagePath, JSON.stringify(village));

const legend = {
  title: "Distribusi desa (rumah rusak RR+RS+RB)",
  items: villageDistributionLegendItems(),
  quintiles: { ...VILLAGE_DISTRIBUTION_QUINTILES },
  colors: { ...CHOROPLETH_DAMAGED_HOME },
};
writeFileSync(join(AREAS, "villageDistribution.legend.json"), `${JSON.stringify(legend, null, 2)}\n`);

const kecPath = join(AREAS, "kecamatanDistribution.geojson");
const kec = JSON.parse(readFileSync(kecPath, "utf8"));
const { groups, leftover_excluded, skipped_non_six_digit } =
  groupVillageFeaturesByKodeKecamatan(village.features);
for (const feature of kec.features) {
  const kode = String(feature.properties?.kode_kecamatan ?? "");
  const group = groups.get(kode);
  if (!group) continue;
  const next = buildKecamatanProperties(group);
  feature.properties = { ...feature.properties, ...next };
}
kec.metadata = {
  ...(kec.metadata ?? {}),
  leftover_excluded,
  skipped_non_six_digit,
  bucket:
    `villageDistribution quintiles q1=${VILLAGE_DISTRIBUTION_QUINTILES.q1} ` +
    `q2=${VILLAGE_DISTRIBUTION_QUINTILES.q2} q3=${VILLAGE_DISTRIBUTION_QUINTILES.q3} ` +
    `q4=${VILLAGE_DISTRIBUTION_QUINTILES.q4} on sum(rumah_rr+rumah_rs+rumah_rb)`,
};
writeFileSync(kecPath, JSON.stringify(kec));

const kabTotals = groupVillageTotalsByKabupatenName(village.features);

const r3pPath = join(AREAS, "r3pDistribution.geojson");
const r3p = JSON.parse(readFileSync(r3pPath, "utf8"));
for (const feature of r3p.features) {
  const name = normalizeKabupatenName(feature.properties?.name ?? feature.properties?.kabupaten);
  const summed = kabTotals.get(name);
  if (summed) {
    feature.properties.rumah_rr = summed.rumah_rr;
    feature.properties.rumah_rs = summed.rumah_rs;
    feature.properties.rumah_rb = summed.rumah_rb;
    feature.properties.value = summed.value;
    feature.properties.source = "dissolve:kabupaten name from villageDistribution";
  }
  const total = rumahTotal(
    feature.properties.rumah_rr,
    feature.properties.rumah_rs,
    feature.properties.rumah_rb
  );
  feature.properties.bucket = villageDistributionBucket(total);
}
writeFileSync(r3pPath, JSON.stringify(r3p));

const r3pLegend = {
  title: "Distribusi R3P (rumah rusak RR+RS+RB)",
  items: villageDistributionLegendItems(),
  quintiles: { ...VILLAGE_DISTRIBUTION_QUINTILES },
  note: "Same desa quintile breaks applied to kab sums of village RR+RS+RB.",
};
writeFileSync(join(AREAS, "r3pDistribution.legend.json"), `${JSON.stringify(r3pLegend, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      village: village.features.length,
      unknown,
      kecamatan: kec.features.length,
      kab: r3p.features.length,
      quintiles: VILLAGE_DISTRIBUTION_QUINTILES,
    },
    null,
    2
  )
);
