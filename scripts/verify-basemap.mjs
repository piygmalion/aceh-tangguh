#!/usr/bin/env node
/**
 * Smoke-check the three CDNs the map depends on: OpenFreeMap styles, EOX Sentinel tiles, STAC.
 * Does not fail the product build — run manually or in CI as a health probe.
 */
const checks = [
  {
    name: "OpenFreeMap positron style",
    url: "https://tiles.openfreemap.org/styles/positron",
    ok: (res, buf) => res.ok && buf.includes('"version"') && buf.includes("8"),
  },
  {
    name: "OpenFreeMap dark style",
    url: "https://tiles.openfreemap.org/styles/dark",
    ok: (res) => res.ok,
  },
  {
    name: "EOX Sentinel-2 cloudless tile z6",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/6/50/32.jpg",
    ok: (res) => res.ok && (res.headers.get("content-type") ?? "").includes("image"),
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
for (const c of checks) {
  try {
    const res = await fetch(c.url, {
      method: c.method ?? "GET",
      headers: c.headers,
      body: c.body,
    });
    const buf = await res.clone().text();
    const pass = c.ok(res, buf);
    console.log(`${pass ? "ok " : "FAIL"} ${c.name}  HTTP ${res.status}`);
    if (!pass) failed += 1;
  } catch (err) {
    failed += 1;
    console.log(`FAIL ${c.name}  ${err instanceof Error ? err.message : err}`);
  }
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll basemap CDNs reachable.");
