import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findRepeatedMigrationRisks,
  readMigrationFiles,
  stripSqlComments,
} from "./check-migration-repeats.mjs";

describe("pengulangan migrasi cron", () => {
  it("mengabaikan komentar dan menerima dua grant yang berbeda sekali", () => {
    const sql = stripSqlComments(`
      -- create extension if not exists pg_cron with schema pg_catalog;
      /* grant usage on schema cron to postgres; */
      create extension if not exists "pgcrypto";
      grant usage on schema cron to postgres;
      grant all privileges on all tables in schema cron to postgres;
    `);
    assert.deepEqual(
      findRepeatedMigrationRisks([{ name: "a.sql", sql }]),
      [],
    );
  });

  it("gagal bila ekstensi atau grant schema cron muncul dua kali", () => {
    const errors = findRepeatedMigrationRisks([
      {
        name: "satu.sql",
        sql: `create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;`,
      },
      {
        name: "dua.sql",
        sql: `create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;`,
      },
    ]);
    assert.equal(errors.length, 2);
    assert.match(errors[0], /pg_cron/);
    assert.match(errors[1], /grant schema cron/);
  });

  it("berkas migrasi di repo tidak mengulang ekstensi atau grant schema cron", async () => {
    const files = await readMigrationFiles();
    assert.ok(files.length > 10);
    assert.deepEqual(findRepeatedMigrationRisks(files), []);
  });
});
