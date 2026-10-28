/**
 * Read-only check for the kabupaten registry after DATA-kode (2026-10-28).
 * Does not write fixtures, tiles, or a database.
 *
 * Asserts 23 kab/kota, unique Kemendagri adm2, unique kode_bps where present,
 * and kode_sik aligned with Kemendagri (the four swapped pairs are gone).
 * kode_bps must equal the BPS kode_kab of the unique name match in
 * boundaries-aceh-kab.geojson, or be null when that match is missing.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Kemendagri adm2 that must stay put. kode_sik is this code without the dot. */
export const KEMENDAGRI_FOUR = [
  ["Aceh Tamiang", "11.16"],
  ["Aceh Jaya", "11.14"],
  ["Langsa", "11.74"],
  ["Lhokseumawe", "11.73"],
];

export function normKabName(name) {
  return String(name ?? "")
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/^(kota(\s+administratif)?|kabupaten|kab\.?|kotamadya)\s+/, "")
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function kemendagriDigits(adm2) {
  const trimmed = String(adm2 ?? "").trim();
  if (!/^\d{2}\.\d{2}$/.test(trimmed)) return null;
  return trimmed.replace(".", "");
}

/**
 * @param {{ kabupaten_kota?: unknown[] }} registry
 * @param {{ features?: { properties?: { name?: string, kode_kab?: string } }[] }} boundaries
 * @returns {string[]}
 */
export function checkKabKode(registry, boundaries) {
  const errors = [];
  const rows = Array.isArray(registry?.kabupaten_kota) ? registry.kabupaten_kota : [];
  if (rows.length !== 23) errors.push(`expected 23 kab/kota, got ${rows.length}`);

  const adm2s = rows.map((row) => row.adm2);
  const siks = rows.map((row) => row.kode_sik);
  if (new Set(adm2s).size !== rows.length) errors.push("Kemendagri adm2 is not unique");
  if (new Set(siks).size !== rows.length) errors.push("kode_sik is not unique");

  const bpsPresent = rows
    .map((row) => row.kode_bps)
    .filter((value) => value != null && value !== "");
  if (new Set(bpsPresent).size !== bpsPresent.length) {
    errors.push("kode_bps is not unique where present");
  }

  const byName = new Map();
  for (const feature of boundaries?.features ?? []) {
    const key = normKabName(feature?.properties?.name);
    const kode = feature?.properties?.kode_kab ?? null;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(kode);
  }

  for (const row of rows) {
    if (!Object.prototype.hasOwnProperty.call(row, "kode_bps")) {
      errors.push(`${row.nama}: missing kode_bps`);
    }
    const digits = kemendagriDigits(row.adm2);
    if (!digits) {
      errors.push(`${row.nama}: adm2 ${row.adm2} is not Kemendagri dd.dd`);
    } else if (row.kode_sik !== digits) {
      errors.push(
        `${row.nama}: kode_sik ${row.kode_sik} is swapped versus Kemendagri ${row.adm2}`
      );
    }
    const hits = byName.get(normKabName(row.nama)) ?? [];
    const unique = [...new Set(hits.filter((value) => value != null && value !== ""))];
    if (unique.length === 1) {
      if (row.kode_bps !== unique[0]) {
        errors.push(
          `${row.nama}: kode_bps ${row.kode_bps ?? "null"} != boundaries kode_kab ${unique[0]}`
        );
      }
    } else if (row.kode_bps != null) {
      errors.push(
        `${row.nama}: kode_bps ${row.kode_bps} is set without an unambiguous name match (${unique.length})`
      );
    }
  }

  for (const [nama, adm2] of KEMENDAGRI_FOUR) {
    const row = rows.find((item) => item.nama === nama);
    if (!row) {
      errors.push(`missing ${nama}`);
      continue;
    }
    if (row.adm2 !== adm2) errors.push(`${nama}: adm2 changed from ${adm2} to ${row.adm2}`);
    const digits = kemendagriDigits(adm2);
    if (row.kode_sik !== digits) {
      errors.push(`${nama}: kode_sik ${row.kode_sik} still swapped; Kemendagri ${adm2} requires ${digits}`);
    }
  }

  return errors;
}

export function loadKabKodeInputs(repoRoot = root) {
  const registry = JSON.parse(
    readFileSync(path.join(repoRoot, "public/fixtures/aceh-kabupaten-registry.json"), "utf8")
  );
  const boundaries = JSON.parse(
    readFileSync(path.join(repoRoot, "public/fixtures/boundaries-aceh-kab.geojson"), "utf8")
  );
  return { registry, boundaries };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const { registry, boundaries } = loadKabKodeInputs();
  const errors = checkKabKode(registry, boundaries);
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  console.log(
    "check-kab-kode: 23 kab/kota, unique Kemendagri, unique kode_bps, kode_sik aligned"
  );
}
