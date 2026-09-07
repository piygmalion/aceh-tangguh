import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { CALON_LAYER_KEYS } from "@/lib/overlay-calon";
import { ACEH_PERAIRAN_CODES } from "@/lib/overlay-layers";
import { outlookPeakWaveCat, pickCurrentSlot } from "@/lib/maritime";
import {
  PDGT_NASIONAL_URL,
  buildMaritimCardFromWaters,
  emptyMaritimCard,
  filterAcehBulletinWaters,
  matchAcehPerairan,
  parsePdgtBulletin,
  toneFromWaveCat,
  unavailableMaritimCard,
  worstWaveCat,
} from "./maritim-parse";

const ROOT = process.cwd();
const SNIPPET = readFileSync(
  join(ROOT, "src/lib/peringatan-dini/testdata/pdgt-nasional-snippet.md"),
  "utf8",
);
const NO_ACEH = readFileSync(
  join(ROOT, "src/lib/peringatan-dini/testdata/pdgt-nasional-no-aceh.md"),
  "utf8",
);
const MIXED = readFileSync(
  join(ROOT, "src/lib/peringatan-dini/testdata/pdgt-mixed-tone.md"),
  "utf8",
);

describe("AN-36 parse PDGT + filter Aceh", () => {
  it("maps Aceh names and Indonesia M.01/M.03, drops Jawa and M.02", () => {
    const parsed = parsePdgtBulletin(SNIPPET);
    const aceh = filterAcehBulletinWaters(parsed);
    const kodes = aceh.map((row) => row.kode).sort();
    assert.deepEqual(kodes, ["M.01", "M.03", "P.A.04", "P.A.05", "P.A.06", "P.A.07"]);
    assert.equal(aceh.some((row) => /Jawa/i.test(row.nama)), false);
    assert.equal(aceh.some((row) => row.kode === "M.02"), false);
    assert.equal(
      aceh.every((row) => row.kode && (ACEH_PERAIRAN_CODES as readonly string[]).includes(row.kode)),
      true,
    );
  });

  it("matches allowlist aliases and rejects Selat Malaka tengah", () => {
    assert.equal(matchAcehPerairan("Perairan Aceh Besar–Meulaboh"), "P.A.05");
    assert.equal(matchAcehPerairan("Perairan Sabang Banda Aceh"), "P.A.04");
    assert.equal(matchAcehPerairan("Selat Malaka bagian utara"), "M.01");
    assert.equal(matchAcehPerairan("Samudera Hindia barat Aceh"), "M.03");
    assert.equal(matchAcehPerairan("Selat Malaka bagian tengah"), null);
    assert.equal(matchAcehPerairan("Perairan utara Jawa"), null);
  });

  it("reads official range and validity from the bulletin, not from a forecast slot", () => {
    const parsed = parsePdgtBulletin(SNIPPET);
    const aceh = filterAcehBulletinWaters(parsed);
    const meulaboh = aceh.find((row) => row.kode === "P.A.05");
    assert.ok(meulaboh);
    assert.equal(meulaboh.wave_cat.toLowerCase(), "sedang");
    assert.equal(meulaboh.wave_min_m, 1.25);
    assert.equal(meulaboh.wave_max_m, 2.5);
    assert.ok(parsed.valid_from);
    assert.ok(parsed.valid_to);
    const slot = pickCurrentSlot({
      code: "P.A.05",
      forecast_day1: [{ time: "2026-09-06 00:00 UTC", wave_cat: "Tinggi", wave_height: 3.1 }],
    });
    assert.equal(slot?.wave_height, 3.1);
    assert.notEqual(meulaboh.wave_max_m, slot?.wave_height);
  });
});

