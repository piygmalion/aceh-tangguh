import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { urutKabupatenIrbi } from "@/components/beranda/RisikoLadder";
import { PETA_TEASER_PATHS } from "@/components/beranda/peta-teaser-paths";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function channel(value: number) {
  const n = value / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

function contrast(fg: string, bg: string) {
  const parse = (hex: string) => {
    const n = hex.replace("#", "");
    return [0, 2, 4].map((i) => channel(parseInt(n.slice(i, i + 2), 16)));
  };
  const lum = (rgb: number[]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  const [a, b] = [lum(parse(fg)), lum(parse(bg))];
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

describe("FE-70 visual-3", () => {
  it("scrolls each Tanggapi message to its start and keeps the disclaimer", () => {
    const panel = read("src/components/panduan/GuidePanel.tsx");
    assert.match(panel, /scrollIntoView\(\{ block: "start" \}\)/);
    assert.equal(panel.includes("scrollHeight"), false);
    assert.match(panel, /text-\[var\(--text-dim\)\]/);
    assert.doesNotMatch(panel, /accent-soft/);
    assert.match(panel, /\{t\("disclaimer"\)\}/);
    assert.ok(contrast("#5c5c5c", "#ffffff") >= 4.5);
    assert.ok(contrast("#c6c6c6", "#1a1a1a") >= 4.5);
    const bot = read("src/components/panduan/GuideBot.tsx");
    const tour = bot.slice(bot.indexOf("const goTour"), bot.indexOf("useEffect(() => {\n    if (!visible) return;"));
    assert.match(tour, /href === "\/peta"/);
    assert.match(tour, /setOpen\(false\)/);
    assert.match(bot, /hidden max-w-\[16rem\] sm:block/);
  });

  it("scrolls the map popup internally and styles sumber links apart from plain text", () => {
    const card = read("src/components/map/MapFeatureCard.tsx");
    const css = read("src/app/globals.css");
    assert.match(css, /max-height:\s*calc\(100dvh - 6rem - 32px\)/);
    assert.match(css, /\.map-feature-card[\s\S]*overflow-y:\s*auto/);
    assert.match(card, /fitCardToViewport/);
    assert.match(card, /sticky top-0/);
    assert.match(card, /stopPropagation/);
    assert.match(card, /data-event-sources/);
    const sources = card.slice(card.indexOf("data-event-sources"));
    assert.match(sources, /decoration-\[1px\]/);
    assert.match(sources, /underline-offset-\[2px\]/);
    assert.match(sources, /ArrowUpRight/);
    assert.match(sources, /h-3 w-3/);
    assert.match(sources, /focus-visible:outline/);
    assert.match(sources, /text-\[var\(--text-dim\)\]/);
    const plain = sources.slice(sources.indexOf(": ("));
    assert.doesNotMatch(plain, /ArrowUpRight|underline/);
    const workspace = read("src/components/map/MapWorkspace.tsx");
    assert.match(workspace, /featurePopupOpen/);
    assert.match(workspace, /max-md:hidden/);
  });

  it("uses a full-screen mobile drawer, a header rule, and an explicit IRBI sort", () => {
    const nav = read("src/components/SiteNav.tsx");
    assert.match(nav, /id="mobile-nav"/);
    assert.match(nav, /fixed inset-0/);
    assert.match(nav, /border-b border-\[var\(--band-rule\)\]/);
    const settings = read("src/components/map/MapSettings.tsx");
    assert.match(settings, /aria-label=\{t\("settings"\)\}/);
    const id = JSON.parse(read("messages/id.json")) as { map: { settings: string } };
    assert.equal(id.map.settings, "Pengaturan");
    const caption = read("src/components/beranda/HeroPhotoBackdrop.tsx");
    assert.match(caption, /lg:whitespace-nowrap/);
    const css = read("src/app/globals.css");
    assert.match(css, /@media \(max-width: 639px\)[\s\S]*#dibi \.band-label/);
    const rows = (
      JSON.parse(read("public/fixtures/irbi-2025.json")) as {
        kabupaten_kota: { kabupaten_kota: string; irb_2025: number; kelas_risiko: string; ancaman_tertinggi: string; skor_ancaman_tertinggi: number; kelas_ancaman_tertinggi: string }[];
      }
    ).kabupaten_kota.map((row) => ({
      kabupaten_kota: row.kabupaten_kota,
      irb_2025: row.irb_2025,
      kelas_risiko: row.kelas_risiko,
      ancaman_tertinggi: row.ancaman_tertinggi,
      skor_ancaman_tertinggi: row.skor_ancaman_tertinggi,
      kelas_ancaman_tertinggi: row.kelas_ancaman_tertinggi,
    }));
    const expected = [...rows].sort(
      (a, b) => b.irb_2025 - a.irb_2025 || a.kabupaten_kota.localeCompare(b.kabupaten_kota, "id"),
    );
    assert.deepEqual(
      urutKabupatenIrbi(rows).map((row) => row.kabupaten_kota),
      expected.map((row) => row.kabupaten_kota),
    );
    assert.deepEqual(
      urutKabupatenIrbi(rows).map((row) => row.irb_2025),
      [...rows.map((row) => row.irb_2025)].sort((a, b) => b - a),
    );
  });

  it("draws the bento map teaser from the kabupaten fixture, not a hand sketch", () => {
    const fc = JSON.parse(read("public/fixtures/boundaries-aceh-kab.geojson")) as {
      features: { properties: { name: string; kode_kab: string } }[];
    };
    const registry = JSON.parse(read("public/fixtures/aceh-kabupaten-registry.json")) as {
      kabupaten_kota: { nama: string }[];
    };
    const fromFixture = fc.features
      .map((feature) => `${feature.properties.kode_kab}:${feature.properties.name}`)
      .sort();
    const fromPaths = PETA_TEASER_PATHS.map((path) => `${path.kode_kab}:${path.name}`).sort();
    assert.equal(fromPaths.length, 23);
    assert.deepEqual(fromPaths, fromFixture);
    assert.deepEqual(
      new Set(PETA_TEASER_PATHS.map((path) => path.name)),
      new Set(registry.kabupaten_kota.map((row) => row.nama)),
    );
    for (const path of PETA_TEASER_PATHS) {
      assert.match(path.d, /^M/);
      assert.match(path.d, /Z/);
    }
    const svg = read("src/components/beranda/PetaTeaserSvg.tsx");
    assert.match(svg, /peta-teaser-paths/);
    assert.match(svg, /data-kode-kab/);
    const fitur = read("src/components/beranda/FiturSection.tsx");
    assert.match(fitur, /PetaTeaserSvg/);
    assert.match(fitur, /id="peta-teaser"/);
  });
});
