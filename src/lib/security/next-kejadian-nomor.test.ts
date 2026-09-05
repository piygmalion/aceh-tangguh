import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const MIGRATION = join(ROOT, "supabase/migrations/20260921_revoke_next_kejadian_nomor_anon.sql");
const REPORTS = join(ROOT, "src/app/api/admin/reports/route.ts");
const RESOURCE = join(ROOT, "src/app/api/sik/resource/route.ts");

describe("tindak lanjut review pasca-G13", () => {
  it("migrasi 20260921 mencabut next_kejadian_nomor dari anon, bukan authenticated", () => {
    assert.equal(existsSync(MIGRATION), true, "20260921_revoke_next_kejadian_nomor_anon.sql harus ada");
    const sql = readFileSync(MIGRATION, "utf8").toLowerCase();
    assert.equal(sql.includes("next_kejadian_nomor"), true);
    assert.equal(sql.includes("revoke all"), true);
    assert.equal(sql.includes("anon"), true);
    assert.equal(sql.includes("authenticated"), true);
    assert.equal(sql.includes("service_role"), true);
    assert.equal(sql.includes("create or replace function"), false);
    assert.equal(
      /revoke\s+all\s+on\s+function\s+public\.(is_staff|is_ops)/i.test(sql),
      false
    );
  });

  it("GET/PATCH /api/admin/reports memakai requireModuleApi moderasi", () => {
    const source = readFileSync(REPORTS, "utf8");
    assert.equal(source.includes('requireModuleApi("moderasi")'), true);
    assert.equal(source.includes("requireStaffApi"), false);
  });

  it("GET /api/sik/resource memakai sanitizeSearch", () => {
    const source = readFileSync(RESOURCE, "utf8");
    assert.equal(source.includes("sanitizeSearch"), true);
  });
});
