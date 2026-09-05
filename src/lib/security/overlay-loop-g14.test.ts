import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

describe("AN-18 loop overlay G14", () => {
  it("POST cron memakai OVERLAY_CRON_SECRET, 503, dan 401", () => {
    const cron = readFileSync(join(ROOT, "src/app/api/cron/overlay-live/route.ts"), "utf8");
    assert.match(cron, /OVERLAY_CRON_SECRET/);
    assert.match(cron, /refreshAllOverlayLive/);
    assert.match(cron, /refreshMaritimeForecasts/);
    assert.match(cron, /not configured/);
    assert.match(cron, /status:\s*503/);
    assert.match(cron, /status:\s*401/);
    assert.doesNotMatch(cron, /WEATHER_CRON_SECRET/);
  });

  it("GET overlay live hanya membaca loadOverlayLive", () => {
    const get = readFileSync(join(ROOT, "src/app/api/overlay/[key]/route.ts"), "utf8");
    assert.match(get, /loadOverlayLive/);
    assert.match(get, /isOverlayLiveRefreshKey/);
    assert.doesNotMatch(get, /refreshAllOverlayLive|refreshOverlayLive/);
    assert.match(get, /OVERLAY_UPSTREAM_FAILURE_BODY/);
    assert.equal(/status:\s*200/.test(get.split("catch")[1] ?? ""), false);
  });

  it("workflow memuat nama secret tanpa nilai", () => {
    const workflow = readFileSync(join(ROOT, ".github/workflows/overlay-live-refresh.yml"), "utf8");
    assert.match(workflow, /secrets\.OVERLAY_CRON_SECRET/);
    assert.match(workflow, /vars\.OVERLAY_REFRESH_URL/);
    assert.doesNotMatch(workflow, /OVERLAY_CRON_SECRET:\s*[0-9a-fA-F]{16,}/);
  });
});
