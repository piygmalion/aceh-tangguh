import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

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

describe("FE-34 staf kab SoT-3 FINAL UX", () => {
  it("uses Empty + EmptyDescription, outline primary CTA, Skeleton, and dashed error retry", () => {
    const moderasi = read("src/components/admin/ModerationTable.tsx");
    const staf = read("src/components/admin/StaffInviteTable.tsx");
    const stafPage = read("src/app/[locale]/admin/(console)/staf/page.tsx");
    const id = adminNs("id");
    const en = adminNs("en");

    assert.match(moderasi, /from ["']@\/components\/ui\/empty["']/);
    assert.match(moderasi, /EmptyDescription/);
    assert.match(moderasi, /data-testid="moderation-empty"/);
    assert.match(moderasi, /data-testid="moderation-error"/);
    assert.match(moderasi, /from ["']@\/components\/ui\/skeleton["']/);
    assert.match(moderasi, /data-testid="moderation-skeleton-row"/);
    assert.match(moderasi, /FieldError/);
    assert.match(moderasi, /data\?\.error/);
    assert.match(moderasi, /emptyKabDescription/);
    assert.match(moderasi, /TYPE_FLOOR_CLASS/);
    assert.match(moderasi, /hideLegacy/);
    assert.match(moderasi, /variant="outline"/);
    assert.match(moderasi, /OUTLINE_PRIMARY_CLASS/);
    assert.equal(moderasi.includes('variant="accent"'), false);
    assert.deepEqual(leftoverSpace(moderasi), [], "ModerationTable still uses space-y-* / space-x-*");
    assert.equal(/lime|bg-lime|text-lime/.test(moderasi), false);

    assert.match(staf, /from ["']@\/components\/ui\/empty["']/);
    assert.match(staf, /EmptyDescription/);
    assert.match(staf, /data-testid="staff-empty"/);
    assert.match(staf, /data-testid="staff-error"/);
    assert.match(staf, /from ["']@\/components\/ui\/skeleton["']/);
    assert.match(staf, /data-testid="staff-skeleton-row"/);
    assert.match(staf, /FieldError/);
    assert.match(staf, /staffEmptyDescription/);
    assert.match(staf, /TYPE_FLOOR_CLASS/);
    assert.match(staf, /variant="outline"/);
    assert.match(staf, /OUTLINE_PRIMARY_CLASS/);
    assert.equal(staf.includes('variant="accent"'), false);
    assert.equal(staf.includes("inviteStatus"), false);
    assert.deepEqual(leftoverSpace(staf), [], "StaffInviteTable still uses space-y-* / space-x-*");
    assert.equal(/lime|bg-lime|text-lime/.test(staf), false);
    assert.match(stafPage, /TYPE_FLOOR_CLASS/);
    assert.deepEqual(leftoverSpace(stafPage), [], "staf page still uses space-y-*");
    assert.match(read("src/lib/type-floor.ts"), /border-\[var\(--primary\)\]/);

    assert.equal(id.emptyKabDescription, "Belum ada laporan di kabupaten Anda");
    assert.equal(id.staffEmptyDescription, "Belum ada undangan di kabupaten Anda");
    assert.equal(id.statusWaiting, "Menunggu");
    assert.equal(id.retry, "Muat ulang");
    assert.equal(en.emptyKabDescription, "No reports in your district yet.");
    assert.equal(en.staffEmptyDescription, "No invitations in your district yet.");
    assert.equal(en.statusWaiting, "Pending");
    assert.equal(en.retry, "Refresh");
  });

  it("maps laporan waiting chips to accent ink-on-orange and keeps users occupied/vacant only", () => {
    const badge = read("src/components/admin/StatusBadge.tsx");
    const moderasi = read("src/components/admin/ModerationTable.tsx");
    const chip = read("src/components/ui/Chip.tsx");
    const users = read("src/app/api/admin/users/route.ts");
    const helper = read("src/lib/sik/staff-invite.ts");
    const laporan = read("src/app/api/admin/laporan/route.ts");
    const reports = read("src/app/api/admin/reports/route.ts");
    const routes = listApiRoutes(join(ROOT, "src/app/api"));

    assert.match(badge, /submitted:\s*"accent"/);
    assert.match(badge, /in_review:\s*"accent"/);
    assert.match(badge, /approved:\s*"forest"/);
    assert.match(badge, /rejected:\s*"danger"/);
    assert.match(moderasi, /statusWaiting/);
    assert.match(chip, /accent:/);
    assert.match(chip, /--accent-fg/);
    assert.equal(/text-white/.test(chip), false);
    assert.match(chip, /forest:/);
    assert.match(chip, /bg-\[var\(--ink\)\] text-\[var\(--paper\)\]/);
    assert.equal(/lime|bg-lime|text-lime/.test(chip), false);

    assert.equal(helper.includes("inviteStatusFromAuthUser"), false);
    assert.equal(users.includes("inviteStatus"), false);
    assert.equal(users.includes("last_sign_in_at"), false);
    assert.match(users, /requireSuperAdminApi/);
    assert.match(users, /authorizeStaffCatalogInvite/);
    assert.doesNotMatch(users, /password/);
    assert.match(read("src/lib/sik/staff-manage.ts"), /authorizeStaffInvite/);
    assert.match(laporan, /authorizeLaporanList/);
    assert.match(laporan, /matchesLaporanKabScope/);
    assert.match(reports, /authorizeLegacyReports/);
    assert.equal(
      routes.some((path) => path.includes(`${join("api", "admin", "staff")}`)),
      false,
    );
    assert.equal(existsSync(join(ROOT, "src/app/api/admin/invites/route.ts")), false);
    assert.equal(existsSync(join(ROOT, "src/app/api/admin/users/pending/route.ts")), false);
  });
});
