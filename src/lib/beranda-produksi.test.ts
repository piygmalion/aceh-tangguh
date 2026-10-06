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

const MOUNTED = [
  "DataHero",
  "TentangSection",
  "LaporCta",
  "FiturSection",
  "RisikoLadder",
  "BeritaSection",
  "CuacaStrip",
  "PeringatanBento",
  "SumberPanel",
  "MasukCta",
] as const;

const UNMOUNTED = [
  "HeroSection",
  "HeroBoard",
  "MetricRail",
  "DibiPanel",
  "PetaPanel",
  "AksiPanel",
  "PemulihanPanel",
  "PeringatanDiniSection",
  "WeatherStrip",
  "ClusterGrid",
  "R3PChartSection",
  "MapTeaserSection",
  "ParticipationSection",
  "TransparencySection",
  "PitaPratinjau",
  "OperationalStatsSection",
] as const;

const TOUR_IDS = [
  'id="hero"',
  'id="status"',
  'id="cuaca"',
  'id="dibi"',
  'id="peta-teaser"',
  'id="partisipasi"',
  'id="transparansi"',
] as const;

describe("FE-45 beranda produksi", () => {
  it("homepage mounts the SIAGA-ordered beranda, not the previous stack", () => {
    const page = read("src/app/[locale]/page.tsx");
    for (const name of MOUNTED) {
      assert.match(page, new RegExp(`<${name} \\/>`));
    }
    for (const name of UNMOUNTED) {
      assert.doesNotMatch(page, new RegExp(name));
    }
    assert.doesNotMatch(page, /WeatherInovasiStrip/);
    assert.match(page, /SiteNav/);
    assert.match(page, /SiteFooter/);
  });

  it("keeps WeatherNext as a dialog inside CuacaStrip, not a homepage section", () => {
    const cuaca = read("src/components/beranda/CuacaStrip.tsx");
    const page = read("src/app/[locale]/page.tsx");
    assert.match(cuaca, /WeatherInovasiStrip/);
    assert.match(cuaca, /id="cuaca"/);
    assert.doesNotMatch(cuaca, /id="cuaca-inovasi"/);
    assert.doesNotMatch(cuaca, /\/api\/weather\/inovasi/);
    assert.doesNotMatch(page, /WeatherInovasiStrip/);
  });

  it("preserves panduan tour hashes on the new sections", () => {
    const files = [
      "src/components/beranda/DataHero.tsx",
      "src/components/beranda/PeringatanBento.tsx",
      "src/components/beranda/CuacaStrip.tsx",
      "src/components/beranda/FiturSection.tsx",
      "src/components/beranda/LaporCta.tsx",
      "src/components/beranda/SumberPanel.tsx",
    ].map(read).join("\n");
    for (const id of TOUR_IDS) {
      assert.match(files, new RegExp(id.replace(/"/g, '["\']')));
    }
  });

  it("does not show posko KPI on the new hero", () => {
    const hero = read("src/components/beranda/HeroBoard.tsx");
    assert.doesNotMatch(hero, /poskoCount|chipPosko|\/api\/stats\/live/);
  });

  it("uses next-intl beranda copy instead of hardcoded Indonesian UI", () => {
    const hero = read("src/components/beranda/HeroBoard.tsx");
    assert.match(hero, /useTranslations\("beranda"\)/);
    assert.doesNotMatch(hero, /Bahaya hari ini dan risiko jangka panjang/);
    assert.doesNotMatch(hero, /Aceh hari ini/);
    const bento = read("src/components/beranda/PeringatanBento.tsx");
    assert.match(bento, /useTranslations\("beranda"\)/);
    assert.doesNotMatch(bento, /Peringatan dini dari lima sumber resmi/);
  });

  it("adds beranda keys in both locales without dropping hero keys", () => {
    const id = JSON.parse(read("messages/id.json")) as {
      beranda: Record<string, unknown>;
      hero: { ctaPeta: string; ctaLaporKejadian: string };
    };
    const en = JSON.parse(read("messages/en.json")) as {
      beranda: Record<string, unknown>;
      hero: { ctaPeta: string; ctaLaporKejadian: string };
    };
    const idKeys = flattenKeys(id.beranda).sort();
    const enKeys = flattenKeys(en.beranda).sort();
    assert.deepEqual(enKeys, idKeys);
    assert.ok(idKeys.length >= 40, `beranda should have a full copy set, got ${idKeys.length}`);
    assert.equal(typeof id.hero.ctaPeta, "string");
    assert.equal(typeof en.hero.ctaPeta, "string");
    assert.equal(id.hero.ctaPeta, "Buka peta");
    const idTitle = (id.beranda as { hero?: { title?: string } }).hero?.title ?? "";
    const enTitle = (en.beranda as { hero?: { title?: string } }).hero?.title ?? "";
    assert.match(idTitle, /Siapsiaga dan Tanggap untuk SIK Aceh/);
    assert.match(enTitle, /Preparedness and response/i);
  });

  it("preview route redirects to the live homepage", () => {
    const preview = read("src/app/[locale]/preview/beranda/page.tsx");
    assert.match(preview, /redirect\(/);
    assert.doesNotMatch(preview, /PitaPratinjau/);
    assert.doesNotMatch(preview, /HeroBoard/);
  });
});
