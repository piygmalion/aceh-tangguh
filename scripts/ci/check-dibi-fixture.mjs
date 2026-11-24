/**
 * Konsistensi fixture DIBI. Angka tidak dikunci di kode:
 * jumlah setiap metrik di by_tahun harus sama dengan totals pada berkas.
 * Tahun 2008–2026 wajib ada. Null gagal. Nol tetap nol.
 * Tidak memanggil /api/dibi/aceh dan tidak menulis fixture.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DIBI_FIXTURE_PATH = join(ROOT, "public", "fixtures", "dibi-aceh.json");

export const DIBI_YEAR_FROM = 2008;
export const DIBI_YEAR_TO = 2026;

export const DIBI_METRICS = [
  "kejadian",
  "meninggal",
  "hilang",
  "luka_sakit",
  "menderita_mengungsi",
  "rumah_rusak_berat",
  "rumah_rusak_sedang",
  "rumah_rusak_ringan",
  "rumah_terendam",
  "estimasi_kerugian_rumah",
];

/**
 * @param {unknown} payload
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function assessDibiFixture(payload) {
  /** @type {string[]} */
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return { ok: false, errors: ["payload bukan objek"] };
  }
  const body = /** @type {Record<string, unknown>} */ (payload);
  const totals = body.totals;
  const rows = body.by_tahun;
  if (!totals || typeof totals !== "object") errors.push("totals hilang");
  if (!Array.isArray(rows)) {
    errors.push("by_tahun bukan array");
    return { ok: false, errors };
  }

  /** @type {Set<number>} */
  const seen = new Set();
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      errors.push("baris by_tahun kosong");
      continue;
    }
    const rec = /** @type {Record<string, unknown>} */ (row);
    const tahun = rec.tahun;
    if (typeof tahun !== "number" || !Number.isInteger(tahun)) {
      errors.push("tahun hilang atau null");
      continue;
    }
    if (seen.has(tahun)) errors.push(`tahun ${tahun} ganda`);
    seen.add(tahun);
    if (tahun < DIBI_YEAR_FROM || tahun > DIBI_YEAR_TO) {
      errors.push(`tahun ${tahun} di luar ${DIBI_YEAR_FROM}–${DIBI_YEAR_TO}`);
    }
    for (const key of DIBI_METRICS) {
      const value = rec[key];
      if (value === null || value === undefined) {
        errors.push(`${tahun} ${key} null`);
        continue;
      }
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(`${tahun} ${key} bukan angka`);
      }
    }
  }

  for (let year = DIBI_YEAR_FROM; year <= DIBI_YEAR_TO; year += 1) {
    if (!seen.has(year)) errors.push(`tahun ${year} hilang`);
  }

  if (totals && typeof totals === "object") {
    const totalRec = /** @type {Record<string, unknown>} */ (totals);
    for (const key of DIBI_METRICS) {
      const expected = totalRec[key];
      if (typeof expected !== "number" || !Number.isFinite(expected)) {
        errors.push(`totals.${key} bukan angka`);
        continue;
      }
      let sum = 0;
      let complete = true;
      for (const row of rows) {
        const value = /** @type {Record<string, unknown>} */ (row)?.[key];
        if (typeof value !== "number" || !Number.isFinite(value)) {
          complete = false;
          break;
        }
        sum += value;
      }
      if (complete && sum !== expected) {
        errors.push(`by_tahun.${key} berjumlah ${sum}, totals.${key} ${expected}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

async function main() {
  const raw = await readFile(DIBI_FIXTURE_PATH, "utf8");
  const payload = JSON.parse(raw);
  const verdict = assessDibiFixture(payload);
  const fetchedAt = payload?.metadata?.fetched_at ?? "(tanpa fetched_at)";
  if (!verdict.ok) {
    console.error(`Fixture DIBI gagal (${fetchedAt})`);
    for (const error of verdict.errors) console.error(`  ${error}`);
    process.exit(1);
  }
  const totals = payload.totals;
  console.log(
    `Fixture DIBI konsisten ${fetchedAt}: by_tahun ${DIBI_YEAR_FROM}–${DIBI_YEAR_TO} utuh, jumlah = totals (kejadian ${totals.kejadian}, meninggal ${totals.meninggal}). Angka ini dibaca dari berkas, bukan dikunci di skrip.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
