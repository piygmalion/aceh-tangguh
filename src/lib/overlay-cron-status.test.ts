import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { overlayCronResponseStatus } from "./overlay-cron-status";

const ROOT = process.cwd();

describe("status HTTP cron overlay", () => {
  const okLayers = [
    { ok: true },
    { ok: true },
  ];

  it("200 hanya bila setiap lapisan, maritim, dan peringatan ok", () => {
    assert.equal(
      overlayCronResponseStatus({ layers: okLayers, maritimeOk: true, warningsOk: true }),
      200,
    );
  });

  it("503 bila satu lapisan gagal", () => {
    assert.equal(
      overlayCronResponseStatus({
        layers: [{ ok: true }, { ok: false }],
        maritimeOk: true,
        warningsOk: true,
      }),
      503,
    );
  });

  it("503 bila daftar lapisan kosong atau maritim gagal", () => {
    assert.equal(
      overlayCronResponseStatus({ layers: [], maritimeOk: true, warningsOk: true }),
      503,
    );
    assert.equal(
      overlayCronResponseStatus({ layers: okLayers, maritimeOk: false, warningsOk: true }),
      503,
    );
  });

  it("rute memakai helper dan tetap memuat daftar lapisan", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/cron/overlay-live/route.ts"), "utf8");
    assert.match(route, /overlayCronResponseStatus/);
    assert.match(route, /maritimeOk: maritime\.failed === 0/);
    assert.match(route, /layers: result\.layers/);
    assert.match(route, /failed: failed\.length/);
    assert.doesNotMatch(route, /OVERLAY_CRON_SECRET:\s*[0-9a-fA-F]{16,}/);
  });
});
