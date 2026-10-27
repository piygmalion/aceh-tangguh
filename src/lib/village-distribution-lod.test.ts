import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { COLOR_TOKENS } from "./layer-colors";
import {
  AREA_HIGHLIGHT_FILL,
  AREA_HIGHLIGHT_LAYER_IDS,
  AREA_HIGHLIGHT_LINE,
  AREA_OUTLINE_COLOR,
  AREA_OUTLINE_COLOR_DARK,
  areaOutlineColor,
  BASEMAP_LABEL_PLACE_LAYER,
  KAB_OVERVIEW_AREA_KEY,
  KAB_OUTLINE_PAINT,
  KECAMATAN_OUTLINE_PAINT,
  KECAMATAN_OVERVIEW_MAX_ZOOM,
  MARKER_CLUSTERS_LAYER,
  PMTILES_KECAMATAN,
  PMTILES_VILLAGE,
  VILLAGE_DISTRIBUTION_TERCILES,
  VILLAGE_MESH_MIN_ZOOM,
  VILLAGE_MESH_FILL,
  VILLAGE_MESH_FILL_OPACITY,
  VILLAGE_OUTLINE_MIN_ZOOM,
  VILLAGE_OUTLINE_PAINT,
  adminLodBand,
  adminLodTiles,
  areaFillUsesMeshWash,
  areaHighlightFilter,
  areaHighlightLayerId,
  geometryBounds,
  isAdminLodArea,
  isAreaFillLayerId,
  isKabAreaFeature,
  isKecamatanAreaFeature,
  lodFocusFromSelection,
  mergeVillageLodFocus,
  overlayBeforeId,
  statusOverlayBeforeId,
  rebucketVillageKabFeature,
  readKabLodFocus,
  readVillageSelection,
  unionBounds,
  villageDistributionBucket,
  villageFeatureVisible,
  villageLayerFilter,
  villageLodShowsKecamatanLayer,
  villageLodShowsVillageLayer,
  villagePanelClickEnabled,
  withKecamatanFocus,
} from "./village-distribution-lod";

const ACEH_BARAT_KAB = {
  name: "Aceh Barat",
  level: "kab",
  kode_kab: "1107",
  bucket: "rendah",
};

const CODED_DESA = {
  name: "Keude",
  kabupaten: "Aceh Barat",
  kecamatan: "Johan Pahlawan",
  kode_kabupaten: "1107",
  kode_kecamatan: "110701",
  kode_desa_kelurahan: "1107012001",
};

const LEFTOVER_SAME_KAB = {
  name: "Gunung Pulo",
  kabupaten: "Aceh Barat",
  kecamatan: "Johan Pahlawan",
  kode_desa_kelurahan: null,
};

const LEFTOVER_OTHER_KAB = {
  name: "Other leftover",
  kabupaten: "Aceh Selatan",
  kecamatan: "Bakongan",
  kode_desa_kelurahan: null,
};

const OTHER_KEC_SAME_KAB = {
  name: "Desa lain",
  kabupaten: "Aceh Barat",
  kecamatan: "Meureubo",
  kode_kabupaten: "1107",
  kode_kecamatan: "110702",
  kode_desa_kelurahan: "1107022001",
};

const CODED_KECAMATAN = {
  name: "Johan Pahlawan",
  kabupaten: "Aceh Barat",
  kecamatan: "Johan Pahlawan",
  level: "kecamatan",
  kode_kabupaten: "1107",
  kode_kecamatan: "110701",
  bucket: "sedang",
};

const OTHER_KECAMATAN_SAME_NAME = {
  name: "Johan Pahlawan",
  kabupaten: "Aceh Jaya",
  kecamatan: "Johan Pahlawan",
  level: "kecamatan",
  kode_kabupaten: "1116",
  kode_kecamatan: "111602",
};

function stringify(value: unknown): string {
  return JSON.stringify(value);
}

