import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { enabledMapLayersCatalog } from "../map-layers-catalog";
import { fetchPublicApi } from "./public-api";

const STATIC_FLAGS = [
  "STATIC_EXPORT",
  "NEXT_PUBLIC_STATIC_EXPORT",
  "GITHUB_PAGES",
  "NEXT_PUBLIC_GITHUB_PAGES",
] as const;

const saved: Partial<Record<(typeof STATIC_FLAGS)[number], string | undefined>> = {};

function setStaticExport(on: boolean) {
  for (const key of STATIC_FLAGS) {
    if (!(key in saved)) saved[key] = process.env[key];
    if (on) process.env[key] = "1";
    else delete process.env[key];
  }
}

afterEach(() => {
  for (const key of STATIC_FLAGS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    delete saved[key];
  }
});

describe("static preview public API", () => {
  it("returns explicit 503 for retired GET /api/hazards", async () => {
    setStaticExport(true);
    const res = await fetchPublicApi("/api/hazards");
    assert.equal(res.status, 503);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, "not_available_on_static_preview");
  });

  it("serves GET /api/layers/catalog from the local enabled catalog", async () => {
    setStaticExport(true);
    const res = await fetchPublicApi("/api/layers/catalog");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { items?: unknown; source?: string };
    assert.equal(body.source, "catalog");
    assert.ok(Array.isArray(body.items));
    assert.deepEqual(body.items, enabledMapLayersCatalog());
  });

  it("serves GET /api/layers/meta/* as empty fixture items when no file exists", async () => {
    setStaticExport(true);
    const res = await fetchPublicApi("/api/layers/meta/villageDistribution");
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      items?: unknown;
      layerKey?: string;
      source?: string;
      name?: string;
      desa?: unknown;
    };
    assert.deepEqual(body.items, []);
    assert.equal(body.layerKey, "villageDistribution");
    assert.equal(body.source, "fixture");
    assert.equal(body.name, undefined);
    assert.equal(body.desa, undefined);
  });

  it("maps GET /api/weather/inovasi to the unconfigured inovasi fixture", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/lib/preview/public-api.ts"),
      "utf8",
    );
    assert.match(src, /path === "\/api\/weather\/inovasi"/);
    assert.match(src, /weather-inovasi-snapshot\.json/);
    const fixture = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "public/fixtures/weather-inovasi-snapshot.json"),
        "utf8",
      ),
    ) as {
      metadata: { official: boolean; kind: string; status: string };
      kabupaten_kota: unknown[];
    };
    assert.equal(fixture.metadata.official, false);
    assert.equal(fixture.metadata.kind, "inovasi");
    assert.equal(fixture.metadata.status, "unconfigured");
    assert.deepEqual(fixture.kabupaten_kota, []);
  });

  it("returns 400 for GET /api/layers/meta without a layer key", async () => {
    setStaticExport(true);
    const res = await fetchPublicApi("/api/layers/meta/");
    assert.equal(res.status, 400);
  });
});
