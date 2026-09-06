import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { inviteStatusFromAuthUser } from "./staff-invite";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function leftoverSpace(src: string): string[] {
  return src
    .split("\n")
    .filter((line) => /space-[xy]-/.test(line) && !/space-[xy]-0/.test(line));
}

function adminNs(locale: "id" | "en"): Record<string, string> {
  const root = JSON.parse(read(`messages/${locale}.json`)) as {
    admin: Record<string, string>;
  };
  return root.admin;
}

function listApiRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const next = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listApiRoutes(next));
    else if (entry.name === "route.ts") out.push(next);
  }
  return out;
}

describe("FE-34 staf kab SoT-3 UX", () => {
  it("maps existing auth fields to vacant / pending / active without widening access", () => {
    assert.equal(inviteStatusFromAuthUser({ occupied: false }), "vacant");
    assert.equal(
      inviteStatusFromAuthUser({ occupied: false, lastSignInAt: "2026-01-01T00:00:00.000Z" }),
      "vacant",
    );
    assert.equal(inviteStatusFromAuthUser({ occupied: true, lastSignInAt: null }), "pending");
    assert.equal(inviteStatusFromAuthUser({ occupied: true, lastSignInAt: "" }), "pending");
    assert.equal(
      inviteStatusFromAuthUser({ occupied: true, lastSignInAt: "2026-01-01T00:00:00.000Z" }),
      "active",
    );
  });

  it("shows Empty + i18n friction copy on moderasi and staf when the scoped list is empty", () => {
    const moderasi = read("src/components/admin/ModerationTable.tsx");
    const staf = read("src/components/admin/StaffInviteTable.tsx");
    const stafPage = read("src/app/[locale]/admin/(console)/staf/page.tsx");
    const id = adminNs("id");
    const en = adminNs("en");

    assert.match(moderasi, /from ["']@\/components\/ui\/empty["']/);
    assert.match(moderasi, /data-testid="moderation-empty"/);
    assert.match(moderasi, /emptyKabTitle/);
    assert.match(moderasi, /emptyKabDescription/);
    assert.match(moderasi, /emptyFilterDescription/);
    assert.match(moderasi, /TYPE_FLOOR_CLASS/);
    assert.match(moderasi, /hideLegacy/);
    assert.deepEqual(leftoverSpace(moderasi), [], "ModerationTable still uses space-y-* / space-x-*");
    assert.equal(/lime|bg-lime|text-lime/.test(moderasi), false);

    assert.match(staf, /from ["']@\/components\/ui\/empty["']/);
    assert.match(staf, /data-testid="staff-empty"/);
    assert.match(staf, /data-testid="staff-full"/);
    assert.match(staf, /staffEmptyTitle/);
    assert.match(staf, /staffPending/);
    assert.match(staf, /tone="forest"/);
    assert.match(staf, /TYPE_FLOOR_CLASS/);
    assert.match(staf, /variant="accent"/);
    assert.deepEqual(leftoverSpace(staf), [], "StaffInviteTable still uses space-y-* / space-x-*");
    assert.equal(/lime|bg-lime|text-lime/.test(staf), false);
    assert.match(stafPage, /TYPE_FLOOR_CLASS/);
    assert.deepEqual(leftoverSpace(stafPage), [], "staf page still uses space-y-*");

    assert.equal(id.emptyKabTitle, "Tidak ada laporan di lingkup kabupaten");
    assert.equal(
      id.emptyKabDescription,
      "Belum ada laporan kejadian atau penanganan di wilayah kabupaten Anda pada filter ini. Data di luar kabupaten tidak ditampilkan.",
    );
    assert.equal(id.emptyFilterDescription, "Tidak ada laporan pada filter ini.");
    assert.equal(id.staffEmptyTitle, "Belum ada undangan");
    assert.equal(
      id.staffEmptyDescription,
      "Tempel email resmi BPBD pada slot kosong, lalu undang. Jangan mengisi email tebakan.",
    );
    assert.equal(id.staffFullTitle, "Semua slot terisi");
    assert.equal(id.staffPending, "Menunggu terima");
    assert.equal(id.staffActive, "Aktif");
    assert.equal(en.emptyKabTitle, "No reports in this district scope");
    assert.equal(
      en.emptyKabDescription,
      "There are no incident or response reports in your district for this filter. Reports outside the district are not shown.",
    );
    assert.equal(en.emptyFilterDescription, "No reports match this filter.");
    assert.equal(en.staffEmptyTitle, "No invitations yet");
    assert.equal(
      en.staffEmptyDescription,
      "Paste an official BPBD email into a vacant slot, then invite. Do not invent addresses.",
    );
    assert.equal(en.staffFullTitle, "All slots filled");
    assert.equal(en.staffPending, "Invite pending");
    assert.equal(en.staffActive, "Active");
    assert.equal(id.staffVacant, "Belum diundang");
    assert.equal(en.staffVacant, "Not invited");
  });

  it("uses a forest/ink pending chip and does not add staff endpoints or loosen kab scope", () => {
    const chip = read("src/components/ui/Chip.tsx");
    const users = read("src/app/api/admin/users/route.ts");
    const helper = read("src/lib/sik/staff-invite.ts");
    const laporan = read("src/app/api/admin/laporan/route.ts");
    const reports = read("src/app/api/admin/reports/route.ts");
    const apiRoot = join(ROOT, "src/app/api");
    const routes = listApiRoutes(apiRoot);

    assert.match(chip, /forest:/);
    assert.match(chip, /--forest-200/);
    assert.match(chip, /--ink/);
    assert.equal(/lime|bg-lime|text-lime/.test(chip), false);

    assert.match(helper, /inviteStatusFromAuthUser/);
    assert.match(users, /inviteStatusFromAuthUser/);
    assert.match(users, /inviteStatus/);
    assert.match(users, /last_sign_in_at/);
    assert.match(users, /requireSuperAdminApi/);
    assert.match(users, /authorizeStaffInvite/);
    assert.doesNotMatch(users, /password/);
    assert.equal(users.includes("matchesKabScope"), false);

    assert.match(laporan, /authorizeLaporanList/);
    assert.match(laporan, /matchesLaporanKabScope/);
    assert.match(reports, /authorizeLegacyReports/);

    assert.equal(
      routes.some((path) => path.includes(`${join("api", "admin", "staff")}`)),
      false,
      "do not add /api/admin/staff*",
    );
    assert.equal(
      existsSync(join(ROOT, "src/app/api/admin/invites/route.ts")),
      false,
    );
    assert.equal(
      existsSync(join(ROOT, "src/app/api/admin/users/pending/route.ts")),
      false,
    );
  });
});
