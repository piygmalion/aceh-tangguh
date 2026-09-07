import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { jakartaDayUtcBounds } from "./service";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("BE-29 daily brief cron and API", () => {
  it("cron uses DAILY_BRIEF_CRON_SECRET with 503 and 401", () => {
    const cron = read("src/app/api/cron/daily-brief/route.ts");
    assert.match(cron, /DAILY_BRIEF_CRON_SECRET/);
    assert.match(cron, /status: 503/);
    assert.match(cron, /status: 401/);
    assert.doesNotMatch(cron, /OVERLAY_CRON_SECRET|WEATHER_CRON_SECRET|LAPORAN_CRON_SECRET/);
    assert.doesNotMatch(cron, /DAILY_BRIEF_CRON_SECRET:\s*[0-9a-fA-F]{16,}/);
  });

  it("workflow is skip-if-unset and does not embed a secret value", () => {
    const workflow = read(".github/workflows/daily-brief.yml");
    assert.match(workflow, /0 0 \* \* \*/);
    assert.match(workflow, /vars\.DAILY_BRIEF_URL/);
    assert.match(workflow, /secrets\.DAILY_BRIEF_CRON_SECRET/);
    assert.doesNotMatch(workflow, /DAILY_BRIEF_CRON_SECRET:\s*[0-9a-fA-F]{16,}/);
  });

  it("staff routes require dailyBrief and rejectCrossOrigin on writes", () => {
    const subs = read("src/app/api/admin/daily-brief/subscribers/route.ts");
    const briefs = read("src/app/api/admin/daily-brief/briefs/route.ts");
    assert.match(subs, /requireModuleApi\("dailyBrief"\)/);
    assert.match(subs, /rejectCrossOrigin/);
    assert.match(briefs, /requireModuleApi\("dailyBrief"\)/);
    assert.match(briefs, /rejectCrossOrigin/);
    assert.doesNotMatch(subs, /phone_enc/);
  });

  it("public brief GET has no subscriber fields", () => {
    const route = read("src/app/api/brief/[ymd]/route.ts");
    assert.doesNotMatch(route, /phone|subscriber|encryptPii/);
    assert.match(route, /loadPublicBrief/);
  });

  it("jakarta day bounds start at 00:00 WIB", () => {
    const { from, to } = jakartaDayUtcBounds("2026-09-07");
    assert.equal(from, "2026-09-06T17:00:00.000Z");
    assert.equal(to, "2026-09-07T17:00:00.000Z");
  });
});
