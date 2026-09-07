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
    assert.doesNotMatch(users, /password/);
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
    assert.equal(id.admin.usersTitle, "Pengguna");
    assert.equal(en.admin.usersTitle, "Users");
    assert.equal(id.admin.navStaff, "Pengguna");
    const attack = read("security/attack-surface.md");
    assert.match(attack, /\/api\/admin\/users\/\[id\]/);
    assert.match(attack, /\/api\/admin\/roles/);
  });
});
