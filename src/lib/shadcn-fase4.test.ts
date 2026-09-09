import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const PANEL = "src/components/map/AreaProfilPanel.tsx";

const MIGRATED_IN_FASE_5 = [
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
  "src/components/SiteFooter.tsx",
  "src/components/SiteNav.tsx",
  "src/lib/peringatan-dini/magma.ts",
  "src/components/sik/OperationalStatsSection.tsx",
] as const;

describe("shadcn Fase 4 AreaProfilPanel", () => {
  it("migrates AreaProfilPanel onto shadcn Button and off button-legacy", () => {
    const src = read(PANEL);
    assert.match(src, /from ["']@\/components\/ui\/button["']/);
    assert.equal(/@\/components\/ui\/button-legacy/.test(src), false);
    assert.equal(/leftIcon=/.test(src), false);
    assert.match(src, /data-icon="inline-start"/);
  });

  it("composes Breadcrumb, Badge, Separator, ScrollArea, and Skeleton", () => {
    const src = read(PANEL);
    assert.match(src, /from ["']@\/components\/ui\/breadcrumb["']/);
    assert.match(src, /<Breadcrumb[\s>]/);
    assert.match(src, /<BreadcrumbList/);
    assert.match(src, /<BreadcrumbLink/);
    assert.match(src, /<BreadcrumbPage/);
    assert.match(src, /<BreadcrumbSeparator/);
    assert.match(src, /from ["']@\/components\/ui\/badge["']/);
    assert.match(src, /<Badge/);
    assert.match(src, /from ["']@\/components\/ui\/separator["']/);
    assert.match(src, /<Separator/);
    assert.match(src, /from ["']@\/components\/ui\/scroll-area["']/);
    assert.match(src, /<ScrollArea/);
    assert.match(src, /from ["']@\/components\/ui\/skeleton["']/);
    assert.match(src, /<Skeleton/);
    assert.equal(existsSync(path.join(ROOT, "src/components/ui/scroll-area.tsx")), true);

    const pkg = JSON.parse(read("package.json")) as {
      dependencies: Record<string, string>;
    };
    assert.ok(pkg.dependencies["@radix-ui/react-scroll-area"]);
  });

  it("does not use space-y on the panel (gap composition)", () => {
    const leftover = read(PANEL)
      .split("\n")
      .filter((line) => /space-y-/.test(line) && !/space-y-0/.test(line));
    assert.deepEqual(leftover, [], "AreaProfilPanel still uses space-y-*");
  });

  it("keeps Distribusi IA #50 locks (no desa-list, same helpers)", () => {
    const src = read(PANEL);
    assert.equal(src.includes("desa-list"), false);
    assert.match(src, /t\("viewDesa"\)/);
    assert.equal(src.includes("locationLine"), false);
    assert.match(src, /useState<AreaProfilView>\(AREA_PROFIL_INITIAL_VIEW\)/);
    assert.match(src, /areaProfilViewOnOpen/);
    assert.match(src, /areaProfilBack/);
    assert.match(src, /areaProfilBreadcrumbLevels/);
    assert.match(src, /areaProfilBreadcrumbTarget/);
    assert.match(src, /sortKecamatanListItems/);
    assert.match(src, /kecamatan_list/);
    assert.match(src, /clickedHint/);
    assert.match(src, /t\("empty"\)/);
    assert.match(src, /t\("emptyHint"\)/);
    assert.match(src, /t\("unknown"\)/);
    assert.match(src, /t\("crumbKab"\)/);
    assert.match(src, /t\("crumbKec"\)/);
    assert.match(src, /t\("crumbDesa"\)/);
    assert.match(src, /t\("locationSep"\)/);
    assert.match(src, /Escape/);
    assert.match(src, /profilDesaLookupParams/);
    assert.equal(/kode_desa_kelurahan/.test(src), false);
    assert.equal(/params\.set\("kode_desa"/.test(src), false);
  });

  it("no longer treats panduan and SIK as button-legacy leftovers", () => {
    for (const file of MIGRATED_IN_FASE_5) {
      const src = read(file);
      assert.match(src, /from ["']@\/components\/ui\/button["']/);
      assert.equal(
        /@\/components\/ui\/button-legacy/.test(src),
        false,
        `${file} still imports button-legacy`
      );
    }
  });

  it("does not touch map paints, MAGMA, nav/footer, or SIK ops chrome", () => {
    for (const file of OUT_OF_SCOPE) {
      assert.equal(existsSync(path.join(ROOT, file)), true, `missing ${file}`);
    }
    const magma = read("src/lib/peringatan-dini/magma.ts");
    assert.equal(/from ["']@\/components\/ui\/(button|badge|scroll-area)["']/.test(magma), false);
    const viewport = read("src/components/map/MapViewport.tsx");
    assert.equal(/from ["']@\/components\/ui\/(button|breadcrumb|scroll-area)["']/.test(viewport), false);
  });
});
