import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACEH_KABUPATEN,
  assertAllowedTilikanPath,
  assertNoPiiHeaders,
  classifyOverlap,
  exactKey,
  findKabupaten,
  haversineMeters,
  inventoryFromMarkerRows,
  inventoryFromMarkers,
  normalizeJenis,
  parseTilikanKerusakanCsv,
} from "./tilikan-kerusakan.mjs";

describe("tilikan-kerusakan path lock", () => {
  it("refuses pengungsian / orang hilang / polsek / fasum paths", () => {
    assert.throws(() => assertAllowedTilikanPath("data/drive-clean/pengungsian/titik.csv"));
    assert.throws(() => assertAllowedTilikanPath("data/drive-clean/pengungsian/haifa_titik.csv"));
    assert.throws(() => assertAllowedTilikanPath("tilikan/pengungsian_padal.csv"));
    assert.throws(() => assertAllowedTilikanPath("tilikan/polsek.csv"));
    assert.throws(() => assertAllowedTilikanPath("fasum/QUARANTINE.md"));
    assert.throws(() => assertAllowedTilikanPath("orang-hilang.csv"));
  });

  it("allows jalan and jembatan CSVs", () => {
    assert.doesNotThrow(() =>
      assertAllowedTilikanPath("data/drive-clean/tilikan/jalan_rusak.csv")
    );
    assert.doesNotThrow(() =>
      assertAllowedTilikanPath("data/drive-clean/tilikan/jembatan.csv")
    );
  });

  it("refuses PII headers", () => {
    assert.throws(() => assertNoPiiHeaders(["nama", "no_hp"]));
    assert.doesNotThrow(() => assertNoPiiHeaders(["nama", "kecamatan", "latitude"]));
  });
});

describe("tilikan-kerusakan kabupaten + jenis", () => {
  it("has 23 kabupaten codes matching findKabupaten", () => {
    assert.equal(ACEH_KABUPATEN.length, 23);
    assert.equal(findKabupaten("Kabupaten Gayo Lues")?.kode, "1113");
    assert.equal(findKabupaten("Aceh Tamiang")?.kode, "1116");
    assert.equal(findKabupaten("Aceh Jaya")?.kode, "1114");
    assert.equal(findKabupaten("Langsa")?.kode, "1174");
    assert.equal(findKabupaten("Lhokseumawe")?.kode, "1173");
    assert.equal(findKabupaten("unknown"), undefined);
  });

  it("maps road/bridge labels to jenis", () => {
    assert.equal(normalizeJenis("Demaged Road"), "jalan");
    assert.equal(normalizeJenis("tilikan_jembatan"), "jembatan");
    assert.equal(normalizeJenis("posko"), null);
  });
});

describe("tilikan-kerusakan parse + overlap", () => {
  const header =
    "nama,jenis,latitude,longitude,alamat,kabupaten,kecamatan,desa,kode_desa,sumber,media_url,coord_quality,approx";

  it("keeps ok rows and drops other coord_quality", () => {
    const csv = [
      header,
      "Jembatan A,Demaged Bridge,4.5,97.1,x,Gayo Lues,,,1101012001,tilikan_jembatan,,ok,false",
      "Jembatan B,Demaged Bridge,4.5,97.1,x,Gayo Lues,,,,tilikan_jembatan,,truncated_integer,true",
    ].join("\n");
    const parsed = parseTilikanKerusakanCsv(csv, "data/drive-clean/tilikan/jembatan.csv");
    assert.equal(parsed.accepted.length, 1);
    assert.equal(parsed.skipped.length, 1);
    assert.equal(parsed.accepted[0].kode_kabupaten, "1113");
    assert.equal(parsed.accepted[0].kode_desa_kelurahan, "1101012001");
    assert.equal(parsed.accepted[0].jenis, "jembatan");
  });

  it("does not invent a 10-digit desa code from a name", () => {
    const csv = [
      header,
      "Jembatan A,Demaged Bridge,4.5,97.1,x,Gayo Lues,Pining,Lesten,Lesten,tilikan_jembatan,,ok,false",
    ].join("\n");
    const parsed = parseTilikanKerusakanCsv(csv, "tilikan/jembatan.csv");
    assert.equal(parsed.accepted[0].kode_desa_kelurahan, null);
    assert.equal(parsed.accepted[0].desa, "Lesten");
  });

  it("classifies exact / near / baru against infraRoadBridge", () => {
    const csv = [
      header,
      "Jembatan Soekarno,Demaged Bridge,5.5283,95.3538,x,Banda Aceh,,,,tilikan_jembatan,,ok,false",
      "Dekat Soekarno,Demaged Bridge,5.5285,95.354,x,Banda Aceh,,,,tilikan_jembatan,,ok,false",
      "Baru lapangan,Demaged Bridge,4.1,97.2,x,Gayo Lues,,,,tilikan_jembatan,,ok,false",
    ].join("\n");
    const parsed = parseTilikanKerusakanCsv(csv, "tilikan/jembatan.csv");
    const inventory = inventoryFromMarkers({
      type: "FeatureCollection",
      features: [
        {
          id: "irb-1",
          geometry: { type: "Point", coordinates: [95.3538, 5.5283] },
          properties: { layer: "infraRoadBridge", title: "Jembatan Soekarno" },
        },
      ],
    });
    const classified = classifyOverlap(parsed.accepted, inventory);
    assert.equal(classified[0].match, "exact");
    assert.equal(classified[0].marker_feature_id, "irb-1");
    assert.equal(classified[1].match, "near");
    assert.equal(classified[2].match, "baru");
    assert.equal(classified[2].marker_feature_id, null);
    assert.ok(haversineMeters(5.5283, 95.3538, 5.5285, 95.354) < 50);
    assert.equal(exactKey(5.5283, 95.3538, "Jembatan Soekarno"), "5.52830|95.35380|jembatan soekarno");
  });

  it("reads live marker_features rows the same way", () => {
    const points = inventoryFromMarkerRows([
      { id: "a", layer: "infraRoadBridge", title: "X", latitude: 4.1, longitude: 97.2 },
      { id: "b", layer: "facHealth", title: "skip", latitude: 4.2, longitude: 97.3 },
    ]);
    assert.equal(points.length, 1);
    assert.equal(points[0].id, "a");
  });
});