describe("villageDistribution LOD tiles", () => {
  it("switches kab → kecamatan → desa from click focus, not zoom", () => {
    assert.equal(KAB_OVERVIEW_AREA_KEY, "r3pDistribution");
    assert.equal(adminLodBand(null), "kabupaten");
    assert.equal(adminLodBand({}), "kabupaten");
    assert.equal(adminLodBand({ kodeKab: "1107", kabupaten: "Aceh Barat" }), "kecamatan");
    assert.equal(adminLodBand({ kabupaten: "Aceh Barat" }), "kecamatan");
    assert.equal(
      adminLodBand({ kodeKab: "1107", kabupaten: "Aceh Barat", kodeKecamatan: "110701" }),
      "village",
    );
    assert.equal(adminLodTiles("kabupaten"), null);
    assert.deepEqual(adminLodTiles("kecamatan"), PMTILES_KECAMATAN);
    assert.equal(adminLodTiles("kecamatan")?.url, "/tiles/kecamatan-r3p.pmtiles");
    assert.deepEqual(adminLodTiles("village"), PMTILES_VILLAGE);
    assert.equal(isAdminLodArea("villageDistribution"), true);
    assert.equal(isAdminLodArea("r3pDistribution"), true);
    assert.equal(isAdminLodArea("irbi2025"), false);
    assert.equal(isAdminLodArea(null), false);
  });

  it("starts desa outlines at z11 and uses the locked outline, not #14532d", () => {
    assert.equal(VILLAGE_OUTLINE_MIN_ZOOM, 11);
    assert.equal(VILLAGE_MESH_MIN_ZOOM, 11);
    assert.equal(KECAMATAN_OVERVIEW_MAX_ZOOM, 11);
    assert.equal(AREA_OUTLINE_COLOR, "rgba(17, 17, 17, 0.35)");
    assert.notEqual(AREA_OUTLINE_COLOR, "#14532d");
    assert.notEqual(AREA_OUTLINE_COLOR, COLOR_TOKENS.forest);
    assert.equal(KAB_OUTLINE_PAINT["line-color"], AREA_OUTLINE_COLOR);
    assert.equal(KAB_OUTLINE_PAINT["line-width"], 0.7);
    assert.equal(AREA_OUTLINE_COLOR_DARK, "rgba(255, 255, 255, 0.30)");
    assert.equal(areaOutlineColor("brand-light"), AREA_OUTLINE_COLOR);
    assert.equal(areaOutlineColor("brand-grey"), AREA_OUTLINE_COLOR);
    assert.equal(areaOutlineColor("brand-dark"), AREA_OUTLINE_COLOR_DARK);
    assert.equal(areaOutlineColor("sentinel"), AREA_OUTLINE_COLOR_DARK);
    assert.equal(areaOutlineColor("satellite"), AREA_OUTLINE_COLOR_DARK);
    assert.equal(KECAMATAN_OUTLINE_PAINT["line-color"], COLOR_TOKENS.paper);
    assert.equal(VILLAGE_OUTLINE_PAINT["line-color"], COLOR_TOKENS.paper);
    const opacity = VILLAGE_OUTLINE_PAINT["line-opacity"];
    assert.equal(opacity[3], 11);
    assert.equal(opacity[4], 0.3);
    assert.equal(opacity[5], 13);
    assert.equal(opacity[6], 0.45);
  });

  it("uses the white outline on dark basemaps and the ink outline on light ones", () => {
    assert.equal(areaOutlineColor("dark"), AREA_OUTLINE_COLOR_DARK);
    assert.equal(areaOutlineColor("positron"), AREA_OUTLINE_COLOR);
    assert.equal(areaOutlineColor("sentinel"), AREA_OUTLINE_COLOR_DARK);
    assert.equal(areaOutlineColor("satellite"), AREA_OUTLINE_COLOR_DARK);
    assert.equal(areaOutlineColor("brand-dark"), AREA_OUTLINE_COLOR_DARK);
    assert.equal(areaOutlineColor("brand-light"), AREA_OUTLINE_COLOR);
  });

  it("keeps kecamatan overview below z11 and desa mesh at z≥11 after a kab focus", () => {
    assert.equal(villageLodShowsKecamatanLayer("kabupaten"), false);
    assert.equal(villageLodShowsVillageLayer("kabupaten"), false);
    assert.equal(villageLodShowsKecamatanLayer("kecamatan"), true);
    assert.equal(villageLodShowsVillageLayer("kecamatan"), true);
    assert.equal(villageLodShowsKecamatanLayer("village"), true);
    assert.equal(villageLodShowsVillageLayer("village"), true);
    assert.equal(AREA_HIGHLIGHT_FILL, COLOR_TOKENS.awas);
    assert.equal(AREA_HIGHLIGHT_LINE, COLOR_TOKENS.awas);
  });
});

