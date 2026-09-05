import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { AdminProfile } from "./types";
import { authorizeStaffModule } from "./admin";

function staff(
  role: AdminProfile["role"],
  extra: Partial<AdminProfile> = {}
): AdminProfile {
  return {
    userId: "u-an1-admin",
    email: "an1-admin@example.test",
    role,
    displayName: role,
    createdAt: "2026-01-01T00:00:00.000Z",
    kodeKabupaten: null,
    kabupaten: null,
    kodeKecamatan: null,
    kecamatan: null,
    kodeDesaKelurahan: role === "admin_desa" ? "1101010001" : null,
    desa: null,
    ...extra,
  };
}

describe("AN-1 GET laporan PII = modul moderasi", () => {
  it("rejects admin_desa and penilai_pkd", () => {
    const desa = authorizeStaffModule(staff("admin_desa"), "moderasi");
    assert.equal(desa.ok, false);
    if (!desa.ok) assert.equal(desa.status, 403);

    const pkd = authorizeStaffModule(staff("penilai_pkd"), "moderasi");
    assert.equal(pkd.ok, false);
    if (!pkd.ok) assert.equal(pkd.status, 403);
  });

  it("allows admin_provinsi", () => {
    assert.equal(authorizeStaffModule(staff("admin_provinsi"), "moderasi").ok, true);
    assert.equal(authorizeStaffModule(staff("admin"), "moderasi").ok, true);
  });

  it("denies when profile is missing (guard dropped → this fails)", () => {
    const denied = authorizeStaffModule(null, "moderasi");
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.status, 403);
  });
});

describe("AN-1 laporan route still uses the module gate", () => {
  it("GET laporan calls requireModuleApi(\"moderasi\")", () => {
    const src = readFileSync(join(process.cwd(), "src/app/api/admin/laporan/route.ts"), "utf8");
    assert.match(src, /export async function GET/);
    assert.match(src, /requireModuleApi\(\s*["']moderasi["']\s*\)/);
  });
});
