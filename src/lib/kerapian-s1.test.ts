import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { MAP_LAYERS_CATALOG } from "./map-layers-catalog";
import { qk } from "./qk";

const root = process.cwd();

const SIK_CALON_KEYS = [
  "title",
  "lead",
  "navFromList",
  "overviewTitle",
  "overviewBody",
  "tabDraf",
  "tabDitolak",
  "tabDiterima",
  "colNama",
  "colSumber",
  "colLayer",
  "colWaktu",
  "colKabupaten",
  "colTautan",
  "colAsal",
  "colAksi",
  "belumTerikat",
  "tautanUtuh",
  "tautanPutus",
  "asalOtomatis",
  "asalManual",
  "empty",
  "loading",
  "loadError",
  "actionTerima",
  "actionTolak",
  "actionBatal",
  "actionKirimTerima",
  "actionKirimTolak",
  "formTerimaTitle",
  "formTolakTitle",
  "fieldKabupaten",
  "fieldKabupatenEmpty",
  "fieldWaktuTanggal",
  "fieldWaktuJam",
  "fieldJenis",
  "fieldJenisEmpty",
  "fieldNama",
  "fieldAlasan",
  "errorKabupatenWajib",
  "errorWaktuWajib",
  "errorJenisWajib",
  "errorTerima",
  "errorTolak",
] as const;

const SIK_SDB_KEYS = [
  "title",
  "lead",
  "navFromList",
  "banner",
  "colKunci",
  "colJudul",
  "colKonsep",
  "colDefinisi",
  "colSatuan",
  "colKlaster",
  "colKelasAkses",
  "colProdusen",
  "colPeriodeKirim",
  "colKodeReferensi",
  "colTabelSumber",
  "empty",
  "loading",
  "loadError",
  "kelasTerbuka",
  "kelasTerbatas",
  "kelasRahasia",
] as const;

const MAP_OVERLAY_KEYS = [
  "geospasial",
  "overlayLiveStale",
  "overlayLiveUpstream",
  "overlayLiveFailed",
  "overlayLiveStaleHint",
  "overlayLiveUpstreamHint",
  "overlayLiveRetry",
  "overlayAttribution",
  "overlayForecastLoading",
  "overlayForecastMissing",
  "overlayWaveCat",
  "overlayWaveHeight",
  "overlayWind",
  "overlayStale",
  "overlayBmkgCredit",
] as const;

function loadMessages() {
  return {
    id: JSON.parse(readFileSync(path.join(root, "messages/id.json"), "utf8")) as Record<
      string,
      Record<string, string>
    >,
    en: JSON.parse(readFileSync(path.join(root, "messages/en.json"), "utf8")) as Record<
      string,
      Record<string, string>
    >,
  };
}

describe("AN-26 FE-20 i18n", () => {
  it("sikCalon has AN-6 keys in both locales and no extras", () => {
    const { id, en } = loadMessages();
    assert.ok(id.sikCalon);
    assert.ok(en.sikCalon);
    assert.deepEqual(Object.keys(id.sikCalon).sort(), [...SIK_CALON_KEYS].sort());
    assert.deepEqual(Object.keys(en.sikCalon).sort(), [...SIK_CALON_KEYS].sort());
  });

  it("sikSdb has FE-9 keys in both locales and no extras", () => {
    const { id, en } = loadMessages();
    assert.ok(id.sikSdb);
    assert.ok(en.sikSdb);
    assert.deepEqual(Object.keys(id.sikSdb).sort(), [...SIK_SDB_KEYS].sort());
    assert.deepEqual(Object.keys(en.sikSdb).sort(), [...SIK_SDB_KEYS].sort());
  });

  it("map overlay keys called by toolbar exist in both locales", () => {
    const { id, en } = loadMessages();
    for (const key of MAP_OVERLAY_KEYS) {
      assert.equal(typeof id.map[key], "string", `id map.${key}`);
      assert.equal(typeof en.map[key], "string", `en map.${key}`);
    }
  });

  it("hazards namespace is gone", () => {
    const { id, en } = loadMessages();
    assert.equal("hazards" in id, false);
    assert.equal("hazards" in en, false);
  });
});

describe("AN-26 FE-21 routing", () => {
  it("registers calon and sdb pathnames", () => {
    const src = readFileSync(path.join(root, "src/i18n/routing.ts"), "utf8");
    assert.match(src, /"\/admin\/sik\/kejadian\/calon"/);
    assert.match(src, /"\/admin\/sik\/sdb"/);
  });

  it("does not add calon or sdb to AdminShell items", () => {
    const src = readFileSync(path.join(root, "src/components/admin/AdminShell.tsx"), "utf8");
    assert.equal(src.includes("/admin/sik/kejadian/calon"), false);
    assert.equal(src.includes("/admin/sik/sdb"), false);
  });
});

describe("AN-26 DATA-18 / BE-24", () => {
  it("catalog /fixtures/ paths exist and jembatan.json is not referenced", () => {
    const missing: string[] = [];
    for (const row of MAP_LAYERS_CATALOG) {
      const src = row.source_path;
      if (!src || !src.startsWith("/fixtures/")) continue;
      const disk = path.join(root, "public", src.replace(/^\//, ""));
      if (!existsSync(disk)) missing.push(`${row.key}:${src}`);
    }
    assert.deepEqual(missing, []);
    const jembatan = MAP_LAYERS_CATALOG.find((row) => row.key === "infraRoadBridge");
    assert.ok(jembatan);
    assert.equal(jembatan?.source_path, "/fixtures/markers.geojson");
    assert.equal(existsSync(path.join(root, "public/fixtures/jembatan.json")), false);
  });

  it("boundaries stub is not present and not read at runtime", () => {
    const stub = path.join(root, "public/fixtures/boundaries-aceh-stub.geojson");
    const route = readFileSync(path.join(root, "src/app/api/boundaries/route.ts"), "utf8");
    assert.equal(existsSync(stub), false);
    assert.equal(route.includes("boundaries-aceh-stub.geojson"), false);
    assert.equal(route.includes("boundaries-aceh-kab.geojson"), true);
  });

  it("qk.hazards must not exist", () => {
    assert.equal("hazards" in qk, false);
  });
});