describe("overlay beforeId", () => {
  it("prefers marker-clusters so fill stays under points", () => {
    assert.equal(
      overlayBeforeId((id) => id === MARKER_CLUSTERS_LAYER || id === BASEMAP_LABEL_PLACE_LAYER),
      MARKER_CLUSTERS_LAYER
    );
    assert.equal(
      overlayBeforeId((id) => id === BASEMAP_LABEL_PLACE_LAYER),
      BASEMAP_LABEL_PLACE_LAYER
    );
    assert.equal(overlayBeforeId(() => false), undefined);
    assert.equal(overlayBeforeId(null), undefined);
  });

  it("places status overlays above basemap labels", () => {
    assert.equal(
      statusOverlayBeforeId((id) => id === BASEMAP_LABEL_PLACE_LAYER),
      undefined,
    );
    assert.equal(
      statusOverlayBeforeId(
        (id) => id === MARKER_CLUSTERS_LAYER || id === BASEMAP_LABEL_PLACE_LAYER,
      ),
      MARKER_CLUSTERS_LAYER,
    );
    assert.equal(statusOverlayBeforeId(null), undefined);
  });

  it("recognizes kab and village fill layer ids", () => {
    assert.equal(isAreaFillLayerId("area-fill"), true);
    assert.equal(isAreaFillLayerId("area-fill-kab"), true);
    assert.equal(isAreaFillLayerId("area-fill-kecamatan"), true);
    assert.equal(isAreaFillLayerId("area-fill-village"), true);
    assert.equal(isAreaFillLayerId("area-highlight-fill"), true);
    assert.equal(isAreaFillLayerId("area-highlight-fill-kecamatan"), true);
    assert.equal(isAreaFillLayerId("area-highlight-fill-village"), true);
    assert.equal(isAreaFillLayerId("area-highlight-line-kab"), true);
    assert.equal(isAreaFillLayerId("marker-clusters"), false);
  });

  it("prefixes highlight layers so kab, kecamatan, and desa can paint at once", () => {
    assert.equal(areaHighlightLayerId("fill"), "area-highlight-fill");
    assert.equal(areaHighlightLayerId("line"), "area-highlight-line");
    assert.equal(areaHighlightLayerId("fill", "kab"), "area-highlight-fill-kab");
    assert.equal(
      areaHighlightLayerId("fill", "kecamatan"),
      "area-highlight-fill-kecamatan"
    );
    assert.equal(
      areaHighlightLayerId("line", "village"),
      "area-highlight-line-village"
    );
    assert.ok(AREA_HIGHLIGHT_LAYER_IDS.includes("area-highlight-fill-kecamatan"));
    assert.ok(AREA_HIGHLIGHT_LAYER_IDS.includes("area-highlight-fill-village"));
    assert.ok(AREA_HIGHLIGHT_LAYER_IDS.includes("area-highlight-line-kab"));
  });

  it("uses a muted paper wash for the desa mesh, not choropleth buckets", () => {
    assert.equal(VILLAGE_MESH_FILL, COLOR_TOKENS.paper);
    assert.ok(VILLAGE_MESH_FILL_OPACITY > 0);
    assert.ok(VILLAGE_MESH_FILL_OPACITY <= 0.16);
    assert.equal(areaFillUsesMeshWash("village"), true);
    assert.equal(areaFillUsesMeshWash("kecamatan"), false);
    assert.equal(areaFillUsesMeshWash("kab"), false);
  });
});

