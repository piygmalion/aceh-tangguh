import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import {
  AREA_PROFIL_CRUMBS,
  AREA_PROFIL_INITIAL_VIEW,
  AREA_PROFIL_ROUTES,
  AREA_PROFIL_VIEWS,
  PROFIL_FORBIDDEN_QUERY_KEYS,
  PROFIL_QUERY_KEYS,
  areaProfilBack,
  areaProfilBreadcrumbLevels,
  areaProfilBreadcrumbTarget,
  areaProfilViewOnOpen,
  kabupatenNameFromSelection,
  profilDesaApiPath,
  profilDesaSearchParams,
  profilKabupatenSearchParams,
  profilKecamatanSearchParams,
} from "./area-profil-ia";
import {
  sortKecamatanListItems,
  type KecamatanListItem,
  type VillageClickSelection,
} from "./profil-desa";

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
  it("opens at kabupaten when selection.kabupaten is set, even if the click was a desa", () => {
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

    assert.equal(areaProfilViewOnOpen(desaClick), "kabupaten");
    assert.equal(areaProfilViewOnOpen(kecClick), "kabupaten");
    assert.equal(desaClick.kabupaten.trim().length > 0, true);
  });

  it("backs desa → kecamatan → kabupaten → close", () => {
    assert.equal(areaProfilBack("desa"), "kecamatan");
    assert.equal(areaProfilBack("kecamatan"), "kabupaten");
    assert.equal(areaProfilBack("kabupaten"), "close");
  });

  it("omits missing breadcrumb levels; ancestors are buttons, current is text", () => {
    assert.deepEqual(AREA_PROFIL_CRUMBS, ["Kab", "Kec", "Desa"]);
    assert.deepEqual(areaProfilBreadcrumbLevels("kabupaten"), ["kabupaten"]);
    assert.deepEqual(areaProfilBreadcrumbLevels("kecamatan"), [
      "kabupaten",
      "kecamatan",
    ]);
    assert.deepEqual(areaProfilBreadcrumbLevels("desa"), [
      "kabupaten",
      "kecamatan",
      "desa",
    ]);

    assert.equal(areaProfilBreadcrumbTarget("kabupaten", "kabupaten"), null);
    assert.equal(areaProfilBreadcrumbTarget("kabupaten", "kecamatan"), null);
    assert.equal(areaProfilBreadcrumbTarget("kabupaten", "desa"), null);

    assert.equal(areaProfilBreadcrumbTarget("kecamatan", "kabupaten"), "kabupaten");
    assert.equal(areaProfilBreadcrumbTarget("kecamatan", "kecamatan"), null);
    assert.equal(areaProfilBreadcrumbTarget("kecamatan", "desa"), null);

    assert.equal(areaProfilBreadcrumbTarget("desa", "kabupaten"), "kabupaten");
    assert.equal(areaProfilBreadcrumbTarget("desa", "kecamatan"), "kecamatan");
    assert.equal(areaProfilBreadcrumbTarget("desa", "desa"), null);
  });

  it("sorts kecamatan_list rusak desc, then nama with id locale", () => {
    const items: KecamatanListItem[] = [
      {
        kecamatan: "Bakongan",
        kode_kecamatan: "110101",
        desa_count: 2,
        badge: "tidak_diketahui",
        total_rumah_rusak: 10,
      },
      {
        kecamatan: "Trumon",
        kode_kecamatan: "110102",
        desa_count: 3,
        badge: "terdampak",
        total_rumah_rusak: 40,
      },
      {
        kecamatan: "Kluet Utara",
        kode_kecamatan: "110103",
        desa_count: 1,
        badge: "terdampak",
        total_rumah_rusak: 40,
      },
      {
        kecamatan: "Tapaktuan",
        kode_kecamatan: null,
        desa_count: 1,
        badge: "tidak_diketahui",
        total_rumah_rusak: null,
      },
    ];
    assert.deepEqual(
      sortKecamatanListItems(items).map((row) => row.kecamatan),
      ["Kluet Utara", "Trumon", "Bakongan", "Tapaktuan"]
    );
  });

  it("keeps backend-confirmed query params stable and adds no routes", () => {
    assert.deepEqual(PROFIL_QUERY_KEYS.kabupaten, [
      "kabupaten",
      "kode_kabupaten",
    ]);
    assert.deepEqual(PROFIL_QUERY_KEYS.kecamatan, [
      "kabupaten",
      "kecamatan",
      "kode_kecamatan",
    ]);
    assert.equal((PROFIL_QUERY_KEYS.desa as readonly string[]).includes("kode"), true);
    assert.equal(
      (PROFIL_QUERY_KEYS.desa as readonly string[]).includes("kode_desa_kelurahan"),
      false
    );
    assert.deepEqual(PROFIL_FORBIDDEN_QUERY_KEYS, [
      "kode_desa_kelurahan",
      "kode_desa",
    ]);

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
    assert.deepEqual(Array.from(kab.keys()).sort(), [
      "kabupaten",
      "kode_kabupaten",
    ]);
    assert.equal(kab.get("kabupaten"), "Aceh Selatan");
    assert.equal(kab.get("kode_kabupaten"), "1101");
    assert.equal(
      profilDesaApiPath("kabupaten", kab),
      "/api/profil-desa/kabupaten?kabupaten=Aceh+Selatan&kode_kabupaten=1101"
    );

    const kecByName = profilKecamatanSearchParams({
      kabupaten: "Aceh Selatan",
      kecamatan: "Bakongan",
    });
    assert.deepEqual(Array.from(kecByName.keys()).sort(), [
      "kabupaten",
      "kecamatan",
    ]);
    const kecByKode = profilKecamatanSearchParams({
      kodeKecamatan: "110101",
    });
    assert.deepEqual(Array.from(kecByKode.keys()), ["kode_kecamatan"]);

    const desa = profilDesaSearchParams({
      kode: "1101012001",
    });
    assert.deepEqual(Array.from(desa.keys()), ["kode"]);
    assert.equal(desa.get("kode"), "1101012001");
    assert.equal(
      profilDesaApiPath("desa", desa),
      "/api/profil-desa/desa?kode=1101012001"
    );
    for (const forbidden of PROFIL_FORBIDDEN_QUERY_KEYS) {
      assert.equal(desa.has(forbidden), false);
      assert.equal(kab.has(forbidden), false);
      assert.equal(kecByName.has(forbidden), false);
    }
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
    assert.equal(panel.includes("locationLine"), false);
    assert.match(panel, /useState<AreaProfilView>\(AREA_PROFIL_INITIAL_VIEW\)/);
    assert.match(panel, /areaProfilViewOnOpen/);
    assert.match(panel, /areaProfilBreadcrumbLevels/);
    assert.match(panel, /TYPE_FLOOR_CLASS/);
    assert.match(panel, /clickedHint/);
    assert.match(panel, /t\("empty"\)/);
    assert.match(panel, /t\("emptyHint"\)/);
    assert.match(panel, /t\("unknown"\)/);
    assert.match(panel, /kecamatan_list/);
    assert.match(panel, /sortKecamatanListItems/);
    assert.match(panel, /desaCount/);
    assert.match(panel, /Escape/);
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

  it("reads the confirmed query keys on the three existing profil-desa routes", () => {
    const kabRoute = readFileSync(
      path.join(ROOT, "src/app/api/profil-desa/kabupaten/route.ts"),
      "utf8"
    );
    const kecRoute = readFileSync(
      path.join(ROOT, "src/app/api/profil-desa/kecamatan/route.ts"),
      "utf8"
    );
    const desaRoute = readFileSync(
      path.join(ROOT, "src/app/api/profil-desa/desa/route.ts"),
      "utf8"
    );

    assert.match(kabRoute, /sp\.get\("kode_kabupaten"\)/);
    assert.match(kabRoute, /sp\.get\("kabupaten"\)/);
    assert.match(kecRoute, /sp\.get\("kabupaten"\)/);
    assert.match(kecRoute, /sp\.get\("kecamatan"\)/);
    assert.match(kecRoute, /sp\.get\("kode_kecamatan"\)/);
    assert.match(desaRoute, /sp\.get\("kode"\)/);
    assert.equal(/sp\.get\("kode_desa_kelurahan"\)/.test(desaRoute), false);
    assert.equal(/sp\.get\("kode_desa"\)/.test(desaRoute), false);

    assert.match(panel, /profilKabupatenSearchParams/);
    assert.match(panel, /profilKecamatanSearchParams/);
    assert.match(panel, /profilDesaSearchParams/);
    assert.equal(/params\.set\("kode_desa_kelurahan"/.test(panel), false);
  });
});
