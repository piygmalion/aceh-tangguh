import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

const DESTANA_PROGRAM_PATH = "/api/sik/destana/program";

describe("penerimaan Destana publik (AN-14)", () => {
  it("security/attack-surface.md memuat /api/sik/destana/program", () => {
    const text = readFileSync(join(ROOT, "security/attack-surface.md"), "utf8");
    assert.equal(
      text.includes(DESTANA_PROGRAM_PATH),
      true,
      `attack-surface.md tidak memuat ${DESTANA_PROGRAM_PATH}`
    );
  });

  it("halaman publik Destana tidak hardcode judul Indonesia", () => {
    const page = readFileSync(join(ROOT, "src/app/[locale]/destana/page.tsx"), "utf8");
    assert.equal(
      page.includes("Desa Tangguh Bencana"),
      false,
      "destana/page.tsx masih memuat Desa Tangguh Bencana"
    );
  });

  it("DestanaPublicList tidak hardcode header tabel Indonesia", () => {
    const source = readFileSync(join(ROOT, "src/components/sik/DestanaPublicList.tsx"), "utf8");
    const offenders = [">Desa<", ">Kabupaten<", ">Status<", ">Indeks<"].filter((literal) =>
      source.includes(literal)
    );
    assert.deepEqual(offenders, [], `${offenders.join(", ")} masih hardcoded`);
  });
});
