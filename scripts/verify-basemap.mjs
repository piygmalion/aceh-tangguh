#!/usr/bin/env node
/**
 * Smoke-check the CDNs the map depends on: Carto raster (default), EOX Sentinel tiles, STAC.
 * OpenFreeMap is optional — a failure there must not fail the probe.
 * Does not fail the product build — run manually or in CI as a health probe.
 */
const required = [
  {
    name: "Carto positron raster",
    url: "https://a.basemaps.cartocdn.com/light_all/6/50/32.png",
    ok: (res, _buf, type) => res.ok && type.includes("image"),
  },
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

const optional = [
  {
    name: "OpenFreeMap positron style (optional)",
    url: "https://tiles.openfreemap.org/styles/positron",
    ok: (res, buf) => res.ok && buf.includes('"version"') && buf.includes("8"),
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

for (const c of optional) {
  try {
    const res = await fetch(c.url);
    const buf = await res.clone().text();
    const pass = c.ok(res, buf);
    console.log(`${pass ? "ok " : "skip"} ${c.name}  HTTP ${res.status}`);
  } catch (err) {
    console.log(`skip ${c.name}  ${err instanceof Error ? err.message : err}`);
  }
}

if (failed) {
  console.error(`\n${failed} required check(s) failed`);
  process.exit(1);
}
console.log("\nRequired basemap CDNs reachable.");
