#!/usr/bin/env node
/**
 * Smoke-check imagery the map still fetches (EOX Sentinel) and STAC.
 * The operational basemap is owned PMTiles. This probe does not request
 * public OSM raster tiles or CARTO. A configured PMTiles URL is checked
 * with HTTP Range; an unset URL is a skip, not a failure.
 */
const pmtiles = (
  process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL ??
  process.env.NEXT_PUBLIC_ACEH_OSM_PMTILES ??
  ""
).trim();

const required = [
  {
    name: "EOX Sentinel-2 cloudless tile z6",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/6/50/32.jpg",
    ok: (res, _buf, type) => res.ok && type.includes("image"),
  },
  {
    name: "Element84 Earth Search STAC (Aceh)",
    url: "https://earth-search.aws.element84.com/v1/search",
    method: "POST",
    body: JSON.stringify({
      collections: ["sentinel-2-l2a"],
      bbox: [95.0, 2.0, 98.3, 6.15],
      limit: 1,
      sortby: [{ field: "properties.datetime", direction: "desc" }],
    }),
    headers: { "Content-Type": "application/json" },
    ok: (res, buf) => res.ok && buf.includes("FeatureCollection"),
  },
];

let failed = 0;
for (const c of required) {
  try {
    const res = await fetch(c.url, {
      method: c.method ?? "GET",
      headers: c.headers,
      body: c.body,
    });
    const buf = await res.clone().text();
    const type = res.headers.get("content-type") ?? "";
    const pass = c.ok(res, buf, type);
    console.log(`${pass ? "ok " : "FAIL"} ${c.name}  HTTP ${res.status}`);
    if (!pass) failed += 1;
  } catch (err) {
    failed += 1;
    console.log(`FAIL ${c.name}  ${err instanceof Error ? err.message : err}`);
  }
}

if (!pmtiles.startsWith("http")) {
  console.log("skip PMTiles basemap (NEXT_PUBLIC_BASEMAP_PMTILES_URL unset)");
} else {
  try {
    const res = await fetch(pmtiles, {
      method: "GET",
      headers: { Range: "bytes=0-16383" },
    });
    const pass = res.status === 206 || res.status === 200;
    console.log(`${pass ? "ok " : "FAIL"} PMTiles basemap range  HTTP ${res.status}`);
    if (!pass) failed += 1;
  } catch (err) {
    failed += 1;
    console.log(`FAIL PMTiles basemap range  ${err instanceof Error ? err.message : err}`);
  }
}

if (failed) {
  console.error(`\n${failed} required check(s) failed`);
  process.exit(1);
}
console.log("\nbasemap probe ok");
