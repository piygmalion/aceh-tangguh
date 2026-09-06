import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  looksLikeKejadian,
  normalizeKabupaten,
  resolveKejadianColumns,
  resolveKejadianTable,
} from "./sik-schema.mjs";
import {
  classifyGps,
  fillNullProfilByKode,
  isRekapitulasiTahunan,
  mergeSikIntoKejadian,
  naturalKey,
  newSikEventId,
  quarantineKeepsExistingGps,
  tenDigitKode,
} from "./sik-merge.mjs";
import { kejadianToDisasterFeature, rebuildDisasterEventLayer } from "./sik-markers.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("sik schema aliases", () => {
  it("maps typical SIK columns and rejects user tables", () => {
    const mapping = resolveKejadianColumns([
      "id_kejadian",
      "jenis",
      "tanggal",
      "lat",
      "lng",
      "nama_kabupaten",
      "kode_bps",
    ]);
    assert.equal(mapping.sik_id, "id_kejadian");
    assert.equal(mapping.jenis_bencana, "jenis");
    assert.equal(mapping.hari_tanggal, "tanggal");
    assert.equal(mapping.latitude, "lat");
    assert.equal(mapping.longitude, "lng");
    assert.equal(mapping.kode_desa_kelurahan, "kode_bps");
    assert.equal(looksLikeKejadian(["jenis", "tanggal"]), true);
    assert.equal(
      resolveKejadianTable(["users", "kejadian"], {
        users: ["id", "password"],
        kejadian: ["id", "jenis_bencana", "tanggal", "latitude", "longitude"],
      }),
      "kejadian"
    );
  });

  it("picks kejadian when jenis is jenis_bencana_teks, not ref_kabupaten_kota", () => {
    const kejadianCols = [
      "id",
      "jenis_bencana_teks",
      "tanggal",
      "latitude",
      "longitude",
      "kabupaten",
    ];
    const mapping = resolveKejadianColumns(kejadianCols);
    assert.equal(mapping.jenis_bencana, "jenis_bencana_teks");
    assert.equal(looksLikeKejadian(kejadianCols), true);
    assert.equal(looksLikeKejadian(["id", "jenis_bencana_teks"]), false);
    assert.equal(
      resolveKejadianTable(["ref_kabupaten_kota", "kejadian"], {
        ref_kabupaten_kota: [
          "id",
          "jenis",
          "nama_kabupaten",
          "latitude",
          "longitude",
        ],
        kejadian: kejadianCols,
      }),
      "kejadian"
    );
  });

  it("normalizes kabupaten aliases without inventing names", () => {
    assert.equal(normalizeKabupaten("Kab. Aceh Utara"), "Aceh Utara");
    assert.equal(normalizeKabupaten("KOTA BANDA ACEH"), "Banda Aceh");
    assert.equal(tenDigitKode("1101012001"), "1101012001");
    assert.equal(tenDigitKode("desa-slug"), null);
  });
});

