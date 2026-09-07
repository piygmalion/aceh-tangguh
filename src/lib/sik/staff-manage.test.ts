import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminProfile } from "../auth/types";
import type { AdminRole } from "../supabase/types";
import { canAccessModule, overlayFromRows, roleModuleKey } from "./roles";
import {
  authorizeLastSuperGuard,
  authorizeRoleMatrixPatch,
  authorizeStaffCatalogInvite,
  isUserSuspended,
} from "./staff-manage";

function staff(role: AdminRole, extra?: Partial<AdminProfile>): AdminProfile {
  return {
    userId: extra?.userId ?? "u-actor",
    email: extra?.email ?? "actor@example.test",
    role,
    displayName: role,
    createdAt: "2026-01-01T00:00:00.000Z",
    kodeKabupaten: extra?.kodeKabupaten ?? null,
    kabupaten: extra?.kabupaten ?? null,
    kodeKecamatan: extra?.kodeKecamatan ?? null,
    kecamatan: extra?.kecamatan ?? null,
    kodeDesaKelurahan: extra?.kodeDesaKelurahan ?? null,
    desa: extra?.desa ?? null,
  };
}

describe("AN-41 staff catalog invite", () => {
  it("rejects missing email and unknown role", () => {
    const noEmail = authorizeStaffCatalogInvite({
      email: "",
      role: "admin_provinsi",
    });
    assert.equal(noEmail.ok, false);
    if (!noEmail.ok) assert.equal(noEmail.error, "email_required");

    const badRole = authorizeStaffCatalogInvite({
      email: "ops@bpba.test",
      role: "admin_moderasi" as AdminRole,
    });
    assert.equal(badRole.ok, false);
    if (!badRole.ok) assert.equal(badRole.error, "role_required");
  });

  it("invites admin_provinsi without wilayah", () => {
    const decided = authorizeStaffCatalogInvite({
      email: "prov@bpba.test",
      displayName: "Prov",
      role: "admin",
    });
    assert.equal(decided.ok, true);
    if (decided.ok) {
      assert.equal(decided.invite.role, "admin_provinsi");
      assert.equal(decided.invite.kodeKabupaten, null);
      assert.equal(decided.invite.kodeDesaKelurahan, null);
    }
  });

  it("requires catalog kabupaten for admin_kabkota", () => {
    const missing = authorizeStaffCatalogInvite({
      email: "kab@bpbd.test",
      role: "admin_kabkota",
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.error, "kabupaten_required");

    const ok = authorizeStaffCatalogInvite({
      email: "kab@bpbd.test",
      role: "admin_kabkota",
      kodeKabupaten: "1101",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.invite.role, "admin_kabkota");
      assert.equal(ok.invite.kodeKabupaten, "1101");
      assert.equal(ok.invite.kabupaten, "Aceh Selatan");
    }
  });

  it("requires existing Aceh desa kode for admin_desa", () => {
    const format = authorizeStaffCatalogInvite({
      email: "desa@gampong.test",
      role: "admin_desa",
      kodeDesaKelurahan: "1201010001",
    });
    assert.equal(format.ok, false);
    if (!format.ok) assert.equal(format.error, "desa_required");

    const missing = authorizeStaffCatalogInvite({
      email: "desa@gampong.test",
      role: "admin_desa",
      kodeDesaKelurahan: "1101010001",
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.error, "desa_not_found");

    const ok = authorizeStaffCatalogInvite({
      email: "desa@gampong.test",
      role: "admin_desa",
      kodeDesaKelurahan: "1101010001",
      desaLookup: { nama: "Bakongan", kabupaten: "Aceh Selatan", kecamatan: "Bakongan" },
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.invite.kodeDesaKelurahan, "1101010001");
      assert.equal(ok.invite.desa, "Bakongan");
    }
  });
});

describe("AN-41 last-super and self guards", () => {
  it("rejects delete/suspend/demote of self or last super_admin", () => {
    const self = authorizeLastSuperGuard({
      actorId: "u-1",
      targetId: "u-1",
      targetRole: "super_admin",
      superAdminCount: 2,
      action: "delete",
    });
    assert.equal(self.ok, false);
    if (!self.ok) {
      assert.equal(self.status, 409);
      assert.equal(self.error, "self");
    }

    const last = authorizeLastSuperGuard({
      actorId: "u-1",
      targetId: "u-2",
      targetRole: "super_admin",
      superAdminCount: 1,
      action: "suspend",
    });
    assert.equal(last.ok, false);
    if (!last.ok) assert.equal(last.error, "last_super_admin");

    const demoteLast = authorizeLastSuperGuard({
      actorId: "u-1",
      targetId: "u-2",
      targetRole: "super_admin",
      superAdminCount: 1,
      action: "demote",
    });
    assert.equal(demoteLast.ok, false);

    const ok = authorizeLastSuperGuard({
      actorId: "u-1",
      targetId: "u-2",
      targetRole: "admin_provinsi",
      superAdminCount: 1,
      action: "delete",
    });
    assert.equal(ok.ok, true);
  });
});

describe("AN-41 role matrix and overlay", () => {
  it("rejects patching super_admin matrix rows", () => {
    const locked = authorizeRoleMatrixPatch({ role: "super_admin", module: "moderasi", allowed: false });
    assert.equal(locked.ok, false);
    if (!locked.ok) assert.equal(locked.error, "super_locked");

    const ok = authorizeRoleMatrixPatch({ role: "admin_kabkota", module: "master", allowed: true });
    assert.equal(ok.ok, true);
  });

  it("canAccessModule follows overlay and keeps hardcoded fallback", () => {
    const kab = staff("admin_kabkota", { kodeKabupaten: "1101" });
    assert.equal(canAccessModule(kab, "master"), false);
    const overlay = overlayFromRows([
      { role: "admin_kabkota", module: "master", allowed: true },
    ]);
    assert.equal(canAccessModule(kab, "master", overlay), true);
    assert.equal(canAccessModule(kab, "moderasi", overlay), true);
    assert.equal(roleModuleKey("admin", "dailyBrief"), "admin_provinsi:dailyBrief");
    const superAdmin = staff("super_admin");
    const denySuper = overlayFromRows([{ role: "super_admin", module: "cms", allowed: false }]);
    assert.equal(canAccessModule(superAdmin, "cms", denySuper), true);
  });

  it("treats future banned_until as suspended", () => {
    assert.equal(isUserSuspended("2099-01-01T00:00:00.000Z"), true);
    assert.equal(isUserSuspended("2000-01-01T00:00:00.000Z"), false);
    assert.equal(isUserSuspended(null), false);
  });
});