describe("village LOD focus + kode filter", () => {
  it("treats level=kab as fitBounds-only; overview band is kecamatan, not kab archive", () => {
    assert.equal(isKabAreaFeature(ACEH_BARAT_KAB, "kecamatan"), true);
    assert.equal(isKabAreaFeature(ACEH_BARAT_KAB, false), true);
    assert.equal(isKabAreaFeature(ACEH_BARAT_KAB, "village"), true);
    assert.equal(isKabAreaFeature(CODED_DESA, "village"), false);
    assert.equal(isKabAreaFeature(CODED_DESA, true), false);
    assert.equal(isKabAreaFeature(CODED_DESA, "kecamatan"), false);
    assert.equal(isKabAreaFeature(CODED_KECAMATAN, "kecamatan"), false);
    assert.equal(isKabAreaFeature(CODED_KECAMATAN, false), false);
    assert.equal(isKabAreaFeature(CODED_KECAMATAN, "village"), false);
    assert.equal(isKecamatanAreaFeature(CODED_KECAMATAN), true);
    assert.equal(isKecamatanAreaFeature(ACEH_BARAT_KAB), false);
    assert.equal(isKecamatanAreaFeature(CODED_DESA), false);
    assert.equal(villagePanelClickEnabled("kabupaten"), true);
    assert.equal(villagePanelClickEnabled("kecamatan"), true);
    assert.equal(villagePanelClickEnabled("village"), true);
  });

  it("rebuckets kab dissolve with villageDistribution terciles, not R3P breaks", () => {
    assert.equal(VILLAGE_DISTRIBUTION_TERCILES.t1, 106);
    assert.equal(VILLAGE_DISTRIBUTION_TERCILES.t2, 1184);
    assert.equal(villageDistributionBucket(106), "rendah");
    assert.equal(villageDistributionBucket(1184), "sedang");
    assert.equal(villageDistributionBucket(1185), "tinggi");
    const kab = rebucketVillageKabFeature({
      ...ACEH_BARAT_KAB,
      rumah_rr: 400,
      rumah_rs: 400,
      rumah_rb: 400,
      value: 2000,
      bucket: "rendah",
    });
    assert.equal(kab.bucket, "tinggi");
    assert.equal(rebucketVillageKabFeature({ value: 50, bucket: "tinggi" }).bucket, "rendah");
  });

  it("reads kab kode from kode_kab and kecamatan click does not jump to desa mesh until kode is set", () => {
    const sel = readVillageSelection(ACEH_BARAT_KAB);
    assert.equal(sel?.level, "kab");
    assert.equal(sel?.kodeKabupaten, "1107");
    assert.equal(sel?.kabupaten, "Aceh Barat");
    const kecSel = readVillageSelection(CODED_KECAMATAN);
    assert.equal(kecSel?.level, "kecamatan");
    assert.equal(kecSel?.kodeKecamatan, "110701");
    const afterKab = mergeVillageLodFocus(readKabLodFocus(ACEH_BARAT_KAB), sel);
    assert.equal(adminLodBand(afterKab), "kecamatan");
    const afterKec = withKecamatanFocus(afterKab, "110701");
    assert.equal(adminLodBand(afterKec), "village");
    assert.equal(afterKec.kodeKecamatan, "110701");
  });

  it("reads kab focus from r3p kode_kab / name and does not invent codes", () => {
    assert.deepEqual(readKabLodFocus(ACEH_BARAT_KAB), {
      kodeKab: "1107",
      kabupaten: "Aceh Barat",
    });
    assert.equal(readKabLodFocus({ name: "", level: "kab" }), null);
    assert.deepEqual(readKabLodFocus({ kabupaten: "Langsa" }), {
      kabupaten: "Langsa",
    });
  });

  it("merges kab click with village selection kode_kecamatan, not kecamatan name", () => {
    const merged = mergeVillageLodFocus(
      { kodeKab: "1107", kabupaten: "Aceh Barat" },
      {
        name: "Keude",
        kabupaten: "Aceh Barat",
        kecamatan: "Johan Pahlawan",
        kodeKecamatan: "110701",
      }
    );
    assert.deepEqual(merged, {
      kodeKab: "1107",
      kabupaten: "Aceh Barat",
      kodeKecamatan: "110701",
    });
    assert.equal(merged && "kecamatan" in merged, false);
  });

  it("hides leftovers without kode or kabupaten name when focus is set", () => {
    const kabFocus = { kodeKab: "1107", kabupaten: "Aceh Barat" };
    assert.equal(villageFeatureVisible(CODED_DESA, kabFocus), true);
    assert.equal(villageFeatureVisible(LEFTOVER_SAME_KAB, kabFocus), true);
    assert.equal(villageFeatureVisible(LEFTOVER_OTHER_KAB, kabFocus), false);
    assert.equal(
      villageFeatureVisible({ name: "orphan" }, kabFocus),
      false
    );

    assert.equal(villageFeatureVisible(CODED_KECAMATAN, kabFocus), true);
    assert.equal(villageFeatureVisible(OTHER_KECAMATAN_SAME_NAME, kabFocus), false);

    const kecFocus = { ...kabFocus, kodeKecamatan: "110701" };
    assert.equal(villageFeatureVisible(CODED_DESA, kecFocus), true);
    assert.equal(villageFeatureVisible(OTHER_KEC_SAME_KAB, kecFocus), false);
    assert.equal(villageFeatureVisible(CODED_KECAMATAN, kecFocus), true);
    assert.equal(villageFeatureVisible(OTHER_KECAMATAN_SAME_NAME, kecFocus), false);
    assert.equal(villageFeatureVisible(LEFTOVER_SAME_KAB, kecFocus), false);
    assert.equal(
      villageFeatureVisible(
        {
          ...CODED_DESA,
          kecamatan: "Johan Pahlawan",
          kode_kecamatan: "110702",
          kode_desa_kelurahan: "1107022001",
        },
        kecFocus
      ),
      false
    );
  });

  it("matches kabupaten name even when tile kode disagrees, and never uses kecamatan name in the MapLibre filter", () => {
    const focus = { kodeKab: "1103", kabupaten: "Aceh Selatan" };
    assert.equal(
      villageFeatureVisible(
        {
          name: "Keude Bakongan",
          kabupaten: "Aceh Selatan",
          kecamatan: "Bakongan",
          kode_kabupaten: "1101",
          kode_kecamatan: "110101",
          kode_desa_kelurahan: "1101012001",
        },
        focus
      ),
      true
    );

    const filter = villageLayerFilter({
      kodeKab: "1107",
      kabupaten: "Aceh Barat",
      kodeKecamatan: "110701",
    });
    const raw = stringify(filter);
    assert.equal(raw.includes('["get","kecamatan"]'), false);
    assert.equal(raw.includes("kode_kecamatan"), true);
    assert.equal(raw.includes("kode_kabupaten"), true);
    assert.equal(raw.includes("kode_desa_kelurahan"), true);
    assert.equal(
      villageFeatureVisible(
        { ...OTHER_KECAMATAN_SAME_NAME, kecamatan: "Johan Pahlawan" },
        { kodeKecamatan: "110701" }
      ),
      false
    );
  });
});

