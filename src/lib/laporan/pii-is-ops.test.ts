import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("laporan PII RLS uses is_ops()", () => {
  const sql = read("supabase/migrations/20260914_laporan_pii_is_ops.sql");

  it("is a new migration that only retargets the three PII surfaces", () => {
    assert.match(sql, /laporan_pelapor_select_staff[\s\S]*using \(public\.is_ops\(\)\)/);
    assert.match(sql, /notifikasi_wa_select_staff[\s\S]*using \(public\.is_ops\(\)\)/);
    assert.match(
      sql,
      /laporan_media_select_staff[\s\S]*bucket_id = 'laporan-media' and public\.is_ops\(\)/,
    );
    assert.doesNotMatch(sql, /create or replace function public\.is_ops/i);
    assert.doesNotMatch(sql, /create or replace function public\.is_staff/i);
    assert.doesNotMatch(sql, /on public\.laporan_kejadian|on public\.laporan_penanganan/);
    assert.doesNotMatch(sql, /for insert/i);
    assert.doesNotMatch(sql, /using \(public\.is_staff\(\)\)/);
  });

  it("does not edit older laporan or is_ops migrations", () => {
    const oldProd = read("supabase/migrations/20260826_laporan_production.sql");
    const oldHarden = read("supabase/migrations/20260902_harden_laporan_rls.sql");
    const oldOps = read("supabase/migrations/20260907_sik_operasional.sql");
    assert.match(oldProd, /using \(public\.is_staff\(\)\)/);
    assert.match(oldHarden, /using \(public\.is_staff\(\)\)/);
    assert.match(
      oldOps,
      /p\.role in \('super_admin', 'admin', 'admin_provinsi', 'admin_kabkota'\)/,
    );
  });
});
