import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { SHOW_BERANDA_DESTANA } from "../components/beranda/flags";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const ORDER = [
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

describe("FE-62 beranda mengikuti urutan SIAGA", () => {
  it("mounts sections in the locked order and keeps Destana off", () => {
    const page = read("src/app/[locale]/page.tsx");
    let cursor = -1;
    for (const name of ORDER) {
      const at = page.indexOf(`<${name}`);
      assert.ok(at > cursor, `${name} is out of order`);
      cursor = at;
    }
    assert.equal(SHOW_BERANDA_DESTANA, false);
    assert.match(page, /SHOW_BERANDA_DESTANA \? <DestanaBeranda \/> : null/);
    const destana = read("src/components/beranda/DestanaBeranda.tsx");
    assert.match(destana, /return null/);
    assert.doesNotMatch(destana, /pratama|madya|utama|totalDesa/);
    assert.doesNotMatch(page, /PemulihanPanel|MetricRail|useAnggaran|anggaran-bencana/);
  });

  it("builds the data hero from the DIBI aggregate and does not invent a hazard split", () => {
    const hero = read("src/components/beranda/DataHero.tsx");
    assert.match(hero, /aggregateDibiBeranda/);
    assert.match(hero, /useDibi/);
    assert.match(hero, /htmlFor="dibi-year-from"/);
    assert.match(hero, /htmlFor="dibi-kabupaten"/);
    assert.match(hero, /htmlFor="dibi-jenis"/);
    assert.match(hero, /id="hero"/);
    assert.match(hero, /id="dibi"/);
    assert.doesNotMatch(hero, /Kejadian Bahaya|total_bencana|totalBencana|App Store|Google Play/);
    assert.doesNotMatch(hero, /useAnggaran|\/api\/anggaran|\/api\/prrpka/);
    const tentang = read("src/components/beranda/TentangSection.tsx");
    const fitur = read("src/components/beranda/FiturSection.tsx");
    assert.doesNotMatch(tentang, /App Store|Google Play|play\.google|apps\.apple/);
    assert.match(fitur, /id="peta-teaser"/);
    assert.match(fitur, /href: "\/peta"/);
    assert.match(fitur, /href: "\/destana"/);
    assert.doesNotMatch(fitur, /\b\d{3,}\b/);
    assert.match(read("src/components/beranda/LaporCta.tsx"), /href="\/lapor\/kejadian"/);
    assert.match(read("src/components/beranda/LaporCta.tsx"), /id="partisipasi"/);
    assert.match(read("src/components/beranda/MasukCta.tsx"), /href="\/admin\/login"/);
    assert.match(read("src/components/beranda/BeritaSection.tsx"), /KegiatanSlideshow/);
    assert.match(read("src/components/beranda/BeritaSection.tsx"), /href="\/publikasi"/);
  });

  it("adds the new beranda copy in both locales without a mobile-app badge", () => {
    const id = JSON.parse(read("messages/id.json")) as {
      beranda: { statistik: Record<string, string>; tentang: Record<string, string> };
    };
    const en = JSON.parse(read("messages/en.json")) as {
      beranda: { statistik: Record<string, string>; tentang: Record<string, string> };
    };
    for (const key of ["title", "kabNote", "menderitaNote", "scopeUnavailable", "noIncidents", "sumber"]) {
      assert.equal(typeof id.beranda.statistik[key], "string", key);
      assert.equal(typeof en.beranda.statistik[key], "string", key);
    }
    assert.match(id.beranda.statistik.sumber, /DIBI BNPB/);
    assert.match(en.beranda.statistik.sumber, /DIBI BNPB/);
    assert.match(id.beranda.statistik.menderitaNote, /Tidak dipisah/);
    const blob = JSON.stringify(id.beranda) + JSON.stringify(en.beranda);
    assert.doesNotMatch(blob, /App Store|Google Play|Kejadian Bahaya/);
  });
});
