import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import {
  AREA_PROFIL_CRUMBS,
  AREA_PROFIL_INITIAL_VIEW,
  AREA_PROFIL_ROUTES,
  AREA_PROFIL_VIEWS,
  areaProfilBack,
  areaProfilBreadcrumbEnabled,
  areaProfilBreadcrumbTarget,
  areaProfilViewOnOpen,
  kabupatenNameFromSelection,
  profilDesaApiPath,
  profilDesaSearchParams,
  profilKabupatenSearchParams,
  profilKecamatanSearchParams,
} from "./area-profil-ia";
import type { VillageClickSelection } from "./profil-desa";

const ROOT = process.cwd();

function sel(
  partial: Partial<VillageClickSelection> & Pick<VillageClickSelection, "name">
): VillageClickSelection {
  return {
    kabupaten: "",
    kecamatan: "",
    ...partial,
  };
}

describe("signed Distribusi area panel IA", () => {
  it("locks three views only and always opens at kabupaten", () => {
    assert.deepEqual(AREA_PROFIL_VIEWS, ["kabupaten", "kecamatan", "desa"]);
    assert.equal(AREA_PROFIL_INITIAL_VIEW, "kabupaten");
    assert.equal(AREA_PROFIL_VIEWS.includes("desa-list" as never), false);

    const desaClick = sel({
      name: "Keude Bakongan",
      kabupaten: "Aceh Selatan",
      kecamatan: "Bakongan",
      kodeDesa: "1101012001",
      kodeKecamatan: "110101",
      level: "desa",
    });
    const kecClick = sel({
      name: "Bakongan",
      kabupaten: "Aceh Selatan",
      kecamatan: "Bakongan",
      level: "kecamatan",
    });
    const kabPolygon = sel({
      name: "Aceh Barat",
      level: "kab",
    });

    assert.equal(areaProfilViewOnOpen(desaClick), "kabupaten");
    assert.equal(areaProfilViewOnOpen(kecClick), "kabupaten");
    assert.equal(areaProfilViewOnOpen(kabPolygon), "kabupaten");
    assert.equal(areaProfilViewOnOpen(null), "kabupaten");
  });

  it("backs desa → kec → kab → close", () => {
    assert.equal(areaProfilBack("desa"), "kecamatan");
    assert.equal(areaProfilBack("kecamatan"), "kabupaten");
    assert.equal(areaProfilBack("kabupaten"), "close");
  });

  it("makes Kab · Kec · Desa crumbs clickable only after that level is reached", () => {
    assert.deepEqual(AREA_PROFIL_CRUMBS, ["Kab", "Kec", "Desa"]);

    const none = { kecamatan: false, desa: false };
    const kecReached = { kecamatan: true, desa: false };
    const desaReached = { kecamatan: true, desa: true };

    assert.equal(areaProfilBreadcrumbEnabled("kabupaten", "kabupaten", none), true);
    assert.equal(areaProfilBreadcrumbEnabled("kabupaten", "kecamatan", none), false);
    assert.equal(areaProfilBreadcrumbEnabled("kabupaten", "desa", none), false);
    assert.equal(
      areaProfilBreadcrumbTarget("kabupaten", "kabupaten", none),
      null
    );

    assert.equal(
      areaProfilBreadcrumbEnabled("kecamatan", "kabupaten", kecReached),
      true
    );
    assert.equal(
      areaProfilBreadcrumbTarget("kecamatan", "kabupaten", kecReached),
      "kabupaten"
    );
    assert.equal(
      areaProfilBreadcrumbTarget("kecamatan", "kecamatan", kecReached),
      null
    );
    assert.equal(
      areaProfilBreadcrumbEnabled("kecamatan", "desa", kecReached),
      false
    );

    assert.equal(
      areaProfilBreadcrumbTarget("desa", "kecamatan", desaReached),
      "kecamatan"
    );
    assert.equal(
      areaProfilBreadcrumbTarget("desa", "kabupaten", desaReached),
      "kabupaten"
    );
    assert.equal(areaProfilBreadcrumbTarget("desa", "desa", desaReached), null);
  });

  it("uses existing /api/profil-desa query params and does not invent kodes", () => {
    assert.equal(AREA_PROFIL_ROUTES.kabupaten, "/api/profil-desa/kabupaten");
    assert.equal(AREA_PROFIL_ROUTES.kecamatan, "/api/profil-desa/kecamatan");
    assert.equal(AREA_PROFIL_ROUTES.desa, "/api/profil-desa/desa");

    const desaClick = sel({
      name: "Keude Bakongan",
      kabupaten: "Aceh Selatan",
      kecamatan: "Bakongan",
      kodeDesa: "1101012001",
      kodeKecamatan: "110101",
      kodeKabupaten: "1101",
      level: "desa",
    });

    const kab = profilKabupatenSearchParams(desaClick);
    assert.deepEqual(Array.from(kab.keys()).sort(), ["kabupaten", "kode_kabupaten"]);
    assert.equal(kab.get("kabupaten"), "Aceh Selatan");
    assert.equal(kab.get("kode_kabupaten"), "1101");
    assert.equal(
      profilDesaApiPath("kabupaten", kab),
      "/api/profil-desa/kabupaten?kabupaten=Aceh+Selatan&kode_kabupaten=1101"
    );

    const kec = profilKecamatanSearchParams({
      kabupaten: "Aceh Selatan",
      kecamatan: "Bakongan",
      kodeKecamatan: "110101",
    });
    assert.deepEqual(Array.from(kec.keys()).sort(), [
      "kabupaten",
      "kecamatan",
      "kode_kecamatan",
    ]);
    assert.equal(
      profilDesaApiPath("kecamatan", kec),
      "/api/profil-desa/kecamatan?kabupaten=Aceh+Selatan&kecamatan=Bakongan&kode_kecamatan=110101"
    );

    const desa = profilDesaSearchParams({
      id: "row-1",
      kode: "1101012001",
      nama: "Keude Bakongan",
      kabupaten: "Aceh Selatan",
      kecamatan: "Bakongan",
    });
    assert.deepEqual(Array.from(desa.keys()).sort(), [
      "id",
      "kabupaten",
      "kecamatan",
      "kode",
      "nama",
    ]);
    assert.equal(desa.has("kode_desa"), false);
    assert.equal(desa.has("kode_desa_kelurahan"), false);
  });

  it("resolves kabupaten polygons that only stamp name + level", () => {
    const kabPolygon = sel({ name: "Aceh Barat", level: "kab" });
    assert.equal(kabupatenNameFromSelection(kabPolygon), "Aceh Barat");
    const params = profilKabupatenSearchParams(kabPolygon);
    assert.equal(params.get("kabupaten"), "Aceh Barat");
    assert.equal(params.has("kode_kabupaten"), false);
  });
});

