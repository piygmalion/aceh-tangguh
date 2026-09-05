import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const MIGRATION = join(ROOT, "supabase/migrations/20260920_revoke_definer_write_rpcs.sql");

describe("revoke RPC definer tulis (AN-16)", () => {
  it("migrasi 20260920 mencabut dua RPC tulis dari Data API", () => {
    assert.equal(existsSync(MIGRATION), true, "20260920_revoke_definer_write_rpcs.sql harus ada");
    const sql = readFileSync(MIGRATION, "utf8").toLowerCase();
    assert.equal(sql.includes("next_laporan_nomor"), true);
    assert.equal(sql.includes("upsert_marker_features"), true);
    assert.equal(sql.includes("revoke all"), true);
    assert.equal(sql.includes("anon"), true);
    assert.equal(sql.includes("authenticated"), true);
    assert.equal(sql.includes("service_role"), true);
    assert.equal(sql.includes("grant execute"), true);
  });

  it("migrasi 20260920 tidak mengganti isi fungsi dan tidak merevoke fungsi peran", () => {
    const sql = readFileSync(MIGRATION, "utf8").toLowerCase();
    assert.equal(
      sql.includes("create or replace function"),
      false,
      "migrasi tidak boleh CREATE OR REPLACE fungsi"
    );
    const roleRevoke = /revoke\s+all\s+on\s+function\s+public\.(is_staff|is_ops|is_super_admin|is_walidata|staff_kode_)/i;
    assert.equal(roleRevoke.test(sql), false, "migrasi tidak boleh REVOKE fungsi peran");
  });
});
