import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const MIGRATION = "supabase/migrations/20261028_weather_forecasts.sql";
const ROUTE = "src/app/api/weather/refresh/route.ts";
const READER = "src/lib/weather/service.ts";
const SCRIPT = "scripts/refresh-weather-cache.mjs";

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

/** Keys of the object passed to `.upsert({ ... })` on `weather_forecasts`. */
function refreshUpsertKeys(route: string): string[] {
  const marker = '.from("weather_forecasts").upsert({';
  const at = route.indexOf(marker);
  assert.ok(at >= 0, "refresh route upsert call missing");
  const body = route.slice(at + marker.length);
  const end = body.indexOf("});");
  assert.ok(end > 0, "refresh route upsert call not closed");
  const keys = Array.from(
    body.slice(0, end).matchAll(/^\s*([a-z0-9_]+)\s*:/gm),
    (match) => match[1],
  );
  assert.ok(keys.length > 0, "refresh route upsert has no fields");
  return keys;
}

function migrationColumns(sql: string): { name: string; definition: string }[] {
  const match = sql.match(
    /create table if not exists public\.weather_forecasts\s*\(([\s\S]*?)\n\);/i,
  );
  assert.ok(match, "create table weather_forecasts block missing");
  const columns: { name: string; definition: string }[] = [];
  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--")) continue;
    const withoutComma = trimmed.replace(/,\s*$/, "");
    const parsed = withoutComma.match(/^([a-z0-9_]+)\s+(.+)$/);
    assert.ok(parsed, `unparsed column line: ${trimmed}`);
    columns.push({ name: parsed[1], definition: parsed[2] });
  }
  return columns;
}

describe("BE-80 weather_forecasts migration", () => {
  it("column set matches the fields the refresh route upserts", () => {
    const keys = refreshUpsertKeys(read(ROUTE));
    const columns = migrationColumns(read(MIGRATION));
    assert.deepEqual(
      columns.map((column) => column.name),
      keys,
    );
    const byName = new Map(columns.map((column) => [column.name, column.definition]));
    assert.equal(byName.get("kabupaten_kota"), "text primary key");
    assert.equal(byName.get("adm4_code"), "text");
    assert.equal(byName.get("payload"), "jsonb not null");
    assert.equal(byName.get("source"), "text not null");
    assert.equal(byName.get("fetched_at"), "timestamptz not null");
    assert.equal(byName.get("expires_at"), "timestamptz not null");
    assert.equal(byName.get("updated_at"), "timestamptz not null default now()");
  });

  it("uses kabupaten_kota as the upsert conflict target and indexes expires_at", () => {
    const route = read(ROUTE);
    const marker = '.from("weather_forecasts").upsert({';
    const call = route.slice(route.indexOf(marker), route.indexOf("});", route.indexOf(marker)) + 3);
    assert.equal(call.includes("onConflict"), false);

    const script = read(SCRIPT);
    assert.match(script, /onConflict:\s*"kabupaten_kota"/);

    const sql = read(MIGRATION);
    assert.match(sql, /kabupaten_kota text primary key/);
    assert.match(
      sql,
      /create index if not exists weather_forecasts_expires_idx\s+on public\.weather_forecasts \(expires_at\);/,
    );
  });

  it("columns selected by the cache reader are a subset of the migration", () => {
    const names = new Set(migrationColumns(read(MIGRATION)).map((column) => column.name));
    const reader = read(READER);
    const select = reader.match(/\.from\("weather_forecasts"\)\s*\.select\("([^"]+)"\)/);
    assert.ok(select, "reader select missing");
    for (const column of select[1].split(",").map((part) => part.trim())) {
      assert.ok(names.has(column), `reader selects ${column} but migration has no such column`);
    }
    assert.match(reader, /\.order\("kabupaten_kota"\)/);
    assert.ok(names.has("expires_at"));
  });

  it("enables RLS with public select only and guarded policies", () => {
    const sql = read(MIGRATION);
    assert.match(sql, /alter table public\.weather_forecasts enable row level security;/);
    assert.match(sql, /policyname = 'weather_forecasts_select'/);
    assert.match(sql, /create policy weather_forecasts_select/);
    assert.match(sql, /for select\s+to anon, authenticated\s+using \(true\);/);
    assert.doesNotMatch(sql, /for\s+(insert|update|delete|all)\b/i);
    assert.match(
      sql,
      /revoke insert, update, delete on public\.weather_forecasts from public, anon, authenticated;/,
    );
    assert.match(sql, /grant select on public\.weather_forecasts to anon, authenticated;/);
    assert.match(
      sql,
      /grant select, insert, update, delete on public\.weather_forecasts to service_role;/,
    );
    assert.match(sql, /drop table if exists public\.weather_forecasts;/);
    assert.match(sql, /select count\(\*\)/);
    assert.doesNotMatch(sql, /pg_cron|cron\.schedule/);
  });
});
