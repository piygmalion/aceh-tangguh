import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const SIK = join(ROOT, "src/components/sik");

const STAFF_LOCALE_FILES = [
  "KejadianOpsList.tsx",
  "KejadianOpsDetail.tsx",
  "CalonKejadianList.tsx",
] as const;

const HARDCODED_ID_LOCALE = 'toLocaleString("id-ID")';

/** JSX text `>KIB<` or a `"KIB"` / `'KIB'` literal. `colKib` and `row.kib` do not match. */
const JSX_KIB_HEADER = />\s*KIB\s*<|["']KIB["']/;

function readSikComponent(name: (typeof STAFF_LOCALE_FILES)[number]): string {
  return readFileSync(join(SIK, name), "utf8");
}

describe("locale staf daftar/detail/calon (AN-10)", () => {
  it("KejadianOpsList, KejadianOpsDetail, CalonKejadianList tidak memuat toLocaleString(\"id-ID\")", () => {
    const offenders = STAFF_LOCALE_FILES.filter((name) =>
      readSikComponent(name).includes(HARDCODED_ID_LOCALE)
    );
    assert.deepEqual(
      offenders,
      [],
      `${offenders.join(", ")} masih memuat ${HARDCODED_ID_LOCALE}`
    );
  });

  it("KejadianOpsList tidak memuat header JSX KIB (bukan colKib / row.kib)", () => {
    const source = readSikComponent("KejadianOpsList.tsx");
    assert.equal(
      JSX_KIB_HEADER.test(source),
      false,
      "KejadianOpsList.tsx masih memuat header JSX \"KIB\"; pakai colKib, bukan string KIB"
    );
  });
});
