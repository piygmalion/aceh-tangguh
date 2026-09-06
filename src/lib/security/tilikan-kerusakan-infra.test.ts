import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const MIGRATION = join(ROOT, "supabase/migrations/20260924_tilikan_kerusakan_infra.sql");
const INGEST = join(ROOT, "scripts/ingest-tilikan-kerusakan.mjs");

describe("tilikan_kerusakan_infra migration", () => {
  it("creates a staff-only table with rounded lat/lng unique key", () => {
    assert.equal(existsSync(MIGRATION), true);
    const sql = readFileSync(MIGRATION, "utf8").toLowerCase();
    assert.equal(sql.includes("create table if not exists public.tilikan_kerusakan_infra"), true);
    assert.equal(sql.includes("enable row level security"), true);
    assert.equal(sql.includes("is_staff()"), true);
    assert.equal(sql.includes("revoke all"), true);
    assert.equal(sql.includes("from public, anon"), true);
    assert.equal(sql.includes("grant select, insert, update, delete"), true);
    assert.equal(sql.includes("to authenticated"), true);
    assert.equal(sql.includes("round(latitude::numeric, 5)"), true);
    assert.equal(sql.includes("round(longitude::numeric, 5)"), true);
    assert.equal(sql.includes("jenis in ('jalan', 'jembatan')"), true);
    assert.equal(sql.includes("upsert_marker_features"), false);
    assert.equal(sql.includes("create table") && sql.includes("tempat_pengungsian"), false);
    assert.equal(sql.includes("create table") && sql.includes("kejadian_korban"), false);
  });

  it("ingest script does not call upsert_marker_features", () => {
    assert.equal(existsSync(INGEST), true);
    const src = readFileSync(INGEST, "utf8");
    assert.equal(src.includes('rpc("upsert_marker_features"'), false);
    assert.equal(src.includes("Never calls upsert_marker_features"), true);
    assert.equal(src.includes("tempat_pengungsian"), true);
  });
});
