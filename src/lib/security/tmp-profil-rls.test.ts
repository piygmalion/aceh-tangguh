import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const MIGRATION = join(ROOT, "supabase/migrations/20260919_tmp_profil_sheet_rls.sql");
const TABLE = "_tmp_profil_sheet_apply";

describe("kunci staging profil (AN-15)", () => {
  it("migrasi 20260919 mengunci _tmp_profil_sheet_apply tanpa kebijakan Data API", () => {
    assert.equal(existsSync(MIGRATION), true, "20260919_tmp_profil_sheet_rls.sql harus ada");
    const sql = readFileSync(MIGRATION, "utf8").toLowerCase();
    assert.equal(sql.includes(TABLE), true, "migrasi harus merujuk tabel staging");
    assert.equal(
      sql.includes("enable row level security"),
      true,
      "migrasi harus ENABLE ROW LEVEL SECURITY"
    );
    assert.equal(sql.includes("revoke all"), true, "migrasi harus REVOKE ALL");
    assert.equal(sql.includes("anon"), true, "migrasi harus mencabut anon");
    assert.equal(sql.includes("authenticated"), true, "migrasi harus mencabut authenticated");
    assert.equal(
      sql.includes("create policy"),
      false,
      "migrasi tidak boleh menambah CREATE POLICY"
    );
    assert.equal(sql.includes("drop table"), false, "migrasi tidak boleh DROP TABLE");
    assert.equal(
      /delete\s+from\s+public\._tmp_profil_sheet_apply/.test(sql),
      false,
      "migrasi tidak boleh DELETE baris staging"
    );
  });

  it("migrasi 20260919 mencabut EXECUTE purge_expired_overlay_rows dari anon", () => {
    const sql = readFileSync(MIGRATION, "utf8").toLowerCase();
    assert.equal(
      sql.includes("purge_expired_overlay_rows"),
      true,
      "migrasi harus merujuk purge_expired_overlay_rows"
    );
  });

  it("src/ tidak merujuk _tmp_profil_sheet_apply", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const next = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(next);
          continue;
        }
        if (!/\.(ts|tsx|js|mjs)$/.test(entry.name)) continue;
        if (/\.test\.(ts|tsx|js|mjs)$/.test(entry.name)) continue;
        const text = readFileSync(next, "utf8");
        if (text.includes(TABLE)) offenders.push(next.slice(ROOT.length + 1));
      }
    };
    walk(join(ROOT, "src"));
    assert.deepEqual(offenders, [], `src merujuk staging: ${offenders.join(", ")}`);
  });
});
