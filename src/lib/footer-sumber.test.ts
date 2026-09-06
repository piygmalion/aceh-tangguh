import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import { DATA_SOURCES, FOOTER_SUMBER, FOOTER_SUMBER_IDS } from "./data-sources";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const LOCKED_FOOTER_IDS = [
  "irbi-2025",
  "compiled-r3p",
  "publikasi-kegiatan",
  "publikasi-btt",
  "analisis-anggaran-2026",
] as const;

const EXCLUDED_FOOTER_IDS = [
  "dibi-aceh",
  "magma-gempa",
  "sipongi-hotspot",
  "village-borders",
] as const;

describe("footer sumber column", () => {
  it("lists the five locked catalog sources only and does not invent ids", () => {
    assert.equal(FOOTER_SUMBER.length, 5);
    assert.equal(FOOTER_SUMBER.length, FOOTER_SUMBER_IDS.length);
    const catalogIds = new Set(DATA_SOURCES.map((row) => row.id));
    for (const row of FOOTER_SUMBER) {
      assert.equal(catalogIds.has(row.id), true, `unknown source ${row.id}`);
      assert.equal(row.hash, row.id);
    }
    const ids = FOOTER_SUMBER.map((row) => row.id);
    const idSet = new Set<string>(ids);
    assert.deepEqual(ids, [...LOCKED_FOOTER_IDS]);
    assert.equal(idSet.has("dibi-aceh"), false);
    assert.equal(idSet.has("magma-gempa"), false);
    assert.equal(idSet.has("sipongi-hotspot"), false);
    assert.equal(idSet.has("village-borders"), false);
  });

  it("keeps DIBI / MAGMA / Sipongi / Geoportal in the catalog, not the footer", () => {
    const catalogIds = new Set(DATA_SOURCES.map((row) => row.id));
    const footerIdSet = new Set<string>(FOOTER_SUMBER_IDS);
    for (const id of EXCLUDED_FOOTER_IDS) {
      assert.equal(catalogIds.has(id), true, `catalog missing ${id}`);
      assert.equal(footerIdSet.has(id), false, `${id} leaked into FOOTER_SUMBER_IDS`);
    }
  });

  it("renders Sumber data as the third column at the 13px type floor", () => {
    const footer = read("src/components/SiteFooter.tsx");
    assert.match(footer, /FOOTER_SUMBER/);
    assert.match(footer, /TYPE_FLOOR_CLASS/);
    assert.match(footer, /md:grid-cols-3/);
    assert.equal(/md:grid-cols-4/.test(footer), false);
    assert.equal(/col-start-4/.test(footer), false);
    assert.match(footer, /t\("sumberData"\)|tn\("sumberData"\)/);
    assert.equal(/Kredit visual/.test(footer), false);
    assert.match(footer, /SITE_MEDIA\.heroPoster\.credit|UI_CREDITS/);
    assert.match(footer, /hash: row\.hash|hash: entry\.hash|hash: source\.hash/);
  });

  it("keeps Jelajah and moves visual credits to the copyright row", () => {
    const footer = read("src/components/SiteFooter.tsx");
    assert.match(footer, /t\("jelajah"\)/);
    assert.match(footer, /© \{new Date\(\)\.getFullYear\(\)\} Aceh Tangguh/);
    const copyrightBlock = footer.slice(footer.indexOf("getFullYear()"));
    assert.match(copyrightBlock, /SITE_MEDIA\.heroPoster\.credit/);
    assert.match(copyrightBlock, /UI_CREDITS/);
  });
});
