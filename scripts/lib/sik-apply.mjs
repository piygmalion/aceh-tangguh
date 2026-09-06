#!/usr/bin/env node
/**
 * Merge extracted SIK rows into kejadian-bencana.json (optional write).
 *
 *   node scripts/lib/sik-apply.mjs --extracted path.json
 *   node scripts/lib/sik-apply.mjs --extracted path.json --write-fixtures
 *   node scripts/lib/sik-apply.mjs --extracted path.json --write-fixtures --accept-gps-quarantine
 *
 * GPS quarantines block --write-fixtures unless --accept-gps-quarantine is
 * set AND every quarantine row still keeps existing GPS (SIK decimal >100 m
 * is never written). Attribute conflicts are recorded in payload.sik and
 * do not block the write.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { mergeSikIntoKejadian, quarantineKeepsExistingGps } from "./sik-merge.mjs";
import { rebuildDisasterEventLayer } from "./sik-markers.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function argValue(argv, flag, fallback) {
  const idx = argv.indexOf(flag);
  if (idx < 0) return fallback;
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) return fallback;
  return value;
}

function parseArgs(argv) {
  return {
    writeFixtures: argv.includes("--write-fixtures"),
    acceptGpsQuarantine: argv.includes("--accept-gps-quarantine"),
    extracted: argValue(argv, "--extracted", resolve(root, "scripts/_/sik-extracted.json")),
    kejadianPath: argValue(argv, "--kejadian", resolve(root, "public/fixtures/kejadian-bencana.json")),
    markersPath: argValue(argv, "--markers", resolve(root, "public/fixtures/markers.geojson")),
    reportPath: argValue(argv, "--report", resolve(root, "scripts/_/sik-conflict-report.json")),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const extracted = JSON.parse(readFileSync(args.extracted, "utf8"));
  const sikRows = extracted.rows || [];
  const fixture = JSON.parse(readFileSync(args.kejadianPath, "utf8"));
  const existing = fixture.kejadian || [];

  const { kejadian, report } = mergeSikIntoKejadian(existing, sikRows);
  report.inspected = extracted.inspected || null;
  report.existing = existing.length;
  report.result = kejadian.length;

  mkdirSync(dirname(args.reportPath), { recursive: true });
  writeFileSync(args.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        existing: report.existing,
        matched: report.matched,
        new: report.new,
        fillNull: report.fillNull,
        gpsUpgrades: report.gpsUpgrades,
        skipped: report.skipped.length,
        gpsConflicts: report.gpsConflicts.length,
        attributeConflicts: report.attributeConflicts.length,
        result: report.result,
        report: args.reportPath,
        writeFixtures: args.writeFixtures,
        acceptGpsQuarantine: args.acceptGpsQuarantine,
      },
      null,
      2
    )
  );

  if (!args.writeFixtures) {
    console.log("Dry-run: fixtures unchanged.");
    return;
  }

  if (report.gpsConflicts.length) {
    const keepsExisting = quarantineKeepsExistingGps(kejadian, report.gpsConflicts);
    if (!args.acceptGpsQuarantine) {
      console.error(
        `Refusing --write-fixtures: ${report.gpsConflicts.length} GPS quarantine(s). Re-run with --accept-gps-quarantine to keep existing GPS. See ${args.reportPath}`
      );
      process.exit(2);
    }
    if (!keepsExisting) {
      console.error(
        `Refusing --write-fixtures: --accept-gps-quarantine requires keeping existing GPS; SIK overwrite detected. See ${args.reportPath}`
      );
      process.exit(2);
    }
  }

  const nextFixture = {
    ...fixture,
    metadata: {
      ...(fixture.metadata || {}),
      total_kejadian_tercatat: kejadian.length,
      terakhir_diperbarui: new Date().toISOString().slice(0, 10),
      sik_merge: {
        source: "sik_aceh.db",
        matched: report.matched,
        new: report.new,
        fillNull: report.fillNull,
        gpsUpgrades: report.gpsUpgrades,
        gpsConflicts: report.gpsConflicts.length,
        attributeConflicts: report.attributeConflicts.length,
        accepted_gps_quarantine:
          Boolean(args.acceptGpsQuarantine) && report.gpsConflicts.length > 0,
      },
    },
    kejadian,
  };
  const sumber = Array.isArray(nextFixture.metadata.sumber)
    ? [...nextFixture.metadata.sumber]
    : [];
  if (!sumber.includes("sik_aceh.db")) sumber.push("sik_aceh.db");
  nextFixture.metadata.sumber = sumber;

  writeFileSync(args.kejadianPath, `${JSON.stringify(nextFixture)}\n`, "utf8");

  const markers = JSON.parse(readFileSync(args.markersPath, "utf8"));
  const rebuilt = rebuildDisasterEventLayer(markers, kejadian);
  writeFileSync(args.markersPath, `${JSON.stringify(rebuilt.collection)}\n`, "utf8");
  console.log(`wrote ${args.kejadianPath}`);
  console.log(`wrote ${args.markersPath}`, rebuilt.counts);

  const defaultMarkers = resolve(root, "public/fixtures/markers.geojson");
  if (resolve(args.markersPath) === defaultMarkers) {
    const flag = spawnSync(
      process.execPath,
      [resolve(root, "scripts/flag-truncated-coords.js")],
      { stdio: "inherit" }
    );
    if (flag.status !== 0) {
      process.exit(flag.status ?? 1);
    }
  }
}

main();
