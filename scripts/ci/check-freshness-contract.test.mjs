import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { assessFreshnessContract } from "./check-freshness-contract.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function sample() {
  return {
    overlay: 'name: Overlay\non:\n  schedule:\n    - cron: "*/15 * * * *"\n# overlay-live-refresh\n',
    weather:
      'schedule:\n    - cron: "0 */6 * * *"\n# weather-refresh-hourly\n',
    dibi: 'schedule:\n    - cron: "0 2 * * 1-5"\n',
    sipongi: 'schedule:\n    - cron: "30 2 * * 1-5"\n',
    route: "const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();",
    dibiFixture: { metadata: { fetched_at: "2026-11-10T09:01:40.082Z" } },
    sipongiFixture: {
      fetched_at: "2026-11-10T10:15:53.043Z",
      stale: false,
      example: false,
    },
    weatherSnapshot: {
      metadata: { fetched_at: "2026-11-10T14:00:44.442Z", total_kabupaten_kota: 1 },
      kabupaten_kota: [{ slug: "aceh-selatan" }],
    },
  };
}

describe("kontrak kesegaran", () => {
  it("menolak token Bearer dan TTL yang berubah", () => {
    const ok = assessFreshnessContract(sample());
    assert.deepEqual(ok, []);
    const leaked = sample();
    leaked.overlay += 'Authorization: Bearer abcdefghijklmnop';
    assert.match(assessFreshnessContract(leaked).join("\n"), /Bearer/);
    const ttl = sample();
    ttl.route = "const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();";
    assert.match(assessFreshnessContract(ttl).join("\n"), /4 jam/);
  });

  it("berkas repo memenuhi kontrak tanpa membuka produksi", async () => {
    const input = {
      overlay: await readFile(join(ROOT, ".github/workflows/overlay-live-refresh.yml"), "utf8"),
      weather: await readFile(join(ROOT, ".github/workflows/weather-refresh.yml"), "utf8"),
      dibi: await readFile(join(ROOT, ".github/workflows/dibi-refresh.yml"), "utf8"),
      sipongi: await readFile(join(ROOT, ".github/workflows/sipongi-refresh.yml"), "utf8"),
      route: await readFile(join(ROOT, "src/app/api/weather/refresh/route.ts"), "utf8"),
      dibiFixture: JSON.parse(
        await readFile(join(ROOT, "public/fixtures/dibi-aceh.json"), "utf8"),
      ),
      sipongiFixture: JSON.parse(
        await readFile(join(ROOT, "public/fixtures/peringatan-sipongi.json"), "utf8"),
      ),
      weatherSnapshot: JSON.parse(
        await readFile(join(ROOT, "public/fixtures/weather-snapshot.json"), "utf8"),
      ),
    };
    assert.deepEqual(assessFreshnessContract(input), []);
  });
});
