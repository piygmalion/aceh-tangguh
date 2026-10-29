import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const MIGRATION = "supabase/migrations/20261029_weather_refresh_cron.sql";
const VAULT_READ =
  "select decrypted_secret from vault.decrypted_secrets where name = 'weather_cron_secret'";

describe("BE-83 pg_cron weather cache refresh", () => {
  it("posts to the verified production route with a trimmed runtime vault bearer", () => {
    const route = read("src/app/api/weather/refresh/route.ts");
    assert.match(route, /export async function POST/);
    assert.equal(route.includes("export async function GET"), false);
    assert.match(route, /WEATHER_CRON_SECRET/);
    assert.match(route, /bearerMatches\(request\.headers\.get\("authorization"\), secret\)/);
    assert.match(route, /maxDuration = 60/);
    assert.match(route, /4 \* 60 \* 60 \* 1000/);
    assert.match(route, /from\("weather_forecasts"\)/);
    assert.match(route, /error: "upsert_failed"/);
    assert.match(route, /status: 502/);

    const sql = read(MIGRATION);
    assert.match(
      sql,
      /pg_cron, pg_net, and the cron grants come from\s+-- 20261027_overlay_live_pg_cron\.sql, which must be applied first/,
    );
    assert.match(sql, /Re-running the grants fails with 2BP01 under Supabase's pg_cron event trigger/);
    assert.doesNotMatch(sql, /create extension if not exists pg_net/i);
    assert.doesNotMatch(sql, /create extension if not exists pg_cron/i);
    assert.doesNotMatch(sql, /grant usage on schema cron to postgres/i);
    assert.doesNotMatch(sql, /grant all privileges on all tables in schema cron to postgres/i);

    const unscheduleAt = sql.indexOf("cron.unschedule(jobid)");
    const scheduleAt = sql.indexOf("cron.schedule(");
    assert.ok(unscheduleAt >= 0 && scheduleAt > unscheduleAt);

    assert.match(sql, /where jobname = 'weather-refresh-hourly'/);
    assert.match(sql, /'weather-refresh-hourly',\s*\n\s*'7 \* \* \* \*'/);
    assert.doesNotMatch(sql, /'\*\/15 \* \* \* \*'/);
    assert.doesNotMatch(sql, /'0 \* \* \* \*'/);
    assert.match(sql, /https:\/\/aceh-tangguh\.vercel\.app\/api\/weather\/refresh/);
    assert.ok(sql.includes(VAULT_READ));
    assert.match(sql, /net\.http_post\(/);
    assert.match(sql, /timeout_milliseconds := 70000/);

    const headerAt = sql.indexOf("'Authorization'");
    const header = sql.slice(headerAt, sql.indexOf("timeout_milliseconds"));
    assert.match(header, /'Bearer ' \|\| \(/);
    assert.match(header, /select btrim\(decrypted_secret\) from vault\.decrypted_secrets where name = 'weather_cron_secret'/);
    assert.doesNotMatch(header, /select decrypted_secret from vault/);

    const guardAt = sql.indexOf("if not exists");
    const postAt = sql.indexOf("perform net.http_post");
    assert.ok(guardAt >= 0 && postAt > guardAt);
    assert.match(sql, /btrim\(decrypted_secret\) <> ''/);
    assert.match(sql, /return;/);
    assert.match(sql, /-- select cron\.unschedule\(jobid\)/);
    assert.match(sql, /-- where jobname = 'weather-refresh-hourly'/);
    assert.doesNotMatch(sql, /vault\.create_secret/);
    assert.doesNotMatch(sql, /Bearer [A-Za-z0-9_-]{8,}/);
  });

  it("keeps the GitHub workflow as a slow fallback and names pg_cron as primary", () => {
    const workflow = read(".github/workflows/weather-refresh.yml");
    assert.match(workflow, /pg_cron is primary/);
    assert.match(workflow, /cron: "0 \*\/6 \* \* \*"/);
    assert.doesNotMatch(workflow, /cron: "0 \*\/3 \* \* \*"/);
    assert.match(workflow, /workflow_dispatch:/);
    assert.match(workflow, /Authorization: Bearer \$WEATHER_CRON_SECRET/);
    assert.match(workflow, /vars\.WEATHER_REFRESH_URL/);
    assert.match(workflow, /exit 1/);
  });
});
