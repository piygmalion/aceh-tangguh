import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  delayMinutes,
  formatWibHm,
  isTatonasRefreshTimeout,
  scheduledCronLines,
} from "./pantau-cron-repo.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");

function read(rel) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("jadwal cron yang di-commit", () => {
  it("memindahkan Daily Brief ke pg_cron dan membiarkan DIBI pada hari kerja", () => {
    assert.deepEqual(scheduledCronLines(read(".github/workflows/daily-brief.yml")), []);
    assert.match(read(".github/workflows/daily-brief.yml"), /workflow_dispatch:/);
    assert.match(read("supabase/migrations/20261111_daily_brief_pg_cron.sql"), /'0 0 \* \* \*'/);
    assert.deepEqual(scheduledCronLines(read(".github/workflows/dibi-refresh.yml")), ["0 2 * * 1-5"]);
    assert.deepEqual(scheduledCronLines(read(".github/workflows/laporan-wa.yml")), ["0 1 * * 1-5"]);
  });

  it("mencatat batas waktu Tatonas di sumber, tanpa mengubah rute", () => {
    const client = read("src/lib/tatonas/client.ts");
    const route = read("src/app/api/cron/overlay-live/route.ts");
    assert.match(client, /AbortSignal\.timeout\(20_000\)/);
    assert.match(route, /maxDuration = 60/);
    assert.match(route, /revalidateTag\("peringatan-tatonas"\)/);
  });
});

describe("stempel WIB dari jalan yang diamati", () => {
  it("menaruh Daily Brief 10 Nov 2026 pada 13.51 WIB, telat 411 menit", () => {
    assert.equal(formatWibHm("2026-11-10T06:51:29Z"), "13.51");
    assert.equal(delayMinutes("2026-11-10T00:00:00Z", "2026-11-10T06:51:29Z"), 411);
    assert.equal(formatWibHm("2026-11-03T06:08:30Z"), "13.08");
    assert.equal(delayMinutes("2026-11-03T00:00:00Z", "2026-11-03T06:08:30Z"), 369);
  });

  it("menaruh timeout Tatonas pada 00.15 WIB", () => {
    assert.equal(formatWibHm("2026-11-10T17:15:25.467Z"), "00.15");
  });
});

describe("penggolong log Tatonas", () => {
  it("mengenali timeout lapisan dan menolak 404 serta teks lain", () => {
    const timeout =
      "[overlay-live/refresh] tatonasStations DOMException [TimeoutError]: The operation was aborted due to timeout";
    const notFound =
      "[overlay-live/refresh] tatonasStations Error: Tatonas https://tatonas.co.id/api/server-time 404";
    assert.equal(isTatonasRefreshTimeout(timeout), true);
    assert.equal(isTatonasRefreshTimeout(notFound), false);
    assert.equal(isTatonasRefreshTimeout("tatonasStations TimeoutError"), false);
    assert.equal(isTatonasRefreshTimeout(""), false);
  });
});
