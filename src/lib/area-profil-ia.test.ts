import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import {
  AREA_PROFIL_CRUMBS,
  AREA_PROFIL_INITIAL_VIEW,
  AREA_PROFIL_ROUTES,
  AREA_PROFIL_VIEWS,
  NULL_KODE_DESA_NAMES,
  PROFIL_FORBIDDEN_QUERY_KEYS,
  PROFIL_QUERY_KEYS,
  areaProfilBack,
  areaProfilBreadcrumbLevels,
  areaProfilBreadcrumbTarget,
  areaProfilViewOnOpen,
  desaShowsCensus,
  hasKabupatenQuery,
  kabupatenNameFromSelection,
  profilDesaApiPath,
  profilDesaLookupParams,
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
  it("opens at the clicked LOD instead of always kabupaten", () => {
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
      kodeKecamatan: "110101",
      level: "kecamatan",
    });
    const kabClick = sel({
      name: "Aceh Selatan",
      kabupaten: "Aceh Selatan",
      level: "kab",
      kodeKabupaten: "1101",
    });

    assert.equal(areaProfilViewOnOpen(desaClick), "desa");
    assert.equal(areaProfilViewOnOpen(kecClick), "kecamatan");
    assert.equal(areaProfilViewOnOpen(kabClick), "kabupaten");
    assert.equal(
      desaShowsCensus({
        korban_meninggal: null,
        korban_hilang: null,
        rumah_rr: null,
        rumah_rs: null,
        rumah_rb: null,
      }),
      true
    );
    assert.equal(
      desaShowsCensus({
        korban_meninggal: 1,
        korban_hilang: null,
        rumah_rr: null,
        rumah_rs: null,
        rumah_rb: null,
      }),
      false
    );
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
    assert.deepEqual(Array.from(kab.keys()), ["kabupaten"]);
    assert.equal(kab.get("kabupaten"), "Aceh Selatan");
    assert.equal(kab.has("kode_kabupaten"), false);
    assert.equal(
      profilDesaApiPath("kabupaten", kab),
      "/api/profil-desa/kabupaten?kabupaten=Aceh+Selatan"
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

    assert.deepEqual(Object.keys(AREA_PROFIL_ROUTES), [
      "kabupaten",
      "kecamatan",
      "desa",
    ]);
    assert.equal(
      Object.values(AREA_PROFIL_ROUTES).some((path) => /list|all/i.test(path)),
      false
    );
  });

  it("looks up coded desa with ?kode= and the four null-kode rows with ?id=", () => {
    assert.deepEqual(NULL_KODE_DESA_NAMES, [
      "Lawe Sarap",
      "Perapat Tinggi",
      "Ise-ise",
      "Meunasah Cut",
    ]);

    const coded = profilDesaLookupParams({
      id: "PDESA-000001",
      kode: "1101012001",
      nama: "Keude Bakongan",
    });
    assert.deepEqual(Array.from(coded.keys()), ["kode"]);
    assert.equal(coded.get("kode"), "1101012001");
    assert.equal(coded.has("id"), false);

    for (const nama of NULL_KODE_DESA_NAMES) {
      const params = profilDesaLookupParams({
        id: `profil-null-${nama}`,
        kode: null,
        nama,
        kabupaten: "Aceh Tenggara",
      });
      assert.deepEqual(Array.from(params.keys()), ["id"]);
      assert.equal(params.get("id"), `profil-null-${nama}`);
      assert.equal(params.has("kode"), false);
      assert.equal(params.has("kode_desa_kelurahan"), false);
      assert.match(
        profilDesaApiPath("desa", params),
        /^\/api\/profil-desa\/desa\?id=/
      );
    }

    const byNama = profilDesaLookupParams({
      nama: "Keude Bakongan",
      kabupaten: "Aceh Selatan",
      kecamatan: "Bakongan",
    });
    assert.equal(byNama.get("nama"), "Keude Bakongan");
    assert.equal(byNama.has("kode"), false);
    assert.equal(byNama.has("id"), false);
  });

  it("does not list all kabupaten — query needs kabupaten or kode_kabupaten", () => {
    const empty = profilKabupatenSearchParams(sel({ name: "" }));
    assert.equal(hasKabupatenQuery(empty), false);
    assert.equal(empty.toString(), "");
    const named = profilKabupatenSearchParams(
      sel({ name: "Keude Bakongan", kabupaten: "Aceh Selatan" })
    );
    assert.equal(hasKabupatenQuery(named), true);
  });

  it("resolves kabupaten polygons that only stamp name + level", () => {
    const kabPolygon = sel({ name: "Aceh Barat", level: "kab" });
    assert.equal(kabupatenNameFromSelection(kabPolygon), "Aceh Barat");
    const params = profilKabupatenSearchParams(kabPolygon);
    assert.equal(params.get("kabupaten"), "Aceh Barat");
    assert.equal(params.has("kode_kabupaten"), false);
  });

  it("looks up kab polygons by name, not dissolve kode_kab that can disagree", () => {
    const pidie = sel({
      name: "Pidie",
      kabupaten: "Pidie",
      level: "kab",
      kodeKabupaten: "1109",
    });
    const params = profilKabupatenSearchParams(pidie);
    assert.equal(params.get("kabupaten"), "Pidie");
    assert.equal(params.has("kode_kabupaten"), false);
    assert.equal(
      profilKabupatenSearchParams(
        sel({ name: "", level: "kab", kodeKabupaten: "1108" })
      ).get("kode_kabupaten"),
      "1108"
    );
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

  it("opens at the clicked LOD and keeps lists behind Lihat Detail", () => {
    assert.equal(panel.includes("desa-list"), false);
    assert.equal(panel.includes("viewDesa"), false);
    assert.equal(panel.includes("locationLine"), false);
    assert.match(panel, /useState<AreaProfilView>\(AREA_PROFIL_INITIAL_VIEW\)/);
    assert.match(panel, /areaProfilViewOnOpen/);
    assert.match(panel, /areaProfilBreadcrumbLevels/);
    assert.match(panel, /from ["']@\/components\/ui\/button["']/);
    assert.equal(/button-legacy/.test(panel), false);
    assert.match(panel, /TYPE_FLOOR_CLASS/);
    assert.match(panel, /clickedHint/);
    assert.match(panel, /t\("empty"\)/);
    assert.match(panel, /t\("emptyHint"\)/);
    assert.match(panel, /t\("unknown"\)/);
    assert.match(panel, /kecamatan_list/);
    assert.match(panel, /sortKecamatanListItems/);
    assert.match(panel, /desaCount/);
    assert.match(panel, /Escape/);
    assert.match(panel, /t\("seeKecamatan"\)/);
    assert.match(panel, /t\("seeDesa"\)/);
    assert.match(panel, /t\("backToKecamatan"\)/);
    assert.match(panel, /desaShowsCensus/);
    assert.match(panel, /listOpen/);
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
    assert.equal(/params\.set\("kode_kab"/.test(panel), false);
    assert.equal(PROFIL_QUERY_KEYS.kabupaten.includes("kode_kabupaten"), true);
    assert.equal(
      (PROFIL_QUERY_KEYS.kabupaten as readonly string[]).includes("kode_kab"),
      false
    );
  });

  it("keeps census 3×3 on desa CensusGrid and Tanggapi footer copy", () => {
    assert.match(panel, /function CensusGrid/);
    assert.match(panel, /t\("sensus"\)/);
    assert.match(panel, /t\("kkLaki"\)/);
    assert.match(panel, /metrics\.kk_laki_laki/);
    assert.match(panel, /t\("kkPerempuan"\)/);
    assert.match(panel, /t\("bayi"\)/);
    assert.match(panel, /t\("balita"\)/);
    assert.match(panel, /t\("anak"\)/);
    assert.match(panel, /t\("remaja"\)/);
    assert.match(panel, /t\("dewasa"\)/);
    assert.match(panel, /t\("lansia"\)/);
    assert.match(panel, /t\("disabilitas"\)/);
    assert.match(panel, /metrics\.penyandang_disabilitas/);
    const idJson = JSON.parse(id) as { profilDesa: Record<string, string> };
    const enJson = JSON.parse(en) as { profilDesa: Record<string, string> };
    assert.equal(idJson.profilDesa.kkLaki, "KK Laki-laki");
    assert.equal(idJson.profilDesa.disabilitas, "Penyandang Disabilitas");
    assert.equal(idJson.profilDesa.seeKecamatan, "Lihat Detail Kecamatan");
    assert.equal(idJson.profilDesa.seeDesa, "Lihat Detail Desa");
    assert.equal(idJson.profilDesa.backToKecamatan, "Kembali ke Kecamatan");
    assert.equal(enJson.profilDesa.seeKecamatan, "View subdistrict details");
  });

  it("paints 6-class fills, hover names, and village load pills", () => {
    assert.match(viewport, /CHOROPLETH_DAMAGED_HOME/);
    assert.match(viewport, /belum_diketahui/);
    assert.match(viewport, /hoverName/);
    assert.match(viewport, /loadingVillages/);
    assert.match(viewport, /geojsonReady/);
    assert.match(viewport, /isStubAreaLayer/);
    assert.match(viewport, /STATUS_HEX\.AWAS/);
    assert.match(viewport, /villageClickLevel/);
    assert.match(viewport, /preferVillageFillOnClick/);
    assert.match(viewport, /pmtilesKnownMissing/);
    assert.match(viewport, /mapSourceProp\(source\)/);
    assert.match(viewport, /source="area-layer-kab"/);
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
    assert.match(panel, /profilDesaLookupParams/);
    assert.match(panel, /hasKabupatenQuery/);
    assert.equal(/params\.set\("kode_desa_kelurahan"/.test(panel), false);
    assert.equal(/\/api\/profil-desa\/(?!kabupaten|kecamatan|desa)/.test(panel), false);
  });
});
