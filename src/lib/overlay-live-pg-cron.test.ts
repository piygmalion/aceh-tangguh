import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const MIGRATION = "supabase/migrations/20261027_overlay_live_pg_cron.sql";
const VAULT_READ =
  "select decrypted_secret from vault.decrypted_secrets where name = 'overlay_cron_secret'";

describe("BE-78 pg_cron overlay live refresh", () => {
  it("posts to the verified production route with a runtime vault bearer", () => {
    const route = read("src/app/api/cron/overlay-live/route.ts");
    assert.match(route, /export async function POST/);
    assert.match(route, /OVERLAY_CRON_SECRET/);
    assert.match(route, /maxDuration = 60/);

    const sql = read(MIGRATION);
    assert.match(sql, /create extension if not exists pg_net with schema extensions;/i);
    assert.match(sql, /create extension if not exists pg_cron with schema pg_catalog;/i);

    const unscheduleAt = sql.indexOf("cron.unschedule(jobid)");
    const scheduleAt = sql.indexOf("cron.schedule(");
    assert.ok(unscheduleAt >= 0 && scheduleAt > unscheduleAt);

    assert.match(sql, /where jobname = 'overlay-live-refresh'/);
    assert.match(sql, /'overlay-live-refresh',\s*\n\s*'\*\/15 \* \* \* \*'/);
    assert.match(sql, /https:\/\/aceh-tangguh\.vercel\.app\/api\/cron\/overlay-live/);
    assert.ok(sql.includes(VAULT_READ));
    assert.match(sql, /net\.http_post\(/);
    assert.match(sql, /'Authorization', 'Bearer ' \|\| \(/);
    assert.match(sql, /timeout_milliseconds := 70000/);

    const guardAt = sql.indexOf("if not exists");
    const postAt = sql.indexOf("perform net.http_post");
    assert.ok(guardAt >= 0 && postAt > guardAt);
    assert.match(sql, /return;/);
    assert.doesNotMatch(sql, /vault\.create_secret/);
    assert.doesNotMatch(sql, /Bearer [A-Za-z0-9_-]{8,}/);
  });

  it("keeps the GitHub workflow as a fallback and names pg_cron as primary", () => {
    const workflow = read(".github/workflows/overlay-live-refresh.yml");
    assert.match(workflow, /pg_cron is primary/);
    assert.match(workflow, /cron: "\*\/15 \* \* \* \*"/);
    assert.match(workflow, /workflow_dispatch:/);
    assert.match(workflow, /Authorization: Bearer \$OVERLAY_CRON_SECRET/);
    assert.match(workflow, /vars\.OVERLAY_REFRESH_URL/);
  });
});
