#!/usr/bin/env node
/**
 * Query Element84 Earth Search STAC for the latest Sentinel-2 L2A scene over Aceh
 * and write public/fixtures/sentinel-status.json for the static preview + UI.
 *
 * Periodic mosaic rebuild (quarterly CDSE / TiTiler) is documented in docs/basemap.md.
 * This script is the cheap "is the archive current?" heartbeat — it does not download imagery.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ACEH_BBOX } from "./lib/aceh-scope.mjs";
const STAC_SEARCH = "https://earth-search.aws.element84.com/v1/search";
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "fixtures",
  "sentinel-status.json"
);

const res = await fetch(STAC_SEARCH, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({
    collections: ["sentinel-2-l2a"],
    bbox: ACEH_BBOX,
    limit: 1,
    sortby: [{ field: "properties.datetime", direction: "desc" }],
  }),
});

if (!res.ok) {
  console.error(`STAC search failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const json = await res.json();
const feature = json.features?.[0];
const props = feature?.properties ?? {};

const payload = {
  mosaic: {
    product: "s2cloudless",
    provider: "EOX",
    year: 2024,
    tileUrl:
      "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
    cadence: "annual",
  },
  latestScene: feature
    ? {
        id: feature.id ?? "",
        datetime: props.datetime ?? "",
        cloudCover:
          typeof props["eo:cloud_cover"] === "number"
            ? Math.round(props["eo:cloud_cover"] * 10) / 10
            : null,
        platform: props.platform ?? null,
      }
    : null,
  bbox: ACEH_BBOX,
  fetchedAt: new Date().toISOString(),
  source: "stac",
};

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
console.log(
  `Latest scene: ${payload.latestScene?.id ?? "none"} @ ${payload.latestScene?.datetime ?? "n/a"} (cloud ${payload.latestScene?.cloudCover ?? "?"}%)`
);