describe("AN-36 tone, kosong sah, unavailable", () => {
  it("uses BMKG categories only: Sedang=warn, worse=danger", () => {
    assert.equal(toneFromWaveCat("Sedang"), "warn");
    assert.equal(toneFromWaveCat("Tinggi"), "danger");
    assert.equal(toneFromWaveCat("Sangat tinggi"), "danger");
    assert.equal(toneFromWaveCat("Ekstrem"), "danger");
    assert.equal(worstWaveCat(["Sedang", "Tinggi", "Sangat tinggi"]), "Sangat tinggi");
  });

  it("picks the worst Aceh/M.01/M.03 category for the card tone", () => {
    const aceh = filterAcehBulletinWaters(parsePdgtBulletin(MIXED));
    const card = buildMaritimCardFromWaters(aceh, {
      fetchedAt: "2026-09-08T00:00:00.000Z",
      source: "live",
    });
    assert.equal(card.kind, "maritim");
    assert.equal(card.empty, false);
    assert.equal(card.tone, "danger");
    assert.equal(card.source, "live");
    assert.equal(card.stale, false);
    assert.equal(card.href, PDGT_NASIONAL_URL);
    assert.match(card.map_href, /overlays=maritimeWaters/);
    assert.equal(card.href.includes("#cuaca"), false);
    const hindia = card.highlights.find((row) => row.kode === "M.03");
    assert.equal(hindia?.wave_cat.toLowerCase(), "sangat tinggi");
    assert.equal(hindia?.wave_min_m, 4);
    assert.equal(hindia?.wave_max_m, 6);
  });

  it("treats a live bulletin with no Aceh/M.01/M.03 rows as empty, not unavailable", () => {
    const aceh = filterAcehBulletinWaters(parsePdgtBulletin(NO_ACEH));
    const card = buildMaritimCardFromWaters(aceh, {
      fetchedAt: "2026-09-08T00:00:00.000Z",
      source: "live",
    });
    assert.equal(card.empty, true);
    assert.equal(card.source, "live");
    assert.equal(card.stale, false);
    assert.equal(card.tone, "neutral");
    assert.equal(card.highlights.length, 0);
  });

  it("fail-closes like MAGMA: unavailable does not copy leftover or forecast slots", () => {
    const leftover = filterAcehBulletinWaters(parsePdgtBulletin(SNIPPET));
    const card = unavailableMaritimCard("2026-09-08T00:00:00.000Z");
    assert.equal(card.empty, true);
    assert.equal(card.source, "unavailable");
    assert.equal(card.stale, true);
    assert.equal(card.tone, "neutral");
    assert.equal(card.highlights.length, 0);
    assert.equal(card.href, PDGT_NASIONAL_URL);
    assert.notEqual(leftover.length, 0);
    const empty = emptyMaritimCard("2026-09-08T00:00:00.000Z");
    assert.equal(empty.source, "live");
    assert.equal(empty.stale, false);
  });
});

describe("AN-36 isolasi jalur A / calon / persist", () => {
  it("does not add maritime layers to CALON_LAYER_KEYS", () => {
    assert.deepEqual([...CALON_LAYER_KEYS], [
      "bmkgQuakes",
      "magmaQuakes",
      "sipongiHotspots",
      "tatonasStations",
    ]);
    assert.equal((CALON_LAYER_KEYS as readonly string[]).includes("maritimeWaters"), false);
    assert.equal((CALON_LAYER_KEYS as readonly string[]).includes("maritimePorts"), false);
  });

  it("outlook peak is text-only and does not outrank the current slot color helper", () => {
    const peak = outlookPeakWaveCat([
      { wave_cat: "Sedang", wave_height: 2.1 },
      { wave_cat: "Tinggi", wave_height: 2.6 },
      { wave_cat: "Sedang", wave_height: 2.2 },
    ]);
    assert.equal(peak?.toLowerCase(), "tinggi");
    const slot = pickCurrentSlot({
      code: "M.03",
      forecast_day1: [{ time: "2026-09-06 00:00 UTC", wave_cat: "Sedang", wave_height: 2.1 }],
      "forecast_day2-4": [{ time: "2026-09-08 00:00 UTC", wave_cat: "Tinggi", wave_height: 2.6 }],
    }, Date.parse("2026-09-06T00:30:00Z"));
    assert.equal(slot?.wave_cat, "Sedang");
  });

  it("GET warning path does not persist; cron refresh does", () => {
    const service = readFileSync(join(ROOT, "src/lib/peringatan-dini/maritim.ts"), "utf8");
    const loadFn = service.slice(
      service.indexOf("export async function getMaritimPeringatan"),
      service.indexOf("export async function refreshMaritimeWarnings"),
    );
    assert.match(loadFn, /maritime_warning_cache/);
    assert.equal(loadFn.includes("upsert"), false);
    assert.equal(loadFn.includes("fetchPdgt"), false);
    const refreshFn = service.slice(service.indexOf("export async function refreshMaritimeWarnings"));
    assert.match(refreshFn, /upsert/);
    assert.doesNotMatch(refreshFn, /overlay_live_features|overlay_calon_kejadian/);
    const pdGet = readFileSync(join(ROOT, "src/app/api/peringatan-dini/route.ts"), "utf8");
    const overlay = readFileSync(
      join(ROOT, "src/app/api/overlay/maritime/perairan/route.ts"),
      "utf8",
    );
    assert.equal(pdGet.includes("refreshMaritimeWarnings"), false);
    assert.equal(overlay.includes("refreshMaritimeWarnings"), false);
    assert.equal(overlay.includes("refreshMaritimeForecasts"), false);
  });

  it("migration is new, has warning cache + purge, and does not edit 20260910", () => {
    const path = join(ROOT, "supabase/migrations/20260928_maritime_warning_cache.sql");
    assert.equal(existsSync(path), true);
    const sql = readFileSync(path, "utf8");
    assert.match(sql, /maritime_warning_cache/);
    assert.match(sql, /external_id/);
    assert.match(sql, /expires_at/);
    assert.match(sql, /purge_expired_overlay_rows/);
    assert.match(sql, /revoke all on function public\.purge_expired_overlay_rows\(\)/);
    assert.doesNotMatch(sql, /insert into public\.overlay_live_features/i);
    assert.doesNotMatch(sql, /20260910_overlay_layers/);
    const old = readFileSync(join(ROOT, "supabase/migrations/20260910_overlay_layers.sql"), "utf8");
    assert.doesNotMatch(old, /maritime_warning_cache/);
  });
});
