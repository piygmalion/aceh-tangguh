import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { dailyBriefSudahDikirim } from "./service";

const ROOT = process.cwd();
const MIGRATION = "supabase/migrations/20261111_daily_brief_pg_cron.sql";

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function sqlTanpaKomentar(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

describe("klaim kirim Daily Brief", () => {
  it("skip bila stempel sudah ada, kecuali force", () => {
    assert.equal(dailyBriefSudahDikirim("2026-11-10T00:00:00.000Z", false), true);
    assert.equal(dailyBriefSudahDikirim(null, false), false);
    assert.equal(dailyBriefSudahDikirim("2026-11-10T00:00:00.000Z", true), false);
  });
});

describe("migrasi pg_cron Daily Brief", () => {
  it("menjadwalkan job baru tanpa mengulang ekstensi atau grant cron", () => {
    const sql = sqlTanpaKomentar(read(MIGRATION));
    assert.match(sql, /daily-brief-daily/);
    assert.match(sql, /'0 0 \* \* \*'/);
    assert.match(sql, /https:\/\/aceh-tangguh\.vercel\.app\/api\/cron\/daily-brief/);
    assert.match(sql, /net\.http_post\(/);
    assert.match(sql, /daily_brief_cron_secret/);
    assert.match(sql, /btrim\(decrypted_secret\)/);
    assert.match(sql, /timeout_milliseconds := 70000/);
    assert.match(sql, /if not exists/);
    assert.match(sql, /return;/);

    const guardAt = sql.indexOf("if not exists");
    const postAt = sql.indexOf("perform net.http_post");
    assert.ok(guardAt >= 0 && postAt > guardAt);

    assert.doesNotMatch(sql, /create extension/i);
    assert.doesNotMatch(sql, /grant usage on schema cron/i);
    assert.doesNotMatch(sql, /grant all privileges/i);
    assert.doesNotMatch(sql, /vault\.create_secret/);
    assert.doesNotMatch(sql, /Bearer [A-Za-z0-9_-]{8,}/);
    assert.doesNotMatch(sql, /OVERLAY_CRON_SECRET|WEATHER_CRON_SECRET/);
  });

  it("service mengunci satu baris per brief_date dan mengklaim stempel kosong", () => {
    const service = read("src/lib/daily-brief/service.ts");
    const schema = read("supabase/migrations/20260926_daily_brief.sql");
    assert.match(service, /onConflict: "brief_date"/);
    assert.match(service, /\.is\("whatsapp_enqueued_at", null\)/);
    assert.match(schema, /daily_briefs_date_unique unique \(brief_date\)/);
  });
});
