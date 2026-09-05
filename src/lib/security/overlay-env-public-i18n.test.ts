import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

describe("overlay env + i18n halaman publik (AN-17)", () => {
  it(".env.example memuat nama OVERLAY_CRON_SECRET dan OVERLAY_REFRESH_URL", () => {
    const text = readFileSync(join(ROOT, ".env.example"), "utf8");
    assert.equal(
      text.includes("OVERLAY_CRON_SECRET"),
      true,
      ".env.example tidak memuat OVERLAY_CRON_SECRET"
    );
    assert.equal(
      text.includes("OVERLAY_REFRESH_URL"),
      true,
      ".env.example tidak memuat OVERLAY_REFRESH_URL"
    );
  });

  it("tiga halaman publik tidak hardcode judul Indonesia", () => {
    const pages = [
      {
        file: "src/app/[locale]/pelatihan/page.tsx",
        literal: "Edukasi dan pelatihan",
      },
      {
        file: "src/app/[locale]/nomor-penting/page.tsx",
        literal: "Nomor penting layanan kebencanaan",
      },
      {
        file: "src/app/[locale]/mitra/page.tsx",
        literal: "Mitra kebencanaan",
      },
    ];
    const offenders = pages.filter(({ file, literal }) =>
      readFileSync(join(ROOT, file), "utf8").includes(literal)
    );
    assert.deepEqual(
      offenders.map((row) => row.file),
      [],
      `masih hardcode judul Indonesia: ${offenders.map((row) => row.file).join(", ")}`
    );
  });

  it("tiga komponen publik tidak hardcode salinan Indonesia", () => {
    const checks = [
      { file: "src/components/sik/PelatihanPublic.tsx", literal: "Jadwal pelatihan" },
      { file: "src/components/sik/NomorPentingList.tsx", literal: "Belum ada nomor yang dipublikasikan." },
      { file: "src/components/sik/MitraPublic.tsx", literal: "Agregat disabilitas (tanpa identitas)" },
    ];
    const offenders = checks.filter(({ file, literal }) =>
      readFileSync(join(ROOT, file), "utf8").includes(literal)
    );
    assert.deepEqual(
      offenders.map((row) => row.file),
      [],
      `masih hardcode salinan Indonesia: ${offenders.map((row) => row.file).join(", ")}`
    );
  });
});