describe("sik merge rules", () => {
  it("skips rekapitulasi and prefixes new ids with SIK-", () => {
    assert.equal(isRekapitulasiTahunan("Rekapitulasi Tahunan"), true);
    assert.equal(newSikEventId("42"), "SIK-42");
    assert.equal(newSikEventId("ACEH-2023-9999"), "SIK-ACEH-2023-9999");

    const { kejadian, report } = mergeSikIntoKejadian(
      [],
      [
        { sik_id: "r1", jenis_bencana: "Rekapitulasi Tahunan", hari_tanggal: "2023" },
        {
          sik_id: "99",
          jenis_bencana: "Banjir",
          hari_tanggal: "2024-01-02",
          kabupaten: "Pidie",
          latitude: 5.2,
          longitude: 96.1,
        },
      ]
    );
    assert.equal(report.skipped.length, 1);
    assert.equal(report.new, 1);
    assert.equal(kejadian[0].id, "SIK-99");
    assert.ok(kejadian[0].sumber_data.includes("sik_aceh.db"));
  });

  it("fill-null only and never rewrites jenis_bencana", () => {
    const existing = [
      {
        id: "ACEH-2023-0001",
        jenis_bencana: "Banjir",
        hari_tanggal: "2023-01-01",
        jiwa_terdampak: null,
        lokasi: { kabupaten: "Pidie", desa: "-", kecamatan: "Muara Tiga" },
        arah_di_peta: { latitude: 5.21, longitude: 96.12 },
        jumlah_korban: { meninggal: 2 },
      },
    ];
    const { kejadian, report } = mergeSikIntoKejadian(existing, [
      {
        sik_id: "ACEH-2023-0001",
        jenis_bencana: "Flood",
        hari_tanggal: "2023-01-01",
        kabupaten: "Pidie",
        kecamatan: "Muara Tiga",
        desa: "Suka Damai",
        jiwa_terdampak: 40,
        meninggal: 9,
        latitude: 5.21,
        longitude: 96.12,
      },
    ]);
    assert.equal(report.matched, 1);
    assert.equal(kejadian[0].jenis_bencana, "Banjir");
    assert.equal(kejadian[0].jiwa_terdampak, 40);
    assert.equal(kejadian[0].lokasi.desa, "Suka Damai");
    assert.equal(kejadian[0].jumlah_korban.meninggal, 2);
    assert.ok(
      report.attributeConflicts.some((c) => c.field === "jenis_bencana")
    );
    assert.ok(
      report.attributeConflicts.some((c) => c.field === "jumlah_korban.meninggal")
    );
  });

  it("keeps good GPS, upgrades truncated, quarantines far decimals", () => {
    const keep = classifyGps(
      { lat: 5.1234, lng: 96.5432 },
      { lat: 5, lng: 96 }
    );
    assert.equal(keep.action, "keep");

    const upgrade = classifyGps(
      { lat: 5, lng: 96 },
      { lat: 5.21, lng: 96.12 }
    );
    assert.equal(upgrade.action, "upgrade");

    const quarantine = classifyGps(
      { lat: 5.2, lng: 96.1 },
      { lat: 5.3, lng: 96.2 }
    );
    assert.equal(quarantine.action, "quarantine");
    assert.ok(quarantine.meters > 100);

    const { report } = mergeSikIntoKejadian(
      [
        {
          id: "ACEH-KEEP",
          jenis_bencana: "Longsor",
          hari_tanggal: "2023-02-02",
          lokasi: { kabupaten: "Pidie", desa: "A" },
          arah_di_peta: { latitude: 5.2, longitude: 96.1 },
        },
      ],
      [
        {
          sik_id: "ACEH-KEEP",
          jenis_bencana: "Longsor",
          hari_tanggal: "2023-02-02",
          kabupaten: "Pidie",
          desa: "A",
          latitude: 5.3,
          longitude: 96.2,
        },
      ]
    );
    assert.equal(report.gpsConflicts.length, 1);
    assert.equal(report.gpsConflicts[0].reason, "decimal_gps_gt_100m");
    assert.equal(report.gpsConflicts[0].id, "ACEH-KEEP");
    assert.ok(report.gpsConflicts[0].meters > 100);
  });

  it("keeps existing GPS on decimal_gps_gt_100m quarantine", () => {
    const { kejadian, report } = mergeSikIntoKejadian(
      [
        {
          id: "ACEH-KEEP",
          jenis_bencana: "Longsor",
          hari_tanggal: "2023-02-02",
          lokasi: { kabupaten: "Pidie", desa: "A" },
          arah_di_peta: { latitude: 5.2, longitude: 96.1 },
        },
      ],
      [
        {
          sik_id: "ACEH-KEEP",
          jenis_bencana: "Longsor",
          hari_tanggal: "2023-02-02",
          kabupaten: "Pidie",
          desa: "A",
          latitude: 5.3,
          longitude: 96.2,
          jiwa_terdampak: 11,
        },
      ]
    );
    assert.equal(report.gpsConflicts[0].reason, "decimal_gps_gt_100m");
    assert.equal(kejadian[0].arah_di_peta.latitude, 5.2);
    assert.equal(kejadian[0].arah_di_peta.longitude, 96.1);
    assert.equal(kejadian[0].jiwa_terdampak, 11);
    assert.equal(kejadian[0].payload.sik.gps, "quarantine");
    assert.equal(quarantineKeepsExistingGps(kejadian, report.gpsConflicts), true);
  });

  it("quarantineKeepsExistingGps is false if SIK overwrite slipped through", () => {
    assert.equal(
      quarantineKeepsExistingGps(
        [
          {
            id: "ACEH-KEEP",
            arah_di_peta: { latitude: 5.3, longitude: 96.2 },
          },
        ],
        [
          {
            id: "ACEH-KEEP",
            existing: { lat: 5.2, lng: 96.1 },
            sik: { lat: 5.3, lng: 96.2 },
          },
        ]
      ),
      false
    );
  });

  it("matches natural key on 10-digit kode and does not invent kodes", () => {
    const existing = {
      id: "ACEH-KODE",
      jenis_bencana: "Kebakaran",
      hari_tanggal: "2023-03-03",
      lokasi: {
        kabupaten: "Aceh Utara",
        desa: "Nama Lama",
        kode_desa_kelurahan: "1108052001",
      },
      arah_di_peta: { latitude: 5.01, longitude: 97.02 },
    };
    const sik = {
      sik_id: "local-7",
      jenis_bencana: "Kebakaran",
      hari_tanggal: "2023-03-03",
      kabupaten: "Kab. Aceh Utara",
      desa: "Nama Baru Tidak Dipakai Untuk Join",
      kode_desa_kelurahan: "1108052001",
      latitude: 5.01,
      longitude: 97.02,
      pengungsi: 12,
    };
    assert.equal(
      naturalKey({
        ...existing,
        kabupaten: existing.lokasi.kabupaten,
        desa: existing.lokasi.desa,
        kode_desa_kelurahan: existing.lokasi.kode_desa_kelurahan,
      }).split("::")[2],
      "1108052001"
    );
    const { kejadian, report } = mergeSikIntoKejadian([existing], [sik]);
    assert.equal(report.matched, 1);
    assert.equal(kejadian[0].id, "ACEH-KODE");
    assert.equal(kejadian[0].pengungsi, 12);
    assert.equal(kejadian[0].payload.sik_id, "local-7");
  });

  it("fill-null profil only on 10-digit intersection", () => {
    const { rows, report } = fillNullProfilByKode(
      [
        { kode_desa_kelurahan: "1101012001", kk_terdampak: null, korban_meninggal: 3 },
        { kode_desa_kelurahan: null, kk_terdampak: null },
        { kode_desa_kelurahan: "1101012002", kk_terdampak: 4 },
      ],
      [
        { kode_desa_kelurahan: "1101012001", kk_terdampak: 9, korban_meninggal: 1 },
        { kode_desa_kelurahan: "9999999999", kk_terdampak: 1 },
      ],
      ["kk_terdampak", "korban_meninggal"]
    );
    assert.equal(rows[0].kk_terdampak, 9);
    assert.equal(rows[0].korban_meninggal, 3);
    assert.equal(rows[1].kk_terdampak, null);
    assert.equal(report.updated, 1);
    assert.equal(report.conflicts.length, 1);
  });
});

