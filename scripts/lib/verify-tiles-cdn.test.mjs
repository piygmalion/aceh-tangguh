import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { OVERLAY_PMTILES_FILES as APP_OVERLAY_FILES } from "../../src/lib/tiles-url.ts";
import {
  ACEH_OSM_PMTILES_FILENAME,
  DEFAULT_RANGE_HEADER,
  EXPECTED_CORS,
  OVERLAY_PMTILES_FILES,
  SKIP_LOCAL_TILES_MESSAGE,
  isHttp2xx,
  isOpaqueCorsOrRangeError,
  isRangeAccepted,
  joinPublicTilesUrl,
  resolveAcehOsmCdnTarget,
  resolveOverlayCdnTargets,
  runVerifyTilesCdn,
} from "./verify-tiles-cdn.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function mockResponse(status, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get(name) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  };
}

describe("overlay CDN file list", () => {
  it("matches OVERLAY_PMTILES_FILES and keeps r3p-kab for LOD z<9", () => {
    assert.deepEqual(OVERLAY_PMTILES_FILES, [
      "r3p-kab.pmtiles",
      "kecamatan-r3p.pmtiles",
      "village-r3p.pmtiles",
      "irbi-2025.pmtiles",
    ]);
    assert.deepEqual(OVERLAY_PMTILES_FILES, Object.values(APP_OVERLAY_FILES));
    assert.ok(OVERLAY_PMTILES_FILES.includes("r3p-kab.pmtiles"));
  });
});

describe("joinPublicTilesUrl", () => {
  it("joins a public prefix to the overlay filename", () => {
    assert.equal(
      joinPublicTilesUrl("https://cdn.example/tiles/", "r3p-kab.pmtiles"),
      "https://cdn.example/tiles/r3p-kab.pmtiles"
    );
    assert.equal(
      joinPublicTilesUrl("https://cdn.example/tiles", "/tiles/village-r3p.pmtiles"),
      "https://cdn.example/tiles/village-r3p.pmtiles"
    );
    assert.equal(joinPublicTilesUrl("", "r3p-kab.pmtiles"), "/tiles/r3p-kab.pmtiles");
    assert.equal(joinPublicTilesUrl("  ", "irbi-2025.pmtiles"), "/tiles/irbi-2025.pmtiles");
  });
});

describe("resolveOverlayCdnTargets", () => {
  it("skips remote overlay HEAD when NEXT_PUBLIC_TILES_BASE_URL is unset", () => {
    const unset = resolveOverlayCdnTargets(undefined);
    assert.equal(unset.action, "skip");
    assert.equal(unset.reason, SKIP_LOCAL_TILES_MESSAGE);
    assert.deepEqual(unset.targets, []);

    const blank = resolveOverlayCdnTargets("   ");
    assert.equal(blank.action, "skip");
    assert.equal(blank.reason, SKIP_LOCAL_TILES_MESSAGE);
  });

  it("builds HEAD targets for every overlay when a public prefix is set", () => {
    const resolved = resolveOverlayCdnTargets("https://tiles.example.com/aceh/");
    assert.equal(resolved.action, "verify");
    assert.equal(resolved.targets.length, 4);
    assert.deepEqual(
      resolved.targets.map((row) => row.file),
      OVERLAY_PMTILES_FILES
    );
    assert.equal(
      resolved.targets[0].url,
      "https://tiles.example.com/aceh/r3p-kab.pmtiles"
    );
  });
});

describe("resolveAcehOsmCdnTarget", () => {
  it("HEAD absolute https; skip local /tiles path unless TILES_BASE_URL is set", () => {
    assert.equal(
      resolveAcehOsmCdnTarget({ acehOsmUrl: undefined, tilesBaseUrl: "" }).action,
      "skip"
    );

    const remote = resolveAcehOsmCdnTarget({
      acehOsmUrl: "https://cdn.example.com/aceh-osm.pmtiles",
      tilesBaseUrl: "",
    });
    assert.equal(remote.action, "verify");
    assert.equal(remote.url, "https://cdn.example.com/aceh-osm.pmtiles");

    const localOnly = resolveAcehOsmCdnTarget({
      acehOsmUrl: "/tiles/aceh-osm.pmtiles",
      tilesBaseUrl: "",
    });
    assert.equal(localOnly.action, "skip");
    assert.match(localOnly.reason, /skip remote unless NEXT_PUBLIC_TILES_BASE_URL/i);

    const localWithBase = resolveAcehOsmCdnTarget({
      acehOsmUrl: "/tiles/aceh-osm.pmtiles",
      tilesBaseUrl: "https://tiles.example.com/aceh",
    });
    assert.equal(localWithBase.action, "verify");
    assert.equal(localWithBase.url, "https://tiles.example.com/aceh/aceh-osm.pmtiles");
    assert.equal(ACEH_OSM_PMTILES_FILENAME, "aceh-osm.pmtiles");
  });
});

