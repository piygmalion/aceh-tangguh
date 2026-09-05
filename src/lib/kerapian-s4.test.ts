import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

describe("ECC-S4 kerapian", () => {
  it("GET /api/sik/catalog is removed", () => {
    assert.equal(
      existsSync(path.join(root, "src/app/api/sik/catalog/route.ts")),
      false,
    );
    const attack = readFileSync(path.join(root, "security/attack-surface.md"), "utf8");
    assert.equal(attack.includes("/api/sik/catalog"), false);
  });

  it("DATA-16 adds a new seed migration and does not edit 20260911", () => {
    const neu = readFileSync(
      path.join(root, "supabase/migrations/20260924_overlay_static_seed_from_json.sql"),
      "utf8",
    );
    const old = readFileSync(
      path.join(root, "supabase/migrations/20260911_overlay_static_seed.sql"),
      "utf8",
    );
    assert.match(neu, /overlay-static-rows/);
    assert.match(neu, /XA001/);
    assert.doesNotMatch(neu, /"id":"XB005"/);
    assert.match(old, /overlay_static_features/);
  });

  it("DATA-19 upsert script writes weather_inovasi_snapshot and not official weather", () => {
    const script = readFileSync(
      path.join(root, "scripts/upsert-weather-inovasi-snapshot.mjs"),
      "utf8",
    );
    assert.match(script, /weather_inovasi_snapshot/);
    assert.match(script, /expires_at/);
    assert.doesNotMatch(script, /getWeatherForecasts/);
    assert.doesNotMatch(script, /weather_forecasts/);
  });

  it("FE-24 chrome is used by kejadian and SDB lists, not moderation", () => {
    const chrome = readFileSync(
      path.join(root, "src/components/admin/AdminListChrome.tsx"),
      "utf8",
    );
    const kejadian = readFileSync(
      path.join(root, "src/components/sik/KejadianOpsList.tsx"),
      "utf8",
    );
    const sdb = readFileSync(
      path.join(root, "src/components/sik/SdbKatalogList.tsx"),
      "utf8",
    );
    const moderasi = readFileSync(
      path.join(root, "src/components/admin/ModerationTable.tsx"),
      "utf8",
    );
    assert.match(chrome, /AdminListChrome/);
    assert.match(kejadian, /AdminListChrome/);
    assert.match(sdb, /AdminListChrome/);
    assert.doesNotMatch(moderasi, /AdminListChrome/);
  });
});
