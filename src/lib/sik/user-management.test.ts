import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("AN-42 User Management katalog", () => {
  it("users and roles routes are super_admin only with origin on mutations", () => {
    const users = read("src/app/api/admin/users/route.ts");
    const item = read("src/app/api/admin/users/[id]/route.ts");
    const roles = read("src/app/api/admin/roles/route.ts");
    assert.match(users, /requireSuperAdminApi/);
    assert.match(users, /rejectCrossOrigin/);
    assert.match(users, /inviteUserByEmail/);
    assert.match(users, /redirectTo/);
    assert.match(users, /emailConfirmed/);
    assert.doesNotMatch(users, /password/);
    const resend = read("src/app/api/admin/users/[id]/resend-invite/route.ts");
    assert.match(resend, /requireSuperAdminApi/);
    assert.match(resend, /rejectCrossOrigin/);
    assert.match(resend, /already_confirmed/);
    const confirm = read("src/app/auth/confirm/route.ts");
    assert.match(confirm, /verifyOtp/);
    assert.match(confirm, /token_hash/);
    assert.match(confirm, /parseInviteOtpType/);
    assert.doesNotMatch(confirm, /signInWithOtp/);
    const mw = read("src/middleware.ts");
    assert.match(mw, /pathname.startsWith\("\/auth"\)/);
    assert.match(item, /export async function PATCH/);
    assert.match(item, /export async function DELETE/);
    assert.match(item, /authorizeLastSuperGuard/);
    assert.match(item, /ban_duration/);
    assert.match(roles, /authorizeRoleMatrixPatch/);
    assert.match(roles, /rejectCrossOrigin/);
  });

  it("does not revoke staff SQL helpers and keeps 23-slot unique index", () => {
    const sql = read("supabase/migrations/20260927_admin_role_modules.sql");
    assert.match(sql, /admin_role_modules/);
    assert.match(sql, /dailyBrief/);
    assert.equal(/revoke\s+all\s+on\s+function\s+public\.(is_staff|is_ops|is_walidata)/i.test(sql), false);
    const unique = read("supabase/migrations/20260923_admin_kabkota_kode_unique.sql");
    assert.match(unique, /idx_admin_kabkota_kode/);
    const tables = read("src/lib/auth/tables.ts");
    assert.equal(tables.includes("admin_profiles"), false);
  });

  it("dashboard stays on /admin/staf and keeps slot table", () => {
    const page = read("src/app/[locale]/admin/(console)/staf/page.tsx");
    const board = read("src/components/admin/UserManageBoard.tsx");
    const id = JSON.parse(read("messages/id.json")) as { admin: Record<string, string> };
    const en = JSON.parse(read("messages/en.json")) as { admin: Record<string, string> };
    assert.match(page, /UserManageBoard/);
    assert.match(page, /StaffInviteTable/);
    assert.match(board, /staffActive/);
    assert.match(board, /staffSuspended/);
    assert.match(board, /staffPending/);
    assert.match(board, /resend-invite/);
    const setPassword = read("src/app/[locale]/admin/set-password/page.tsx");
    assert.match(setPassword, /SetPasswordForm/);
    assert.match(setPassword, /admin\/login/);
    assert.equal(id.admin.setPasswordTitle, "Setel kata sandi");
    assert.equal(en.admin.setPasswordTitle, "Set password");
    assert.equal(id.admin.usersTitle, "Pengguna");
    assert.equal(en.admin.usersTitle, "Users");
    assert.equal(id.admin.navStaff, "Pengguna");
    const attack = read("security/attack-surface.md");
    assert.match(attack, /\/api\/admin\/users\/\[id\]/);
    assert.match(attack, /\/api\/admin\/users\/\[id\]\/resend-invite/);
    assert.match(attack, /\/auth\/confirm/);
    assert.match(attack, /\/api\/admin\/roles/);
  });
});
