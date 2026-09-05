import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLOR_TOKENS } from "./layer-colors";
import {
  AREA_OUTLINE_COLOR,
  BASEMAP_LABEL_PLACE_LAYER,
  KAB_OUTLINE_PAINT,
  KECAMATAN_LOD_MAX_ZOOM,
  KECAMATAN_LOD_MIN_ZOOM,
  MARKER_CLUSTERS_LAYER,
  PMTILES_KAB,
  PMTILES_KECAMATAN,
  PMTILES_VILLAGE,
  VILLAGE_LOD_MIN_ZOOM,
  VILLAGE_OUTLINE_MIN_ZOOM,
  VILLAGE_OUTLINE_PAINT,
  geometryBounds,
  isAreaFillLayerId,
  isKabAreaFeature,
  isKecamatanLodZoom,
  isVillageLodZoom,
  mergeVillageLodFocus,
  overlayBeforeId,
  readKabLodFocus,
  unionBounds,
  villageDistributionTiles,
  villageFeatureVisible,
  villageLayerFilter,
  villageLodBand,
  villagePanelClickEnabled,
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
  it("uses r3p-kab below z9, kecamatan-r3p at z9–10, village-r3p at z11+", () => {
    assert.equal(KECAMATAN_LOD_MIN_ZOOM, 9);
    assert.equal(KECAMATAN_LOD_MAX_ZOOM, 11);
    assert.equal(VILLAGE_LOD_MIN_ZOOM, 11);
    assert.equal(villageLodBand(8.99), "kab");
    assert.equal(villageLodBand(9), "kecamatan");
    assert.equal(villageLodBand(10.99), "kecamatan");
    assert.equal(villageLodBand(11), "village");
    assert.equal(isKecamatanLodZoom(9), true);
    assert.equal(isKecamatanLodZoom(11), false);
    assert.equal(isVillageLodZoom(8.99), false);
    assert.equal(isVillageLodZoom(9), false);
    assert.equal(isVillageLodZoom(10.99), false);
    assert.equal(isVillageLodZoom(11), true);
    assert.deepEqual(villageDistributionTiles(7), PMTILES_KAB);
    assert.equal(villageDistributionTiles(7).url, "/tiles/r3p-kab.pmtiles");
    assert.equal(villageDistributionTiles(7).sourceLayer, "r3p");
    assert.deepEqual(villageDistributionTiles(9), PMTILES_KECAMATAN);
    assert.equal(villageDistributionTiles(10).sourceLayer, "kecamatan");
    assert.deepEqual(villageDistributionTiles(11), PMTILES_VILLAGE);
    assert.equal(villageDistributionTiles(11).sourceLayer, "village");
  });

  it("starts desa outlines at z11 and uses a forest token, not #14532d", () => {
    assert.equal(VILLAGE_OUTLINE_MIN_ZOOM, 11);
    assert.equal(AREA_OUTLINE_COLOR, COLOR_TOKENS.forest);
    assert.notEqual(AREA_OUTLINE_COLOR, "#14532d");
    assert.equal(KAB_OUTLINE_PAINT["line-color"], COLOR_TOKENS.forest);
    assert.equal(VILLAGE_OUTLINE_PAINT["line-color"], COLOR_TOKENS.forest);
    const opacity = VILLAGE_OUTLINE_PAINT["line-opacity"];
    assert.equal(opacity[3], 11);
    assert.equal(opacity[4], 0.3);
    assert.equal(opacity[5], 13);
    assert.equal(opacity[6], 0.45);
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

  it("recognizes kab and village fill layer ids", () => {
    assert.equal(isAreaFillLayerId("area-fill"), true);
    assert.equal(isAreaFillLayerId("area-fill-kab"), true);
    assert.equal(isAreaFillLayerId("area-fill-kecamatan"), true);
    assert.equal(isAreaFillLayerId("area-fill-village"), true);
    assert.equal(isAreaFillLayerId("marker-clusters"), false);
  });
});

describe("village LOD focus + kode filter", () => {
  it("treats r3p features as kab clicks only on the kab LOD band", () => {
    assert.equal(isKabAreaFeature(ACEH_BARAT_KAB, "kab"), true);
    assert.equal(isKabAreaFeature(ACEH_BARAT_KAB, false), true);
    assert.equal(isKabAreaFeature(ACEH_BARAT_KAB, "village"), true);
    assert.equal(isKabAreaFeature(CODED_DESA, "village"), false);
    assert.equal(isKabAreaFeature(CODED_DESA, true), false);
    assert.equal(isKabAreaFeature(CODED_DESA, "kab"), true);
    assert.equal(isKabAreaFeature(CODED_KECAMATAN, "kecamatan"), false);
    assert.equal(isKabAreaFeature(CODED_KECAMATAN, "kab"), true);
    assert.equal(isKabAreaFeature(CODED_KECAMATAN, "village"), false);
    assert.equal(villagePanelClickEnabled("kab"), false);
    assert.equal(villagePanelClickEnabled("kecamatan"), false);
    assert.equal(villagePanelClickEnabled("village"), true);
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
