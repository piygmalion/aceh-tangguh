import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const MIGRATION = join(ROOT, "supabase/migrations/20260926_daily_brief.sql");

describe("DATA-24 daily brief migration", () => {
  it("creates three new tables without touching users or notifikasi_wa", () => {
    assert.equal(existsSync(MIGRATION), true);
    const sql = readFileSync(MIGRATION, "utf8").toLowerCase();
    assert.match(sql, /create table if not exists public\.daily_brief_subscribers/);
    assert.match(sql, /create table if not exists public\.daily_briefs/);
    assert.match(sql, /create table if not exists public\.daily_brief_message_logs/);
    assert.match(sql, /phone_enc/);
    assert.match(sql, /brief_date date not null/);
    assert.match(sql, /status in \('active', 'inactive', 'unsubscribed'\)/);
    assert.match(sql, /enable row level security/);
    assert.match(sql, /revoke all on public\.daily_brief_subscribers from public, anon/);
    assert.match(sql, /grant select on public\.daily_briefs to anon, authenticated/);
    assert.equal(sql.includes("create table") && sql.includes("public.users"), false);
    assert.equal(sql.includes("alter table public.notifikasi_wa"), false);
    assert.equal(sql.includes("purge_expired_overlay_rows"), false);
    assert.equal(sql.includes("20260910_overlay_layers"), false);
  });
});
