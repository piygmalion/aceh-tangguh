import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

const MIGRATED_BUTTON = [
  "src/components/admin/LoginForm.tsx",
  "src/components/admin/DatabaseExplorer.tsx",
  "src/components/admin/CmsKejadianManager.tsx",
  "src/components/admin/CmsPublikasiManager.tsx",
  "src/components/admin/ModerationTable.tsx",
  "src/components/laporan/ReportKejadianForm.tsx",
  "src/components/laporan/ReportPenangananForm.tsx",
  "src/components/laporan/GpsCapture.tsx",
  "src/components/kejadian/KejadianTable.tsx",
];

const MIGRATED_FORMS = [
  ...MIGRATED_BUTTON,
  "src/components/laporan/ReporterFields.tsx",
  "src/components/laporan/FormFieldRenderer.tsx",
];

const MIGRATED_IN_LATER_FASE = [
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
];

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("shadcn Fase 2 admin/laporan forms", () => {
  it("migrates listed admin/laporan/kejadian forms onto shadcn Button", () => {
    for (const file of MIGRATED_BUTTON) {
      const src = read(file);
      assert.match(src, /@\/components\/ui\/button["']/);
    }
    for (const file of MIGRATED_FORMS) {
      const src = read(file);
      assert.equal(
        /@\/components\/ui\/button-legacy/.test(src),
        false,
        `${file} still imports button-legacy`
      );
    }
  });

  it("no longer lists panduan and SIK as button-legacy leftovers", () => {
    for (const file of MIGRATED_IN_LATER_FASE) {
      const src = read(file);
      assert.match(src, /from ["']@\/components\/ui\/button["']/);
      assert.equal(
        /@\/components\/ui\/button-legacy/.test(src),
        false,
        `${file} still imports button-legacy`
      );
    }
  });

  it("raises shadcn Button sm to the 13px type floor", () => {
    const button = read("src/components/ui/button.tsx");
    const smLine = button
      .split("\n")
      .find((line) => /^\s*sm:/.test(line));
    assert.ok(smLine, "missing sm size variant");
    assert.equal(/text-xs/.test(smLine!), false, "sm still uses text-xs (12px)");
    assert.match(smLine!, /text-\[length:var\(--type-floor\)\]|text-sm/);
  });

  it("composes login and laporan identity fields with FieldGroup", () => {
    const login = read("src/components/admin/LoginForm.tsx");
    assert.match(login, /FieldGroup/);
    assert.match(login, /FieldLabel/);
    assert.match(login, /from ["']@\/components\/ui\/input["']/);
    assert.equal(/space-y-/.test(login), false);

    const reporter = read("src/components/laporan/ReporterFields.tsx");
    assert.match(reporter, /FieldGroup/);
    assert.match(reporter, /FieldLabel/);
    assert.equal(/space-y-/.test(reporter), false);

    const gps = read("src/components/laporan/GpsCapture.tsx");
    assert.match(gps, /data-icon="inline-start"/);
    assert.equal(/leftIcon=/.test(gps), false);
  });
});