describe("sik disaster markers", () => {
  it("omits markers without GPS and flags integer / offshore coords", () => {
    assert.equal(
      kejadianToDisasterFeature({
        id: "SIK-1",
        jenis_bencana: "Banjir",
        lokasi: { kabupaten: "Pidie" },
      }).skipped,
      "no_gps"
    );
    const offshore = kejadianToDisasterFeature({
      id: "ACEH-2023-0005",
      jenis_bencana: "Gempa Bumi",
      lokasi: { kabupaten: "Aceh Singkil" },
      arah_di_peta: { latitude: 1.91, longitude: 97.83 },
      sumber_data: ["sik_aceh.db"],
    });
    assert.equal(offshore.properties.coord_quality, "offshore_or_out_of_bbox");
    const rebuilt = rebuildDisasterEventLayer(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "bridge-1",
            properties: { layer: "infraRoadBridge" },
            geometry: { type: "Point", coordinates: [96, 5] },
          },
          {
            type: "Feature",
            id: "old",
            properties: { layer: "disasterEvents" },
            geometry: { type: "Point", coordinates: [96, 5] },
          },
        ],
      },
      [
        {
          id: "SIK-2",
          jenis_bencana: "Banjir",
          lokasi: { kabupaten: "Pidie" },
          arah_di_peta: { latitude: 5.2, longitude: 96.1 },
          payload: { sik_id: "2" },
        },
      ]
    );
    assert.equal(rebuilt.counts.preservedOther, 1);
    assert.equal(rebuilt.counts.disasterEvents, 1);
    assert.equal(rebuilt.collection.features[1].properties.source, "sik_aceh.db");
  });
});