describe("HEAD / Range expectations", () => {
  it("accepts 2xx HEAD and Range 206 or 200", () => {
    assert.equal(isHttp2xx(200), true);
    assert.equal(isHttp2xx(204), true);
    assert.equal(isHttp2xx(404), false);
    assert.equal(isRangeAccepted(206), true);
    assert.equal(isRangeAccepted(200), true);
    assert.equal(isRangeAccepted(403), false);
    assert.equal(DEFAULT_RANGE_HEADER, "bytes=0-16383");
    assert.match(EXPECTED_CORS, /GET\/HEAD\/Range/i);
  });

  it("flags opaque CORS / Range failures", () => {
    assert.equal(isOpaqueCorsOrRangeError(new TypeError("Failed to fetch")), true);
    assert.equal(isOpaqueCorsOrRangeError(new Error("CORS blocked Range")), true);
    assert.equal(isOpaqueCorsOrRangeError(new Error("opaque response")), true);
    assert.equal(isOpaqueCorsOrRangeError(new Error("ECONNREFUSED")), false);
  });
});

describe("runVerifyTilesCdn skip path", () => {
  it("exits 0 without fetch when TILES_BASE_URL is unset (local /tiles default)", async () => {
    const calls = [];
    const lines = [];
    const result = await runVerifyTilesCdn({
      env: {},
      fetchImpl: async (...args) => {
        calls.push(args);
        return mockResponse(200);
      },
      log: (line) => lines.push(String(line)),
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.skipped, true);
    assert.equal(calls.length, 0);
    assert.ok(lines.some((line) => line.includes(SKIP_LOCAL_TILES_MESSAGE)));
  });

  it("CLI prints skip and exits 0 when the public prefix env is unset", () => {
    const env = { ...process.env };
    delete env.NEXT_PUBLIC_TILES_BASE_URL;
    delete env.NEXT_PUBLIC_ACEH_OSM_PMTILES;
    const out = execFileSync(process.execPath, ["scripts/verify-tiles-cdn.mjs"], {
      cwd: root,
      env,
      encoding: "utf8",
    });
    assert.match(out, /skip — local \/tiles default/);
  });
});

describe("runVerifyTilesCdn remote probes (mock fetch)", () => {
  it("HEAD + Range each overlay and optional absolute Aceh OSM URL", async () => {
    const calls = [];
    const result = await runVerifyTilesCdn({
      env: {
        NEXT_PUBLIC_TILES_BASE_URL: "https://tiles.example.com/aceh/",
        NEXT_PUBLIC_ACEH_OSM_PMTILES: "https://cdn.example.com/aceh-osm.pmtiles",
      },
      fetchImpl: async (url, init = {}) => {
        calls.push({ url, method: init.method ?? "GET", headers: init.headers ?? {} });
        if (init.method === "HEAD") return mockResponse(200);
        return mockResponse(206);
      },
      log: () => {},
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.skipped, false);
    const heads = calls.filter((c) => c.method === "HEAD").map((c) => c.url);
    const ranges = calls.filter((c) => c.method === "GET");
    assert.deepEqual(heads, [
      "https://tiles.example.com/aceh/r3p-kab.pmtiles",
      "https://tiles.example.com/aceh/kecamatan-r3p.pmtiles",
      "https://tiles.example.com/aceh/village-r3p.pmtiles",
      "https://tiles.example.com/aceh/irbi-2025.pmtiles",
      "https://cdn.example.com/aceh-osm.pmtiles",
    ]);
    assert.equal(ranges.length, 5);
    assert.ok(ranges.every((c) => c.headers.Range === DEFAULT_RANGE_HEADER));
  });

  it("HEAD absolute Aceh OSM even when overlay prefix is unset", async () => {
    const heads = [];
    const result = await runVerifyTilesCdn({
      env: { NEXT_PUBLIC_ACEH_OSM_PMTILES: "https://cdn.example.com/aceh-osm.pmtiles" },
      fetchImpl: async (url, init = {}) => {
        if (init.method === "HEAD") heads.push(url);
        return mockResponse(init.method === "HEAD" ? 200 : 200);
      },
      log: () => {},
    });
    assert.equal(result.exitCode, 0);
    assert.deepEqual(heads, ["https://cdn.example.com/aceh-osm.pmtiles"]);
  });

  it("fails HEAD that is not 2xx", async () => {
    const lines = [];
    const result = await runVerifyTilesCdn({
      env: { NEXT_PUBLIC_TILES_BASE_URL: "https://tiles.example.com/aceh" },
      fetchImpl: async (url, init = {}) => {
        if (String(url).includes("r3p-kab") && init.method === "HEAD") return mockResponse(404);
        return mockResponse(init.method === "HEAD" ? 200 : 206);
      },
      log: (line) => lines.push(String(line)),
    });
    assert.equal(result.exitCode, 1);
    assert.ok(lines.some((line) => /FAIL.*r3p-kab/.test(line)));
  });

  it("fails opaque CORS/Range errors and documents expected CORS", async () => {
    const lines = [];
    const result = await runVerifyTilesCdn({
      env: { NEXT_PUBLIC_TILES_BASE_URL: "https://tiles.example.com/aceh" },
      fetchImpl: async (_url, init = {}) => {
        if (init.method === "HEAD") return mockResponse(200);
        throw new TypeError("Failed to fetch");
      },
      log: (line) => lines.push(String(line)),
    });
    assert.equal(result.exitCode, 1);
    const joined = lines.join("\n");
    assert.match(joined, /CORS|Range/i);
    assert.match(joined, /GET\/HEAD\/Range/i);
  });
});
