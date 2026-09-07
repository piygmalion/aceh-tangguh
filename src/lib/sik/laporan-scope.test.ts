import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { AdminProfile } from "../auth/types";
import type { AdminRole } from "../supabase/types";
import {
  authorizeLaporanList,
  authorizeLegacyReports,
  matchesLaporanKabScope,
} from "./laporan-scope";
import { ACEH_KABUPATEN } from "./juklak";
import { authorizeStaffInvite, catalogStaffSlots, isDuplicateKabSlot } from "./staff-invite";

const KAB_A = "1101";
const KAB_B = "1171";

function staff(role: AdminRole, wilayah?: { kode?: string | null; nama?: string | null }): AdminProfile {
  return {
    userId: "u-an23",
    email: "an23@example.test",
    role,
    displayName: role,
    createdAt: "2026-01-01T00:00:00.000Z",
    kodeKabupaten: wilayah?.kode ?? null,
    kabupaten: wilayah?.nama ?? null,
    kodeKecamatan: null,
    kecamatan: null,
    kodeDesaKelurahan: null,
    desa: null,
  };
}

describe("AN-22 / AN-23 moderasi + staf kab", () => {
  it("admin_kabkota tanpa profil ditolak list laporan", () => {
    const empty = staff("admin_kabkota", { kode: null, nama: null });
    const denied = authorizeLaporanList(empty);
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.status, 403);
    assert.equal(authorizeLaporanList(staff("admin_provinsi")).ok, true);
  });

  it("kab A tidak lolos laporan kab B; nama katalog lolos", () => {
    const kab = staff("admin_kabkota", { kode: KAB_A });
    assert.equal(matchesLaporanKabScope(kab, "Banda Aceh"), false);
    assert.equal(matchesLaporanKabScope(kab, KAB_B), false);
    assert.equal(matchesLaporanKabScope(kab, "Aceh Selatan"), true);
    assert.equal(matchesLaporanKabScope(kab, KAB_A), true);
    assert.equal(matchesLaporanKabScope(kab, null), false);
  });

  it("reports warisan 403 untuk kab; provinsi lolos", () => {
    const denied = authorizeLegacyReports(staff("admin_kabkota", { kode: KAB_A }));
    assert.equal(denied.ok, false);
    assert.equal(authorizeLegacyReports(staff("admin_provinsi")).ok, true);
    assert.equal(authorizeLegacyReports(staff("super_admin")).ok, true);
  });

  it("undangan kab wajib email dan kode katalog", () => {
    const missingEmail = authorizeStaffInvite({ kodeKabupaten: KAB_A });
    assert.equal(missingEmail.ok, false);
    if (!missingEmail.ok) assert.equal(missingEmail.status, 400);

    const badKab = authorizeStaffInvite({ email: "staf@example.test", kodeKabupaten: "9999" });
    assert.equal(badKab.ok, false);

    const ok = authorizeStaffInvite({
      email: " Staf@Example.Test ",
      displayName: "BPBD Aceh Selatan",
      kodeKabupaten: KAB_A,
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.invite.email, "staf@example.test");
      assert.equal(ok.invite.kodeKabupaten, KAB_A);
      assert.equal(ok.invite.kabupaten, "Aceh Selatan");
      assert.equal(ok.invite.role, "admin_kabkota");
    }
  });

  it("23 slot katalog; duplikat kode ditolak", () => {
    assert.equal(ACEH_KABUPATEN.length, 23);
    const slots = catalogStaffSlots([{ kode_kabupaten: KAB_A }]);
    assert.equal(slots.length, 23);
    assert.equal(slots.find((row) => row.kode === KAB_A)?.occupied, true);
    assert.equal(slots.find((row) => row.kode === KAB_B)?.occupied, false);
    assert.equal(isDuplicateKabSlot([KAB_A], KAB_A), true);
    assert.equal(isDuplicateKabSlot([KAB_A], KAB_B), false);
  });

  it("rute laporan/reports/users memakai helper AN-22", () => {
    const laporan = readFileSync(join(process.cwd(), "src/app/api/admin/laporan/route.ts"), "utf8");
    assert.match(laporan, /authorizeLaporanList/);
    assert.match(laporan, /matchesLaporanKabScope/);
    const reports = readFileSync(join(process.cwd(), "src/app/api/admin/reports/route.ts"), "utf8");
    assert.match(reports, /authorizeLegacyReports/);
    const users = readFileSync(join(process.cwd(), "src/app/api/admin/users/route.ts"), "utf8");
    assert.match(users, /requireSuperAdminApi/);
    assert.match(users, /authorizeStaffCatalogInvite/);
    assert.match(users, /inviteUserByEmail/);
    assert.doesNotMatch(users, /password/);
    const manage = readFileSync(join(process.cwd(), "src/lib/sik/staff-manage.ts"), "utf8");
    assert.match(manage, /authorizeStaffInvite/);
  });

  it("halaman staf super_admin; moderasi menyembunyikan reports warisan untuk kab", () => {
    const staf = readFileSync(
      join(process.cwd(), "src/app/[locale]/admin/(console)/staf/layout.tsx"),
      "utf8",
    );
    assert.match(staf, /requireSuperAdminPage/);
    const moderasi = readFileSync(
      join(process.cwd(), "src/app/[locale]/admin/(console)/moderasi/page.tsx"),
      "utf8",
    );
    assert.match(moderasi, /hideLegacy/);
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260923_admin_kabkota_kode_unique.sql"),
      "utf8",
    );
    assert.match(sql, /idx_admin_kabkota_kode/);
    assert.match(sql, /admin_kabkota/);
    assert.equal(/revoke\s+all\s+on\s+function\s+public\.(is_staff|is_ops)/i.test(sql), false);
  });
});