describe("import-sik-aceh.py inspect + merge", () => {
  it("extracts a synthetic sqlite and dry-runs without writing fixtures", () => {
    const dir = mkdtempSync(join(tmpdir(), "sik-aceh-"));
    const db = join(dir, "sik_aceh.db");
    const kejadianPath = join(dir, "kejadian.json");
    const markersPath = join(dir, "markers.geojson");
    writeFileSync(
      kejadianPath,
      JSON.stringify({
        metadata: { total_kejadian_tercatat: 1, sumber: ["BPBA"] },
        kejadian: [
          {
            id: "ACEH-2023-0001",
            jenis_bencana: "Banjir",
            hari_tanggal: "2023-01-01",
            jiwa_terdampak: null,
            lokasi: { kabupaten: "Pidie", desa: "-", kecamatan: "Muara Tiga" },
            arah_di_peta: { latitude: 5.21, longitude: 96.12 },
          },
        ],
      })
    );
    writeFileSync(
      markersPath,
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "bridge-keep",
            properties: { layer: "infraRoadBridge" },
            geometry: { type: "Point", coordinates: [96.2, 5.1] },
          },
        ],
      })
    );
    execFileSync("python3", [
      "-c",
      `
import sqlite3
con = sqlite3.connect(${JSON.stringify(db)})
con.execute("create table users (id integer, password text)")
con.execute("create table kejadian (id_kejadian text, jenis text, tanggal text, lat real, lng real, nama_kabupaten text, desa text, jiwa integer)")
con.execute("insert into users values (1, 'secret')")
con.execute("insert into kejadian values ('ACEH-2023-0001', 'Banjir', '2023-01-01', 5.21, 96.12, 'Kab. Pidie', 'Suka Damai', 40)")
con.execute("insert into kejadian values ('88', 'Kebakaran', '2024-06-01', 5.22, 96.13, 'Pidie', 'Baru', 3)")
con.execute("insert into kejadian values ('r', 'Rekapitulasi Tahunan', '2023', 5.2, 96.1, 'Pidie', '-', 0)")
con.commit()
`,
    ]);
    const out = execFileSync(
      "python3",
      [
        join(root, "scripts/import-sik-aceh.py"),
        "--db",
        db,
        "--kejadian",
        kejadianPath,
        "--markers",
        markersPath,
      ],
      { encoding: "utf8" }
    );
    assert.match(out, /"kejadian_table": "kejadian"/);
    assert.match(out, /"rejected_tables": \[\s*"users"\s*\]/);
    const after = JSON.parse(readFileSync(kejadianPath, "utf8"));
    assert.equal(after.kejadian.length, 1);
    assert.equal(after.kejadian[0].jiwa_terdampak, null);

    execFileSync(
      "python3",
      [
        join(root, "scripts/import-sik-aceh.py"),
        "--db",
        db,
        "--write-fixtures",
        "--kejadian",
        kejadianPath,
        "--markers",
        markersPath,
      ],
      { encoding: "utf8" }
    );
    const merged = JSON.parse(readFileSync(kejadianPath, "utf8"));
    assert.equal(merged.kejadian.length, 2);
    assert.equal(merged.kejadian[0].jiwa_terdampak, 40);
    assert.equal(merged.kejadian[0].lokasi.desa, "Suka Damai");
    assert.equal(merged.kejadian[1].id, "SIK-88");
    const markers = JSON.parse(readFileSync(markersPath, "utf8"));
    const layers = markers.features.map((f) => f.properties.layer);
    assert.ok(layers.includes("infraRoadBridge"));
    assert.equal(layers.filter((l) => l === "disasterEvents").length, 2);
    rmSync(dir, { recursive: true, force: true });
  });

  it("dry-run picks kejadian when jenis column is jenis_bencana_teks", () => {
    const dir = mkdtempSync(join(tmpdir(), "sik-aceh-teks-"));
    const db = join(dir, "sik_aceh.db");
    const kejadianPath = join(dir, "kejadian.json");
    const markersPath = join(dir, "markers.geojson");
    writeFileSync(
      kejadianPath,
      JSON.stringify({
        metadata: { total_kejadian_tercatat: 0, sumber: [] },
        kejadian: [],
      })
    );
    writeFileSync(
      markersPath,
      JSON.stringify({ type: "FeatureCollection", features: [] })
    );
    execFileSync("python3", [
      "-c",
      `
import sqlite3
con = sqlite3.connect(${JSON.stringify(db)})
con.execute("create table ref_kabupaten_kota (id integer, jenis text, nama_kabupaten text, latitude real, longitude real)")
con.execute("create table kejadian (id text, jenis_bencana_teks text, tanggal text, latitude real, longitude real, kabupaten text)")
con.execute("insert into ref_kabupaten_kota values (1, 'kabupaten', 'Pidie', 5.2, 96.1)")
con.execute("insert into kejadian values ('1', 'Banjir', '2024-01-02', 5.21, 96.12, 'Pidie')")
con.execute("insert into kejadian values ('2', 'Longsor', '2024-03-04', 5.22, 96.13, 'Bireuen')")
con.commit()
`,
    ]);
    const out = execFileSync(
      "python3",
      [
        join(root, "scripts/import-sik-aceh.py"),
        "--db",
        db,
        "--kejadian",
        kejadianPath,
        "--markers",
        markersPath,
      ],
      { encoding: "utf8" }
    );
    assert.match(out, /"kejadian_table": "kejadian"/);
    assert.match(out, /"extracted_rows": 2/);
    assert.match(out, /"jenis_bencana": "jenis_bencana_teks"/);
    assert.match(out, /Dry-run: fixtures unchanged/);
    const after = JSON.parse(readFileSync(kejadianPath, "utf8"));
    assert.equal(after.kejadian.length, 0);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("accept-gps-quarantine write guard", () => {
  const apply = join(root, "scripts/lib/sik-apply.mjs");
  const importer = join(root, "scripts/import-sik-aceh.py");

  function conflictFixture(dir) {
    const kejadianPath = join(dir, "kejadian.json");
    const markersPath = join(dir, "markers.geojson");
    const extractedPath = join(dir, "extracted.json");
    const reportPath = join(dir, "report.json");
    writeFileSync(
      kejadianPath,
      JSON.stringify({
        metadata: { total_kejadian_tercatat: 1, sumber: ["BPBA"] },
        kejadian: [
          {
            id: "ACEH-KEEP",
            jenis_bencana: "Longsor",
            hari_tanggal: "2023-02-02",
            lokasi: { kabupaten: "Pidie", desa: "A" },
            arah_di_peta: { latitude: 5.2, longitude: 96.1 },
          },
        ],
      })
    );
    writeFileSync(
      markersPath,
      JSON.stringify({ type: "FeatureCollection", features: [] })
    );
    writeFileSync(
      extractedPath,
      JSON.stringify({
        rows: [
          {
            sik_id: "ACEH-KEEP",
            jenis_bencana: "Longsor",
            hari_tanggal: "2023-02-02",
            kabupaten: "Pidie",
            desa: "A",
            latitude: 5.3,
            longitude: 96.2,
            jiwa_terdampak: 11,
          },
        ],
      })
    );
    return { kejadianPath, markersPath, extractedPath, reportPath };
  }

  it("still refuses --write-fixtures on GPS quarantine without the flag", () => {
    const dir = mkdtempSync(join(tmpdir(), "sik-q-refuse-"));
    const paths = conflictFixture(dir);
    let status = 0;
    try {
      execFileSync(
        process.execPath,
        [
          apply,
          "--extracted",
          paths.extractedPath,
          "--write-fixtures",
          "--kejadian",
          paths.kejadianPath,
          "--markers",
          paths.markersPath,
          "--report",
          paths.reportPath,
        ],
        { encoding: "utf8" }
      );
    } catch (err) {
      status = err.status;
    }
    assert.equal(status, 2);
    const after = JSON.parse(readFileSync(paths.kejadianPath, "utf8"));
    assert.equal(after.kejadian[0].arah_di_peta.latitude, 5.2);
    assert.equal(after.kejadian[0].jiwa_terdampak, undefined);
    assert.equal(after.metadata.sik_merge, undefined);
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes fixtures with --accept-gps-quarantine while keeping existing GPS", () => {
    const dir = mkdtempSync(join(tmpdir(), "sik-q-accept-"));
    const paths = conflictFixture(dir);
    const out = execFileSync(
      process.execPath,
      [
        apply,
        "--extracted",
        paths.extractedPath,
        "--write-fixtures",
        "--accept-gps-quarantine",
        "--kejadian",
        paths.kejadianPath,
        "--markers",
        paths.markersPath,
        "--report",
        paths.reportPath,
      ],
      { encoding: "utf8" }
    );
    assert.match(out, /"gpsConflicts": 1/);
    const merged = JSON.parse(readFileSync(paths.kejadianPath, "utf8"));
    assert.equal(merged.kejadian[0].arah_di_peta.latitude, 5.2);
    assert.equal(merged.kejadian[0].arah_di_peta.longitude, 96.1);
    assert.equal(merged.kejadian[0].jiwa_terdampak, 11);
    assert.equal(merged.metadata.sik_merge.gpsConflicts, 1);
    assert.equal(merged.metadata.sik_merge.accepted_gps_quarantine, true);
    assert.equal(merged.metadata.sik_merge.attributeConflicts, 0);
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes --accept-gps-quarantine from import-sik-aceh.py", () => {
    const dir = mkdtempSync(join(tmpdir(), "sik-q-py-"));
    const db = join(dir, "sik_aceh.db");
    const { kejadianPath, markersPath } = conflictFixture(dir);
    execFileSync("python3", [
      "-c",
      `
import sqlite3
con = sqlite3.connect(${JSON.stringify(db)})
con.execute("create table kejadian (id text, jenis text, tanggal text, lat real, lng real, nama_kabupaten text, desa text, jiwa integer)")
con.execute("insert into kejadian values ('ACEH-KEEP', 'Longsor', '2023-02-02', 5.3, 96.2, 'Pidie', 'A', 11)")
con.commit()
`,
    ]);
    const refused = (() => {
      try {
        execFileSync(
          "python3",
          [
            importer,
            "--db",
            db,
            "--write-fixtures",
            "--kejadian",
            kejadianPath,
            "--markers",
            markersPath,
          ],
          { encoding: "utf8" }
        );
        return 0;
      } catch (err) {
        return err.status;
      }
    })();
    assert.equal(refused, 2);
    const before = JSON.parse(readFileSync(kejadianPath, "utf8"));
    assert.equal(before.kejadian[0].arah_di_peta.latitude, 5.2);

    execFileSync(
      "python3",
      [
        importer,
        "--db",
        db,
        "--write-fixtures",
        "--accept-gps-quarantine",
        "--kejadian",
        kejadianPath,
        "--markers",
        markersPath,
      ],
      { encoding: "utf8" }
    );
    const merged = JSON.parse(readFileSync(kejadianPath, "utf8"));
    assert.equal(merged.kejadian[0].arah_di_peta.latitude, 5.2);
    assert.equal(merged.kejadian[0].arah_di_peta.longitude, 96.1);
    assert.equal(merged.kejadian[0].jiwa_terdampak, 11);
    assert.equal(merged.metadata.sik_merge.gpsConflicts, 1);
    rmSync(dir, { recursive: true, force: true });
  });
});
