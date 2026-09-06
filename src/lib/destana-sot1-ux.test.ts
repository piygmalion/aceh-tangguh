import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

const PUBLIC = "src/components/sik/DestanaPublicList.tsx";
const ADMIN = "src/components/sik/DestanaAdminPanel.tsx";
const FORM = "src/components/sik/DestanaProgramForm.tsx";
const DESTANA_FILES = [PUBLIC, ADMIN, FORM] as const;

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function leftoverSpace(src: string): string[] {
  return src
    .split("\n")
    .filter((line) => /space-[xy]-/.test(line) && !/space-[xy]-0/.test(line));
}

const WHITE_ON_ORANGE =
  /(?:bg-\[var\(--accent\)\]|#FF7722|variant="accent"|bg-accent)[^\n]*text-white|text-white[^\n]*(?:bg-\[var\(--accent\)\]|#FF7722|bg-accent)/;

describe("FE-36 Destana SoT-1 UX", () => {
  it("replaces text-xs with TYPE_FLOOR_CLASS and keeps flex/gap stacks", () => {
    for (const file of DESTANA_FILES) {
      const src = read(file);
      assert.match(src, /TYPE_FLOOR_CLASS/, `${file} missing TYPE_FLOOR_CLASS`);
      assert.equal(/text-xs/.test(src), false, `${file} still uses text-xs (12px)`);
      assert.match(src, /flex flex-col gap-/, `${file} missing flex flex-col gap-`);
      assert.deepEqual(leftoverSpace(src), [], `${file} still uses space-y-* / space-x-*`);
      assert.equal(/lime|bg-lime|text-lime/.test(src), false, `${file} uses lime`);
    }

    const pub = read(PUBLIC);
    assert.match(pub, /from ["']@\/lib\/type-floor["']/);
    assert.match(pub, /from ["']@\/lib\/utils["']/);
    assert.equal(/className="mt-6 /.test(pub), false, "public list still stacks table with mt-6");

    const admin = read(ADMIN);
    assert.match(admin, /from ["']@\/lib\/type-floor["']/);
    assert.equal(
      /<span className="ml-2 text-xs/.test(admin),
      false,
      "admin evaluasi still uses text-xs",
    );

    const form = read(FORM);
    assert.match(form, /from ["']@\/lib\/type-floor["']/);
    assert.equal(
      /text-xs text-\[var\(--text-dim\)\]/.test(form),
      false,
      "form readOnly still uses text-xs",
    );
  });

  it("keeps shadcn Button and forbids white-on-orange accent CTAs", () => {
    const admin = read(ADMIN);
    const form = read(FORM);
    const pub = read(PUBLIC);

    assert.match(admin, /from ["']@\/components\/ui\/button["']/);
    assert.match(form, /from ["']@\/components\/ui\/button["']/);
    assert.equal(/button-legacy/.test(admin), false);
    assert.equal(/button-legacy/.test(form), false);

    for (const [file, src] of [
      [ADMIN, admin],
      [FORM, form],
      [PUBLIC, pub],
    ] as const) {
      assert.equal(WHITE_ON_ORANGE.test(src), false, `${file} still white-on-orange`);
      assert.equal(/text-white/.test(src), false, `${file} uses text-white`);
    }

    if (/variant="accent"/.test(admin)) {
      assert.match(admin, /text-\[var\(--accent-fg\)\]/);
    }
    if (/variant="accent"/.test(form)) {
      assert.match(form, /text-\[var\(--accent-fg\)\]/);
    }
  });

  it("uses Empty + Skeleton on Destana empty/loading surfaces that were bare or null", () => {
    const pub = read(PUBLIC);
    const admin = read(ADMIN);
    const form = read(FORM);

    assert.match(pub, /from ["']@\/components\/ui\/empty["']/);
    assert.match(pub, /from ["']@\/components\/ui\/skeleton["']/);
    assert.match(pub, /EmptyDescription/);
    assert.match(pub, /data-testid="destana-public-empty"/);
    assert.match(pub, /data-testid="destana-public-skeleton"/);
    assert.match(pub, /isPending/);
    assert.match(pub, /t\("lead"\)/);

    assert.match(admin, /from ["']@\/components\/ui\/empty["']/);
    assert.match(admin, /from ["']@\/components\/ui\/skeleton["']/);
    assert.match(admin, /EmptyDescription/);
    assert.match(admin, /data-testid="destana-admin-empty"/);
    assert.match(admin, /data-testid="destana-admin-skeleton"/);
    assert.match(admin, /data-testid="destana-admin-error"/);

    assert.match(form, /from ["']@\/components\/ui\/empty["']/);
    assert.match(form, /from ["']@\/components\/ui\/skeleton["']/);
    assert.match(form, /EmptyDescription/);
    assert.match(form, /data-testid="destana-program-empty"/);
    assert.match(form, /data-testid="destana-program-skeleton"/);
    assert.equal(
      /if \(error\) return <GlassPanel className="p-5">\{error\}<\/GlassPanel>/.test(form),
      false,
      "form still returns bare error text",
    );
    assert.equal(form.includes("return null;"), false, "form still returns null while loading");
  });

  it("does not touch Destana API, RLS, or AreaProfil IA", () => {
    assert.equal(existsSync(join(ROOT, "src/app/api/sik/destana/program/route.ts")), true);
    assert.equal(existsSync(join(ROOT, "src/app/api/sik/pkd/route.ts")), true);

    const pub = read(PUBLIC);
    const admin = read(ADMIN);
    const form = read(FORM);
    assert.match(pub, /\/api\/sik\/public\?kind=destana/);
    assert.match(admin, /\/api\/sik\/pkd/);
    assert.match(form, /\/api\/sik\/destana\/program/);
    assert.equal(pub.includes("AreaProfilPanel"), false);
    assert.equal(admin.includes("r3p-kab"), false);
    assert.equal(form.includes("OVERLAY_CRON_SECRET"), false);
  });
});
