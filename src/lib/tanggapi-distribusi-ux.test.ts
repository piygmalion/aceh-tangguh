import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  TANGGAPI_SEED_FORBIDDEN,
  TANGGAPI_SEED_WHITELIST,
  buildTanggapiSeedPrompt,
  isValidKodeDesa10,
  shouldShowTanggapiCta,
} from "./tanggapi-distribusi";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const WHITE_ON_ORANGE =
  /(?:bg-\[var\(--accent\)\]|#FF7722|variant="accent"|bg-accent)[^\n]*text-white|text-white[^\n]*(?:bg-\[var\(--accent\)\]|#FF7722|bg-accent)/;

const PANEL = "src/components/map/AreaProfilPanel.tsx";
const CARD = "src/components/map/MapFeatureCard.tsx";
const OPEN = "src/lib/panduan/open-tanggapi.ts";
const BOT = "src/components/panduan/GuideBot.tsx";

describe("FE-37 Tanggapi × Distribusi SoT", () => {
  it("shows CTA only on desa view when a 10-digit kode is present", () => {
    assert.equal(isValidKodeDesa10("1101012001"), true);
    assert.equal(isValidKodeDesa10("1101"), false);
    assert.equal(isValidKodeDesa10("Keude Bakongan"), false);
    assert.equal(isValidKodeDesa10(""), false);
    assert.equal(isValidKodeDesa10(null), false);

    assert.equal(
      shouldShowTanggapiCta({ view: "desa", kodeDesa: "1101012001" }),
      true,
    );
    assert.equal(
      shouldShowTanggapiCta({ view: "kabupaten", kodeDesa: "1101012001" }),
      false,
    );
    assert.equal(
      shouldShowTanggapiCta({ view: "kecamatan", kodeDesa: "1101012001" }),
      false,
    );
    assert.equal(
      shouldShowTanggapiCta({ view: "desa", kodeDesa: null }),
      false,
    );
    assert.equal(
      shouldShowTanggapiCta({ view: "desa", kodeDesa: "Keude Bakongan" }),
      false,
    );
    assert.equal(
      shouldShowTanggapiCta({ kodeDesa: "1102162017" }),
      true,
    );
    assert.equal(shouldShowTanggapiCta({ kodeDesa: undefined }), false);
  });

  it("seeds only the location whitelist and never casualty or destana numbers", () => {
    assert.deepEqual([...TANGGAPI_SEED_WHITELIST], [
      "kode_desa_kelurahan",
      "nama",
      "kecamatan",
      "kabupaten",
      "kode_kecamatan",
      "kode_kabupaten",
    ]);
    const forbidden = [
      "rumah_rr",
      "rumah_rs",
      "rumah_rb",
      "korban_meninggal",
      "kk",
      "populasi",
      "destana_indeks",
      "kondisi_kode",
    ] as const;
    for (const key of forbidden) {
      assert.equal((TANGGAPI_SEED_FORBIDDEN as readonly string[]).includes(key), true, key);
    }

    const seed = buildTanggapiSeedPrompt({
      kode_desa_kelurahan: "1101012001",
      nama: "Keude Bakongan",
      kecamatan: "Bakongan",
      kabupaten: "Aceh Selatan",
      kode_kecamatan: "110101",
      kode_kabupaten: "1101",
      rumah_rr: 9,
      rumah_rs: 4,
      rumah_rb: 2,
      korban_meninggal: 3,
      kk: 120,
      populasi: 400,
      destana_indeks: 0.42,
      kondisi_kode: "parah",
    });
    assert.ok(seed);
    assert.match(seed, /1101012001/);
    assert.match(seed, /Keude Bakongan/);
    assert.match(seed, /Bakongan/);
    assert.match(seed, /Aceh Selatan/);
    assert.doesNotMatch(seed, /\brumah_rr\b|\bRR\b/i);
    assert.doesNotMatch(seed, /korban/i);
    assert.doesNotMatch(seed, /\bkk\b|\bpopulasi\b/i);
    assert.doesNotMatch(seed, /destana/i);
    assert.doesNotMatch(seed, /kondisi/i);
    assert.doesNotMatch(seed, /\b9\b|\b4\b|\b2\b|\b3\b|\b120\b|\b400\b|0\.42/);

    assert.equal(
      buildTanggapiSeedPrompt({ nama: "Keude Bakongan", kabupaten: "Aceh Selatan" }),
      undefined,
    );
  });

  it("wires requestOpenTanggapi from the existing open event and forbids white-on-orange", () => {
    const panel = read(PANEL);
    const card = read(CARD);
    const open = read(OPEN);
    const bot = read(BOT);

    assert.match(panel, /from ["']@\/lib\/panduan\/open-tanggapi["']/);
    assert.match(panel, /requestOpenTanggapi/);
    assert.match(card, /from ["']@\/lib\/panduan\/open-tanggapi["']/);
    assert.match(card, /requestOpenTanggapi/);
    assert.match(open, /TANGGAPI_SEED_STORAGE/);
    assert.match(open, /aceh:tanggapi-seed/);
    assert.match(bot, /consumeTanggapiSeed/);

    assert.match(panel, /shouldShowTanggapiCta/);
    assert.match(panel, /view === "desa"|view === 'desa'/);
    assert.match(card, /shouldShowTanggapiCta|isValidKodeDesa10/);

    assert.match(panel, /from ["']@\/components\/ui\/button["']/);
    assert.match(card, /from ["']@\/components\/ui\/button["']/);
    assert.match(panel, /variant="accent"/);
    assert.match(card, /variant="accent"/);
    assert.match(panel, /text-\[var\(--accent-fg\)\]/);
    assert.match(card, /text-\[var\(--accent-fg\)\]/);
    assert.match(panel, /TYPE_FLOOR_CLASS/);
    assert.match(card, /TYPE_FLOOR_CLASS/);

    assert.equal(WHITE_ON_ORANGE.test(panel), false, "AreaProfilPanel white-on-orange");
    assert.equal(WHITE_ON_ORANGE.test(card), false, "MapFeatureCard white-on-orange");
    assert.equal(/text-white/.test(panel), false);
    assert.equal(/text-white/.test(card), false);
  });

  it("does not change AreaProfil IA #50 or invent map chrome", () => {
    const panel = read(PANEL);
    const ia = read("src/lib/area-profil-ia.ts");

    assert.equal(panel.includes("desa-list"), false);
    assert.match(panel, /t\("viewDesa"\)/);
    assert.equal(/params\.set\("kode_desa_kelurahan"/.test(panel), false);
    assert.equal(/params\.set\("kode_desa"/.test(panel), false);
    assert.match(panel, /areaProfilViewOnOpen/);
    assert.match(panel, /areaProfilBack/);
    assert.match(panel, /areaProfilBreadcrumbLevels/);
    assert.match(panel, /areaProfilBreadcrumbTarget/);
    assert.match(ia, /AREA_PROFIL_INITIAL_VIEW/);
    assert.equal(ia.includes('export const AREA_PROFIL_INITIAL_VIEW: AreaProfilView = "kabupaten"'), true);
    assert.equal(/pmtiles|retile/i.test(panel), false);
  });
});
