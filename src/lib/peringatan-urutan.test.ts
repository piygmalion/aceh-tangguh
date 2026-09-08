import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { compileAlertBrief } from "./panduan/alert-brief";
import type { GuideContext } from "./panduan/types";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function liveMixedTones(): NonNullable<GuideContext["peringatan"]> {
  return {
    cuacaEmpty: false,
    cuacaTone: "warn",
    cuacaHighlight: "Pidie: hujan lebat",
    magmaEmpty: true,
    magmaSource: "live",
    sipongiEmpty: false,
    sipongiCount: 3,
    sipongiPlace: "Aceh Utara",
    tatonasEmpty: true,
    stale: false,
  };
}

describe("AN-47 urutan keparahan vs katalog", () => {
  it("homepage lead surface is PeringatanBento, not the catalog carousel", () => {
    const page = read("src/app/[locale]/page.tsx");
    assert.match(page, /<PeringatanBento \/>/);
    assert.doesNotMatch(page, /PeringatanDiniSection/);
  });

  it("bento ranks cards by URUTAN_TONE (danger before warn before neutral)", () => {
    const src = read("src/components/beranda/PeringatanBento.tsx");
    assert.match(
      src,
      /URUTAN_TONE:\s*Record<PeringatanTone,\s*number>\s*=\s*\{\s*danger:\s*0,\s*warn:\s*1,\s*neutral:\s*2/,
    );
    assert.match(src, /kartu\.sort\(\(a, b\) => URUTAN_TONE\[a\.tone\] - URUTAN_TONE\[b\.tone\]\)/);
    assert.match(src, /lead cell is the most severe feed/);
    assert.doesNotMatch(src, /irb_2025|skor_irbi/);
  });

  it("bento builds cards in catalog order before the tone sort", () => {
    const src = read("src/components/beranda/PeringatanBento.tsx");
    const cuaca = src.indexOf('key: "cuaca"');
    const magma = src.indexOf('key: "magma"');
    const sipongi = src.indexOf('key: "sipongi"');
    const tatonas = src.indexOf('key: "tatonas"');
    const maritim = src.indexOf('key: "maritim"');
    assert.ok(cuaca > 0 && magma > cuaca && sipongi > magma && tatonas > sipongi && maritim > tatonas);
  });

  it("keeps Tanggapi briefing in catalog order even when Sipongi is the severe feed", () => {
    const brief = compileAlertBrief({ failed: [], peringatan: liveMixedTones() }, "id");
    assert.equal(brief.clauses.length, 4);
    assert.match(brief.clauses[0] ?? "", /^Cuaca:/);
    assert.match(brief.clauses[1] ?? "", /^Gempa MAGMA:/);
    assert.match(brief.clauses[2] ?? "", /^Sipongi:/);
    assert.match(brief.clauses[3] ?? "", /^Tatonas:/);
    assert.match(brief.clauses[2] ?? "", /Aceh Utara/);
    assert.doesNotMatch(brief.body, /maritim|gelombang/i);
  });

  it("does not sort compileAlertBrief clauses by tone", () => {
    const src = read("src/lib/panduan/alert-brief.ts");
    assert.match(src, /const clauses = \[cuaca, magma, sipongi, tatonas\]/);
    assert.doesNotMatch(src, /URUTAN_TONE|\.sort\(/);
  });
});
