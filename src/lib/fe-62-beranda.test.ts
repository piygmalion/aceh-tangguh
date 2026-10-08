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
    assert.match(fitur, /href: "\/analisis-data"/);
    assert.match(fitur, /BarChart3/);
    assert.doesNotMatch(fitur, /destanaTitle|destanaIsi|href: "\/destana"/);
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
    const idFitur = JSON.parse(read("messages/id.json")) as {
      beranda: { fitur: Record<string, string> };
    };
    const enFitur = JSON.parse(read("messages/en.json")) as {
      beranda: { fitur: Record<string, string> };
    };
    assert.equal(idFitur.beranda.fitur.analisisTitle, "Analisis data bencana");
    assert.equal(enFitur.beranda.fitur.analisisTitle, "Disaster data analysis");
    assert.equal(
      idFitur.beranda.fitur.analisisIsi,
      "Potong kejadian Aceh menurut jenis, wilayah, dan waktu dari katalog SIK Aceh. Agregat DIBI bisa ditampilkan terpisah.",
    );
    assert.equal(
      enFitur.beranda.fitur.analisisIsi,
      "Slice Aceh events by type, area, and time from the SIK Aceh catalog. DIBI aggregates can be shown separately.",
    );
    const idAnalisis = JSON.parse(read("messages/id.json")) as {
      analisisData: { lead: string };
    };
    const enAnalisis = JSON.parse(read("messages/en.json")) as {
      analisisData: { lead: string };
    };
    assert.equal(idAnalisis.analisisData.lead, idFitur.beranda.fitur.analisisIsi);
    assert.equal(enAnalisis.analisisData.lead, enFitur.beranda.fitur.analisisIsi);
    assert.equal(idFitur.beranda.fitur.destanaTitle, undefined);
    assert.equal(enFitur.beranda.fitur.destanaTitle, undefined);
    assert.doesNotMatch(idFitur.beranda.fitur.analisisIsi, /katalog yang sama/);
    assert.doesNotMatch(enFitur.beranda.fitur.analisisIsi, /same catalogue/);
    assert.doesNotMatch(idFitur.beranda.fitur.analisisIsi, /\d/);
    assert.doesNotMatch(enFitur.beranda.fitur.analisisIsi, /\d/);
    const idAksi = JSON.parse(read("messages/id.json")) as {
      beranda: { aksi: Record<string, string> };
    };
    const enAksi = JSON.parse(read("messages/en.json")) as {
      beranda: { aksi: Record<string, string> };
    };
    assert.equal(idAksi.beranda.aksi.destanaNama, undefined);
    assert.equal(idAksi.beranda.aksi.destanaIsi, undefined);
    assert.equal(enAksi.beranda.aksi.destanaNama, undefined);
    assert.equal(enAksi.beranda.aksi.destanaIsi, undefined);
    assert.match(id.beranda.statistik.sumber, /DIBI BNPB/);
    assert.match(en.beranda.statistik.sumber, /DIBI BNPB/);
    assert.match(id.beranda.statistik.sumberCadangan, /data cadangan per \{date\}/);
    assert.match(en.beranda.statistik.sumberCadangan, /standby data as of \{date\}/);
    const hero = read("src/components/beranda/DataHero.tsx");
    assert.match(hero, /tanggalCadangan\(data\.metadata\.fetched_at/);
    assert.doesNotMatch(hero, /new Date\(\)/);
    assert.equal((hero.match(/col-span-2 sm:col-span-1/g) || []).length, 2);
    assert.match(hero, /id="dibi"[\s\S]*relative z-40/);
    const idMap = JSON.parse(read("messages/id.json")) as { map: Record<string, string> };
    const enMap = JSON.parse(read("messages/en.json")) as { map: Record<string, string> };
    assert.equal(
      idMap.map.basemapHint,
      "Raster OSM (Carto jika kunci terpasang) · Esri · Sentinel-2 · tiga preset merek (vektor OSM, jatuh ke raster jika gagal).",
    );
    assert.equal(
      enMap.map.basemapHint,
      "OSM raster (Carto when a key is set) · Esri · Sentinel-2 · three brand presets (OSM vector, raster fallback).",
    );
    assert.match(idMap.map.basemapVectorOptional, /kembali ke raster/);
    assert.match(enMap.map.basemapVectorOptional, /falls back to raster/);
    assert.equal(idMap.map.basemapKindRaster, "Raster");
    assert.equal(enMap.map.basemapKindRaster, "Raster");
    const stat = read("src/components/beranda/primitives.tsx");
    assert.match(stat, /sr-only/);
    assert.match(stat, /useReducedMotion/);
    assert.match(stat, /duration: 0\.3/);
    assert.doesNotMatch(stat, /useSpring|useMotionValue|textContent/);
    const footer = read("src/components/SiteFooter.tsx");
    assert.doesNotMatch(footer, /Placeholder|Kominsa|brand final/);
    assert.match(id.beranda.statistik.menderitaNote, /Tidak dipisah/);
    const blob = JSON.stringify(id.beranda) + JSON.stringify(en.beranda);
    assert.doesNotMatch(blob, /App Store|Google Play|Kejadian Bahaya/);
  });
});