describe("geometry bounds for kab fitBounds", () => {
  it("unions polygon rings", () => {
    const bounds = geometryBounds({
      type: "Polygon",
      coordinates: [
        [
          [96, 4],
          [97, 4],
          [97, 5],
          [96, 5],
          [96, 4],
        ],
      ],
    });
    assert.deepEqual(bounds, [
      [96, 4],
      [97, 5],
    ]);
    assert.deepEqual(
      unionBounds([
        bounds,
        [
          [95, 3],
          [96.5, 4.5],
        ],
      ]),
      [
        [95, 3],
        [97, 5],
      ]
    );
  });
});

describe("click drill source lock", () => {
  it("MapViewport keeps click focus and applies z11 kecamatan/desa bands", () => {
    const viewport = readFileSync(
      join(process.cwd(), "src/components/map/MapViewport.tsx"),
      "utf8"
    );
    assert.equal(viewport.includes("villageLodBand"), false);
    assert.equal(viewport.includes("adminLodBand"), true);
    assert.equal(viewport.includes("KECAMATAN_LOD_MAX_ZOOM"), false);
    assert.equal(viewport.includes("VILLAGE_LOD_MIN_ZOOM"), false);
    assert.equal(viewport.includes("KECAMATAN_OVERVIEW_MAX_ZOOM"), true);
    assert.equal(viewport.includes("VILLAGE_MESH_MIN_ZOOM"), true);
    assert.equal(viewport.includes("readVillageSelection"), true);
    assert.equal(viewport.includes("lodFocusFromSelection"), true);
    assert.equal(viewport.includes("areaHighlightFilter"), true);
    assert.equal(viewport.includes("rebucketVillageKabFeature"), true);
    assert.equal(viewport.includes("r3p-kab.pmtiles"), false);
    assert.equal(viewport.includes('id="area-highlight-fill"'), false);
    assert.match(viewport, /areaHighlightLayerId\("fill"/);
    assert.match(viewport, /areaHighlightLayerId\("line"/);
    assert.match(viewport, /VILLAGE_MESH_FILL/);
    assert.match(viewport, /areaFillUsesMeshWash/);
  });
});

describe("area highlight filter", () => {
  it("matches kab, kecamatan, and desa from stored codes or names without inventing codes", () => {
    const kab = areaHighlightFilter({
      name: "Aceh Barat",
      kabupaten: "Aceh Barat",
      kecamatan: "",
      kodeKabupaten: "1107",
      level: "kab",
    });
    const kabRaw = stringify(kab);
    assert.equal(kabRaw.includes("1107"), true);
    assert.equal(kabRaw.includes("Aceh Barat"), true);
    assert.equal(kabRaw.includes("kode_kecamatan"), false);
    assert.equal(kabRaw.includes('["get","level"]'), true);

    const kec = areaHighlightFilter({
      name: "Johan Pahlawan",
      kabupaten: "Aceh Barat",
      kecamatan: "Johan Pahlawan",
      kodeKecamatan: "110701",
      kodeKabupaten: "1107",
      level: "kecamatan",
    });
    const kecRaw = stringify(kec);
    assert.equal(kecRaw.includes("110701"), true);
    assert.equal(kecRaw.includes("Johan Pahlawan"), true);

    const desa = areaHighlightFilter({
      name: "Keude",
      kabupaten: "Aceh Barat",
      kecamatan: "Johan Pahlawan",
      kodeDesa: "1107012001",
      kodeKecamatan: "110701",
      level: "desa",
    });
    const desaRaw = stringify(desa);
    assert.equal(desaRaw.includes("1107012001"), true);
    assert.equal(desaRaw.includes("kode_desa_kelurahan"), true);

    assert.deepEqual(areaHighlightFilter(null), ["==", ["get", "name"], "__none__"]);
  });

  it("builds lod focus from selection without inventing missing codes", () => {
    assert.deepEqual(
      lodFocusFromSelection({
        name: "Aceh Barat",
        kabupaten: "Aceh Barat",
        kecamatan: "",
        kodeKabupaten: "1107",
        level: "kab",
      }),
      { kodeKab: "1107", kabupaten: "Aceh Barat" }
    );
    assert.deepEqual(
      lodFocusFromSelection({
        name: "Johan Pahlawan",
        kabupaten: "Aceh Barat",
        kecamatan: "Johan Pahlawan",
        kodeKecamatan: "110701",
        kodeKabupaten: "1107",
        level: "kecamatan",
      }),
      { kodeKab: "1107", kabupaten: "Aceh Barat", kodeKecamatan: "110701" }
    );
    assert.equal(lodFocusFromSelection(null), null);
    assert.equal(
      lodFocusFromSelection({ name: "", kabupaten: "", kecamatan: "" }),
      null
    );
  });
});
