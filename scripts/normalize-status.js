#!/usr/bin/env node
/**
 * Idempotent rewrite of clear status aliases in markers.geojson.
 *
 * Only folds case/typos that `src/lib/status-vocab.ts` treats as the same
 * meaning (Terlaksana/Telaksana/Terlaksanakan, Lancar/lancar, Aktif/aktif).
 * Does NOT fill empty/null, does NOT merge operasional ↔ operasional_penuh,
 * does NOT invent coordinates.
 *
 * Usage:
 *   node scripts/normalize-status.js           # apply + print counts
 *   node scripts/normalize-status.js --dry-run # print only
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MARKERS_PATH = path.join(ROOT, "public/fixtures/markers.geojson");
const DRY_RUN = process.argv.includes("--dry-run");

function foldStatus(raw) {
  return String(raw)
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[_/|,;:]+/g, " ")
    .replace(/-+/g, " ")
    .replace(/\s+/g, " ");
}

/** Must stay aligned with EDUCATION aliases in src/lib/status-vocab.ts */
const EDUCATION_ALIASES = {
  terlaksana: "Terlaksana",
  telaksana: "Terlaksana",
  terlaksanakan: "Terlaksana",
  lancar: "Lancar",
  aktif: "Aktif",
};

function educationRewrite(raw) {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const target = EDUCATION_ALIASES[foldStatus(text)];
  if (!target || target === text) return null;
  return target;
}

function main() {
  const raw = fs.readFileSync(MARKERS_PATH, "utf8");
  const fc = JSON.parse(raw);
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    throw new Error("markers.geojson is not a FeatureCollection");
  }

  const changes = [];
  for (const f of fc.features) {
    const props = f.properties || {};
    const layer = props.layer;
    const before = props.status;
    if (layer !== "facEducation") continue;
    const next = educationRewrite(before);
    if (next) {
      changes.push({
        id: f.id,
        layer,
        from: before,
        to: next,
      });
      if (!DRY_RUN) props.status = next;
    }
  }

  if (!DRY_RUN && changes.length > 0) {
    fs.writeFileSync(MARKERS_PATH, JSON.stringify(fc));
  }

  const byPair = new Map();
  for (const c of changes) {
    const k = `${c.from} → ${c.to}`;
    byPair.set(k, (byPair.get(k) || 0) + 1);
  }

  console.log(DRY_RUN ? "dry-run (no write)" : "wrote fixtures/markers.geojson");
  console.log(`rewrites: ${changes.length}`);
  for (const [k, n] of [...byPair.entries()].sort()) {
    console.log(`  ${n}\t${k}`);
  }
}

main();
