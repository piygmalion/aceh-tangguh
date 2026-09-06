import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("nav IA groups", () => {
  it("groups desktop and mobile into Peta · Data · Siaga + Lapor CTA", () => {
    const nav = read("src/components/SiteNav.tsx");
    assert.match(nav, /t\("peta"\)/);
    assert.match(nav, /t\("data"\)/);
    assert.match(nav, /t\("siaga"\)/);
    assert.match(nav, /dataItems/);
    assert.match(nav, /siagaItems/);
    assert.match(nav, /href: "\/data-bencana"/);
    assert.match(nav, /href: "\/anggaran-bencana"/);
    assert.match(nav, /href: "\/publikasi"/);
    assert.match(nav, /href: "\/destana"/);
    assert.match(nav, /href: "\/nomor-penting"/);
    assert.match(nav, /href: "\/pelatihan"/);
    assert.match(nav, /href: "\/mitra"/);
    assert.match(nav, /<ReportLaporDropdown/);
    assert.match(nav, /active=\{laporActive\}/);
    assert.match(nav, /data-nav-ia="desktop"/);
    assert.match(nav, /data-nav-ia="mobile"/);
  });

  it("uses accent interaction chrome and leaves Auth/Locale/Theme in place", () => {
    const nav = read("src/components/SiteNav.tsx");
    assert.match(nav, /from "@\/lib\/nav-chrome"/);
    assert.match(nav, /navInteractiveClass/);
    assert.equal(/bg-\[var\(--primary-dim\)\]/.test(nav), false);
    assert.match(nav, /from "@\/components\/admin\/AuthMenu"/);
    assert.match(nav, /from "@\/components\/LocaleSwitch"/);
    assert.match(nav, /from "@\/components\/ThemeToggle"/);
    assert.match(nav, /<AuthMenu \/>/);
    assert.match(nav, /<LocaleSwitch \/>/);
    assert.match(nav, /<ThemeToggle \/>/);
    assert.equal(/from ["']@\/components\/ui\/button["']/.test(nav), false);
  });

  it("publishes siaga in both message files", () => {
    const id = JSON.parse(read("messages/id.json")) as { nav: { siaga: string; data: string } };
    const en = JSON.parse(read("messages/en.json")) as { nav: { siaga: string; data: string } };
    assert.equal(id.nav.siaga, "Siaga");
    assert.equal(en.nav.siaga, "Preparedness");
    assert.equal(id.nav.data, "Data");
    assert.equal(en.nav.data, "Data");
  });
});
