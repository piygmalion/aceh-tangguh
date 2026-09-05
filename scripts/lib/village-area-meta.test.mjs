import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildVillageAreaMeta,
  propertiesFromProfil,
  tenDigitKode,
  VILLAGE_LAYER_KEY,
} from "./village-area-meta.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("tenDigitKode", () => {
  it("accepts a 10-digit BPS kode and rejects empty / slug / wrong length", () => {
    assert.equal(tenDigitKode("1101012001"), "1101012001");
    assert.equal(tenDigitKode(1101012001), "1101012001");
    assert.equal(tenDigitKode(" 1101012001 "), "1101012001");
    assert.equal(tenDigitKode(null), null);
    assert.equal(tenDigitKode(""), null);
    assert.equal(tenDigitKode("desa-acehselatangunungpulo"), null);
    assert.equal(tenDigitKode("110101200"), null);
    assert.equal(tenDigitKode("11010120011"), null);
  });
});

describe("buildVillageAreaMeta intersection", () => {
  const geojson = [
    {
      id: "desa-1101012001",
      properties: {
        name: "GeoJSON name must not win",
        kabupaten: "GeoJSON kab must not win",
        kecamatan: "Bakongan",
        kode_desa_kelurahan: "1101012001",
        rumah_rr: 99,
        bucket: "invented",
      },
    },
    {
      id: "desa-acehselatangunungpulo",
      properties: {
        name: "Gunung Pulo",
        kabupaten: "Aceh Selatan",
        kode_desa_kelurahan: null,
      },
    },
    {
      id: "desa-9999999999",
      properties: {
        name: "Only in geojson",
        kode_desa_kelurahan: "9999999999",
      },
    },
  ];

  const profil = [
    {
      id: "profil-1",
      kode_desa_kelurahan: "1101012001",
      nama: "Keude Bakongan",
      kabupaten: "Aceh Selatan",
      kecamatan: "Bakongan",
      kode_kabupaten: "1101",
      kode_kecamatan: "110101",
      rumah_rr: 58,
      rumah_rs: 0,
      rumah_rb: 0,
      total_rumah_rusak: 58,
    },
    {
      id: "profil-null-lawe-sarap",
      kode_desa_kelurahan: null,
      nama: "Lawe Sarap",
      kabupaten: "Aceh Tenggara",
    },
    {
      id: "profil-null-perapat",
      kode_desa_kelurahan: null,
      nama: "Perapat Tinggi",
      kabupaten: "Aceh Tenggara",
    },
    {
      id: "profil-null-meunasah",
      kode_desa_kelurahan: null,
      nama: "Meunasah Cut",
      kabupaten: "Pidie",
    },
    {
      id: "profil-null-ise",
      kode_desa_kelurahan: null,
      nama: "Ise-ise",
      kabupaten: "Aceh Tengah",
    },
    {
      id: "profil-orphan",
      kode_desa_kelurahan: "1101999999",
      nama: "Only in profil",
      kabupaten: "Aceh Selatan",
    },
  ];

  it("keeps only geojson-coded ∩ profil-coded and stamps name from profil", () => {
    const { rows, counts } = buildVillageAreaMeta(geojson, profil);
    assert.deepEqual(counts, {
      geojson_coded: 2,
      profil_coded: 2,
      intersection: 1,
      skipped_empty_geojson: 1,
      skipped_profil_null: 4,
      geojson_kode_not_in_profil: 1,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, "1101012001");
    assert.equal(rows[0].layer_key, VILLAGE_LAYER_KEY);
    assert.equal(rows[0].name, "Keude Bakongan");
    assert.equal(rows[0].kabupaten, "Aceh Selatan");
    assert.equal(rows[0].properties.kode_desa_kelurahan, "1101012001");
    assert.equal(rows[0].properties.kecamatan, "Bakongan");
    assert.equal(rows[0].properties.rumah_rr, 58);
    assert.equal(rows[0].properties.bucket, undefined);
    assert.notEqual(rows[0].id, geojson[0].id);
  });

  it("does not seed slug-only polygons or the four null profil rows", () => {
    const { rows } = buildVillageAreaMeta(geojson, profil);
    const ids = new Set(rows.map((r) => r.id));
    const names = new Set(rows.map((r) => r.name));
    assert.equal(ids.has("desa-acehselatangunungpulo"), false);
    assert.equal(names.has("Gunung Pulo"), false);
    assert.equal(names.has("Lawe Sarap"), false);
    assert.equal(names.has("Perapat Tinggi"), false);
    assert.equal(names.has("Ise-ise"), false);
  });

  it("does not match same-name villages across different kodes", () => {
    const features = [
      {
        id: "desa-pidiecut",
        properties: {
          name: "Meunasah Cut",
          kabupaten: "Pidie",
          kode_desa_kelurahan: null,
        },
      },
      {
        id: "desa-1108162031",
        properties: {
          name: "Meunasah Cut",
          kabupaten: "Aceh Utara",
          kode_desa_kelurahan: "1108162031",
        },
      },
    ];
    const rowsProfil = [
      {
        kode_desa_kelurahan: null,
        nama: "Meunasah Cut",
        kabupaten: "Pidie",
      },
      {
        kode_desa_kelurahan: "1108162031",
        nama: "Meunasah Cut",
        kabupaten: "Aceh Utara",
        kecamatan: "Nisam",
      },
    ];
    const { rows, counts } = buildVillageAreaMeta(features, rowsProfil);
    assert.equal(counts.skipped_empty_geojson, 1);
    assert.equal(counts.skipped_profil_null, 1);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, "1108162031");
    assert.equal(rows[0].kabupaten, "Aceh Utara");
  });
});

