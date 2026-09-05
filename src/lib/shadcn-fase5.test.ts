import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walkTs(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const MIGRATED = [
  "src/components/panduan/GuidePanel.tsx",
  "src/components/sik/CalonKejadianList.tsx",
  "src/components/sik/DampakJuklakForm.tsx",
  "src/components/sik/DestanaAdminPanel.tsx",
  "src/components/sik/DestanaProgramForm.tsx",
  "src/components/sik/KejadianOpsDetail.tsx",
  "src/components/sik/KejadianOpsList.tsx",
  "src/components/sik/KejadianWizard.tsx",
  "src/components/sik/PelatihanPublic.tsx",
  "src/components/sik/PengungsianKajiForm.tsx",
  "src/components/sik/SikResourceManager.tsx",
] as const;

const OUT_OF_SCOPE = [
  "src/components/map/MapViewport.tsx",
  "src/components/map/AreaProfilPanel.tsx",
  "src/components/HeroSection.tsx",
  "src/components/SiteFooter.tsx",
  "src/components/SiteNav.tsx",
  "src/lib/peringatan-dini/magma.ts",
  "src/components/sik/OperationalStatsSection.tsx",
] as const;

describe("shadcn Fase 5 leftover button-legacy", () => {
  it("deletes button-legacy.tsx and has zero source imports", () => {
    assert.equal(existsSync(path.join(ROOT, "src/components/ui/button-legacy.tsx")), false);

    for (const file of walkTs(path.join(ROOT, "src"))) {
      const src = readFileSync(file, "utf8");
      const rel = path.relative(ROOT, file);
      const isTest = rel.endsWith(".test.ts") || rel.endsWith(".test.tsx");
      assert.equal(
        /from ["']@\/components\/ui\/button-legacy["']/.test(src),
        false,
        `${rel} still imports button-legacy`
      );
      if (!isTest) {
        assert.equal(
          /@\/components\/ui\/button-legacy/.test(src),
          false,
          `${rel} still references button-legacy`
        );
      }
    }
  });

  it("migrates panduan GuidePanel and SIK ops onto shadcn Button", () => {
    for (const file of MIGRATED) {
      const src = read(file);
      assert.match(src, /from ["']@\/components\/ui\/button["']/);
      assert.equal(/leftIcon=/.test(src), false, `${file} still uses leftIcon`);
      assert.equal(/rightIcon=/.test(src), false, `${file} still uses rightIcon`);
      assert.equal(/variant=["']primary["']/.test(src), false, `${file} still uses legacy primary`);
      assert.equal(/variant=["']danger["']/.test(src), false, `${file} still uses legacy danger`);
    }
  });

  it("maps danger to destructive and uses Spinner on busy SIK actions", () => {
    const calon = read("src/components/sik/CalonKejadianList.tsx");
    assert.match(calon, /variant="destructive"/);
    assert.match(calon, /<Spinner/);
    assert.match(calon, /data-icon=\{submitting \? "inline-start"/);

    const resource = read("src/components/sik/SikResourceManager.tsx");
    assert.match(resource, /variant="destructive"/);

    const wizard = read("src/components/sik/KejadianWizard.tsx");
    assert.match(wizard, /<Spinner/);
    assert.match(wizard, /data-icon=\{busy \? "inline-start"/);

    const dampak = read("src/components/sik/DampakJuklakForm.tsx");
    assert.match(dampak, /<Spinner/);

    const pengungsi = read("src/components/sik/PengungsianKajiForm.tsx");
    assert.match(pengungsi, /<Spinner/);
  });

  it("extends shadcn Button with ink-on-orange accent", () => {
    const button = read("src/components/ui/button.tsx");
    const accentLine = button.split("\n").find((line) => /^\s*accent:/.test(line));
    assert.ok(accentLine, "missing accent variant");
    assert.match(button, /bg-accent text-accent-foreground/);
    assert.equal(/text-white/.test(button), false, "button primitive still paints white");
  });

  it("does not use space-y on migrated panduan/SIK panels", () => {
    for (const file of MIGRATED) {
      const leftover = read(file)
        .split("\n")
        .filter((line) => /space-y-/.test(line) && !/space-y-0/.test(line));
      assert.deepEqual(leftover, [], `${file} still uses space-y-*`);
    }
  });

  it("composes PelatihanPublic with FieldGroup", () => {
    const src = read("src/components/sik/PelatihanPublic.tsx");
    assert.match(src, /FieldGroup/);
    assert.match(src, /FieldLabel/);
    assert.match(src, /from ["']@\/components\/ui\/input["']/);
  });

  it("does not restyle map chrome, homepage, nav, footer, or MAGMA", () => {
    for (const file of OUT_OF_SCOPE) {
      assert.equal(existsSync(path.join(ROOT, file)), true, `missing ${file}`);
    }
    const magma = read("src/lib/peringatan-dini/magma.ts");
    assert.equal(/from ["']@\/components\/ui\/button["']/.test(magma), false);
    const viewport = read("src/components/map/MapViewport.tsx");
    assert.equal(/from ["']@\/components\/ui\/button["']/.test(viewport), false);
    const nav = read("src/components/SiteNav.tsx");
    assert.equal(/from ["']@\/components\/ui\/button["']/.test(nav), false);
  });
});
