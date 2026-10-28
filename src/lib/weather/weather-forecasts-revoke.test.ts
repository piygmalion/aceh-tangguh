import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const MIGRATION = "supabase/migrations/20261028_weather_forecasts_revoke.sql";
const REVOKE =
  "revoke truncate, references, trigger on table public.weather_forecasts from anon, authenticated;";
const ROLLBACK =
  "grant truncate, references, trigger on table public.weather_forecasts to anon, authenticated;";

function readMigration(): string {
  return readFileSync(path.join(process.cwd(), MIGRATION), "utf8");
}

function uncommented(sql: string): string {
  return sql
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("--"))
    .join("\n");
}

describe("BE-82 weather_forecasts privilege revoke", () => {
  it("revokes only truncate, references, and trigger on public.weather_forecasts", () => {
    const sql = readMigration();
    const live = uncommented(sql);
    assert.equal(live, REVOKE);

    const tables = Array.from(sql.matchAll(/public\.([a-z0-9_]+)/g), (match) => match[1]);
    assert.deepEqual(Array.from(new Set(tables)), ["weather_forecasts"]);
    assert.doesNotMatch(live, /\bselect\b/i);
    assert.doesNotMatch(sql, /revoke\s+select\b/i);

    const grantLines = sql.split("\n").filter((line) => /\bgrant\b/i.test(line));
    assert.deepEqual(
      grantLines.map((line) => line.trim()),
      [`-- ${ROLLBACK}`],
    );
  });
});