describe("propertiesFromProfil", () => {
  it("copies existing profil fields only and does not invent keys", () => {
    const props = propertiesFromProfil({
      kode_desa_kelurahan: "1101012001",
      kecamatan: "Bakongan",
      rumah_rr: 58,
      bucket: "sedang",
      value: 58,
      nama: "should stay on the row, not invented into properties as name",
    });
    assert.equal(props.kode_desa_kelurahan, "1101012001");
    assert.equal(props.rumah_rr, 58);
    assert.equal(props.bucket, undefined);
    assert.equal(props.value, undefined);
    assert.equal(props.nama, undefined);
  });
});

describe("committed villageDistribution.geojson", () => {
  it("has 6508 geoportal polygons, 6499 ten-digit kodes, 9 leftovers, and feature.id ≠ kode", () => {
    const geo = JSON.parse(
      readFileSync(resolve(root, "public/fixtures/areas/villageDistribution.geojson"), "utf8")
    );
    const { rows, counts } = buildVillageAreaMeta(geo.features, []);
    assert.equal(geo.features.length, 6508);
    assert.equal(counts.geojson_coded, 6499);
    assert.equal(counts.skipped_empty_geojson, 9);
    assert.equal(counts.intersection, 0);
    assert.equal(counts.geojson_kode_not_in_profil, 6499);
    assert.equal(rows.length, 0);

    const coded = geo.features.find((f) => f.properties?.kode_desa_kelurahan === "1101012001");
    assert.ok(coded);
    assert.equal(coded.id, "desa-1101012001");
    assert.notEqual(String(coded.id), "1101012001");
    assert.equal(coded.properties.source, "profil_desa_aceh.json");

    const leftovers = geo.features.filter((f) => !f.properties?.kode_desa_kelurahan);
    assert.equal(leftovers.length, 9);
    assert.ok(leftovers.every((f) => f.properties?.source === "geom:geoportal-aceh"));
    assert.ok(leftovers.some((f) => f.properties?.name === "Sungai Lueng"));
    assert.ok(
      leftovers.every((f) => String(f.id).startsWith("desa-geo-")),
      "leftover feature.id is not a BPS kode"
    );
  });
});
