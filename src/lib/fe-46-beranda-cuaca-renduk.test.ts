import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      return flattenKeys(child, next);
    }
    return [next];
  });
}

const CUACA_I18N = [
  "carouselAria",
  "prev",
  "next",
  "pause",
  "play",
  "autoplay",
  "pageIndicator",
] as const;

describe("FE-46 cuaca slideshow, copy, footer, renduk", () => {
  it("CuacaStrip shows all kabupaten as a 5s carousel, not a six-card pick", () => {
    const src = read("src/components/beranda/CuacaStrip.tsx");
    assert.match(src, /aria-roledescription="carousel"/);
    assert.match(src, /5000/);
    assert.match(src, /data-weather-card|data-cuaca-card/);
    assert.match(src, /kabupaten_kota/);
    assert.doesNotMatch(src, /function pilihKab/);
    assert.doesNotMatch(src, /slice\(0,\s*6\)/);
    assert.doesNotMatch(src, /lg:grid-cols-6/);
    assert.match(src, /WeatherInovasiStrip/);
    assert.match(src, /prefers-reduced-motion|useReducedMotion/);
    assert.match(src, /id="cuaca"/);
  });

  it("adds cuaca carousel keys in both locales", () => {
    const id = JSON.parse(read("messages/id.json")) as {
      beranda: { cuaca: Record<string, string> };
    };
    const en = JSON.parse(read("messages/en.json")) as {
      beranda: { cuaca: Record<string, string> };
    };
    for (const key of CUACA_I18N) {
      assert.equal(typeof id.beranda.cuaca[key], "string", `id cuaca.${key}`);
      assert.equal(typeof en.beranda.cuaca[key], "string", `en cuaca.${key}`);
      assert.ok(id.beranda.cuaca[key].length > 0);
      assert.ok(en.beranda.cuaca[key].length > 0);
    }
    assert.match(id.beranda.cuaca.pageIndicator, /\{from\}/);
    assert.match(id.beranda.cuaca.pageIndicator, /\{total\}/);
    assert.doesNotMatch(id.beranda.cuaca.pageIndicator, /\u2014|\u2013/);
    assert.doesNotMatch(en.beranda.cuaca.pageIndicator, /\u2014|\u2013/);
  });

  it("updates beranda hero and DIBI titles in ID and EN", () => {
    const id = JSON.parse(read("messages/id.json")) as {
      beranda: { hero: Record<string, string>; dibi: Record<string, string> };
    };
    const en = JSON.parse(read("messages/en.json")) as {
      beranda: { hero: Record<string, string>; dibi: Record<string, string> };
    };
    assert.match(id.beranda.hero.kicker, /siaga hadapi bencana/i);
    assert.match(id.beranda.hero.title, /Siapsiaga dan Tanggap untuk Aceh Tangguh/);
    assert.match(id.beranda.hero.lead, /Data prediktif/);
    assert.match(id.beranda.hero.lead, /kajian risiko/);
    assert.equal(id.beranda.dibi.title, "Menghitung Dampak Bencana di Aceh");
    assert.doesNotMatch(id.beranda.hero.title, /Bahaya hari ini/);
    assert.doesNotMatch(id.beranda.dibi.title, /Delapan belas tahun/);
    assert.match(en.beranda.hero.kicker, /ready/i);
    assert.match(en.beranda.hero.title, /Preparedness and response/i);
    assert.match(en.beranda.hero.lead, /Predictive data/i);
    assert.match(en.beranda.dibi.title, /disaster impact/i);
    const idKeys = flattenKeys(id.beranda).sort();
    const enKeys = flattenKeys(en.beranda).sort();
    assert.deepEqual(enKeys, idKeys);
  });

  it("collapses footer Jelajah and Sumber data like Kredit visual", () => {
    const footer = read("src/components/SiteFooter.tsx");
    const jelajahIdx = footer.indexOf('t("jelajah")');
    const sumberIdx = footer.indexOf('t("sumberData")');
    const kreditIdx = footer.indexOf('t("kreditVisual")');
    assert.ok(jelajahIdx > 0 && sumberIdx > 0 && kreditIdx > 0);
    const beforeJelajah = footer.slice(Math.max(0, jelajahIdx - 280), jelajahIdx);
    const beforeSumber = footer.slice(Math.max(0, sumberIdx - 280), sumberIdx);
    const beforeKredit = footer.slice(Math.max(0, kreditIdx - 280), kreditIdx);
    assert.match(beforeJelajah, /<details/);
    assert.match(beforeSumber, /<details/);
    assert.match(beforeKredit, /<details/);
    assert.match(footer, /<summary/);
    assert.match(footer, /md:grid-cols-3/);
  });

  it("keeps Renduk / PRRPKA charts off the public analisis page", () => {
    const page = read("src/app/[locale]/analisis-data/page.tsx");
    assert.doesNotMatch(page, /R3PChartSection/);
    assert.match(page, /AnalisisWorkspace/);
    const staff = read("src/app/[locale]/admin/(console)/anggaran/page.tsx");
    assert.match(staff, /R3PChartSection/);
    assert.match(staff, /renduk/);
    const chart = read("src/components/R3PChartSection.tsx");
    assert.match(chart, /\/api\/prrpka\/summary/);
  });
});
