import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { AdminProfile } from "../auth/types";
import type { AdminRole } from "../supabase/types";
import { kabScopeEqualsRow } from "./kab-scope";
import {
  authorizeDampakRead,
  authorizeKejadianDelete,
  canAccessModule,
  canLockStatis,
  matchesKabScope,
} from "./roles";

const KAB_A = "1101";
const KAB_B = "1171";

function staff(role: AdminRole, wilayah?: { kode?: string | null; nama?: string | null }): AdminProfile {
  return {
    userId: "u-an1",
    email: "an1@example.test",
    role,
    displayName: role,
    createdAt: "2026-01-01T00:00:00.000Z",
    kodeKabupaten: wilayah?.kode ?? null,
    kabupaten: wilayah?.nama ?? null,
    kodeKecamatan: null,
    kecamatan: null,
    kodeDesaKelurahan: role === "admin_desa" ? "1101010001" : null,
    desa: null,
  };
}

describe("AN-1 authorization matrix", () => {
  it("rejects DELETE of another kabupaten kejadian (P0)", () => {
    const actor = staff("admin_kabkota", { kode: KAB_A });
    const kejadianB = { kode_kabupaten: KAB_B, kabupaten: "Banda Aceh", fase_data: "dinamis" };
    assert.equal(matchesKabScope(actor, kejadianB), false);
    const decision = authorizeKejadianDelete(actor, kejadianB);
    assert.equal(decision.ok, false);
    if (!decision.ok) {
      assert.equal(decision.status, 403);
      assert.equal(decision.error, "forbidden");
    }
  });

  it("allows DELETE of own kabupaten kejadian when fase is not locked", () => {
    const actor = staff("admin_kabkota", { kode: KAB_A });
    for (const fase of ["dinamis", "diajukan"] as const) {
      const kejadianA = { kode_kabupaten: KAB_A, kabupaten: "Aceh Selatan", fase_data: fase };
      assert.equal(matchesKabScope(actor, kejadianA), true);
      assert.equal(authorizeKejadianDelete(actor, kejadianA).ok, true);
    }
  });

  it("returns 409 on DELETE of locked-static unless canLockStatis", () => {
    const kab = staff("admin_kabkota", { kode: KAB_A });
    const locked = { kode_kabupaten: KAB_A, kabupaten: "Aceh Selatan", fase_data: "statis" };
    assert.equal(canLockStatis(kab), false);
    const denied = authorizeKejadianDelete(kab, locked);
    assert.equal(denied.ok, false);
    if (!denied.ok) {
      assert.equal(denied.status, 409);
    }

    const provinsi = staff("admin_provinsi");
    assert.equal(canLockStatis(provinsi), true);
    assert.equal(authorizeKejadianDelete(provinsi, locked).ok, true);

    const legacyAdmin = staff("admin");
    assert.equal(canLockStatis(legacyAdmin), true);
    assert.equal(authorizeKejadianDelete(legacyAdmin, locked).ok, true);
  });

  it("rejects GET dampak for another kabupaten kejadian (P0)", () => {
    const actor = staff("admin_kabkota", { kode: KAB_A });
    const headerB = { kode_kabupaten: KAB_B, kabupaten: "Banda Aceh" };
    assert.equal(matchesKabScope(actor, headerB), false);
    const decision = authorizeDampakRead(actor, headerB);
    assert.equal(decision.ok, false);
    if (!decision.ok) {
      assert.equal(decision.status, 403);
    }

    const headerA = { kode_kabupaten: KAB_A, kabupaten: "Aceh Selatan" };
    assert.equal(matchesKabScope(actor, headerA), true);
    assert.equal(authorizeDampakRead(actor, headerA).ok, true);
  });

  it("admin_kabkota without kabupaten profile is fail-closed (AN-20)", () => {
    const empty = staff("admin_kabkota", { kode: null, nama: null });
    const rowA = { kode_kabupaten: KAB_A, kabupaten: "Aceh Selatan", fase_data: "dinamis" };
    assert.equal(matchesKabScope(empty, rowA), false);
    assert.equal(authorizeDampakRead(empty, rowA).ok, false);
    const denied = authorizeKejadianDelete(empty, rowA);
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.status, 403);
    assert.equal(matchesKabScope(staff("admin_provinsi"), rowA), true);
  });

  it("kab helper is exact match only — 1114 does not equal 11.16", () => {
    assert.equal(
      kabScopeEqualsRow("1114", { kode_kabupaten: "1114", kabupaten: "Aceh Tamiang" }),
      true,
    );
    assert.equal(
      kabScopeEqualsRow("1114", { kode_kabupaten: "11.16", kabupaten: "Aceh Tamiang" }),
      false,
    );
    const actor = staff("admin_kabkota", { kode: "1114", nama: "Aceh Tamiang" });
    assert.equal(
      matchesKabScope(actor, { kode_kabupaten: "11.16", kabupaten: "Aceh Tamiang" }),
      false,
    );
  });

  it("denies moderasi (GET laporan PII) to admin_desa and penilai_pkd", () => {
    assert.equal(canAccessModule(staff("admin_desa"), "moderasi"), false);
    assert.equal(canAccessModule(staff("penilai_pkd"), "moderasi"), false);
  });

  it("allows moderasi (GET laporan PII) to admin_provinsi", () => {
    assert.equal(canAccessModule(staff("admin_provinsi"), "moderasi"), true);
    assert.equal(canAccessModule(staff("admin"), "moderasi"), true);
  });

  it("denies Daily Brief module to kab and allows provinsi (AN-38)", () => {
    assert.equal(canAccessModule(staff("admin_kabkota", { kode: KAB_A }), "dailyBrief"), false);
    assert.equal(canAccessModule(staff("admin_desa"), "dailyBrief"), false);
    assert.equal(canAccessModule(staff("admin_provinsi"), "dailyBrief"), true);
    assert.equal(canAccessModule(staff("super_admin"), "dailyBrief"), true);
  });
});

describe("AN-1 P0 route guards still present", () => {
  const root = process.cwd();

  it("DELETE kejadian uses authorizeKejadianDelete", () => {
    const src = readFileSync(join(root, "src/app/api/sik/kejadian/[id]/route.ts"), "utf8");
    assert.match(src, /export async function DELETE/);
    assert.match(src, /authorizeKejadianDelete/);
  });

  it("GET dampak uses authorizeDampakRead on the parent header", () => {
    const src = readFileSync(join(root, "src/app/api/sik/kejadian/[id]/dampak/route.ts"), "utf8");
    assert.match(src, /export async function GET/);
    assert.match(src, /authorizeDampakRead/);
  });

  it("GET/POST/PATCH/DELETE /sik/resource memakai authorizeResourceList / authorizeResourceRow", () => {
    const src = readFileSync(join(root, "src/app/api/sik/resource/route.ts"), "utf8");
    assert.match(src, /authorizeResourceList/);
    assert.match(src, /authorizeResourceRow/);
    assert.match(src, /RESOURCE_SCOPE_MODE/);
  });
});