describe("AreaProfilPanel source lock", () => {
  const panel = readFileSync(
    path.join(ROOT, "src/components/map/AreaProfilPanel.tsx"),
    "utf8"
  );
  const viewport = readFileSync(
    path.join(ROOT, "src/components/map/MapViewport.tsx"),
    "utf8"
  );
  const id = readFileSync(path.join(ROOT, "messages/id.json"), "utf8");
  const en = readFileSync(path.join(ROOT, "messages/en.json"), "utf8");

  it("drops desa-list and the viewDesa footer", () => {
    assert.equal(panel.includes("desa-list"), false);
    assert.equal(panel.includes("viewDesa"), false);
    assert.match(panel, /useState<AreaProfilView>\(AREA_PROFIL_INITIAL_VIEW\)/);
    assert.match(panel, /areaProfilViewOnOpen/);
    assert.match(panel, /crumbKab/);
    assert.match(panel, /crumbKec/);
    assert.match(panel, /crumbDesa/);
    assert.match(panel, /t\("empty"\)/);
    assert.match(panel, /t\("emptyHint"\)/);
    assert.match(panel, /t\("unknown"\)/);
    assert.match(panel, /kecamatan_list/);
  });

  it("keeps Empty / Belum Diketahui copy and Kab · Kec · Desa crumbs", () => {
    const idJson = JSON.parse(id) as { profilDesa: Record<string, string> };
    const enJson = JSON.parse(en) as { profilDesa: Record<string, string> };
    assert.equal(
      idJson.profilDesa.empty,
      "Profil desa belum tersedia untuk wilayah ini."
    );
    assert.equal(
      idJson.profilDesa.emptyHint,
      "Data agregat kecamatan dimuat dari tabel profil desa."
    );
    assert.equal(idJson.profilDesa.unknown, "Belum Diketahui");
    assert.equal(idJson.profilDesa.crumbKab, "Kab");
    assert.equal(idJson.profilDesa.crumbKec, "Kec");
    assert.equal(idJson.profilDesa.crumbDesa, "Desa");
    assert.equal(enJson.profilDesa.crumbKab, "Kab");
    assert.equal(enJson.profilDesa.crumbKec, "Kec");
    assert.equal(enJson.profilDesa.crumbDesa, "Desa");
    assert.equal(enJson.profilDesa.unknown, "Unknown");
  });

  it("forwards existing kode_kabupaten from map clicks without inventing codes", () => {
    assert.match(viewport, /kodeKabupaten/);
    assert.match(viewport, /kode_kabupaten/);
    assert.equal(/["']kode_kab["']/.test(viewport), false);
  });
});
