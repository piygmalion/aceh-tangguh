/**
 * Gerbang statis migrasi. Tidak membuka basis data.
 *
 * Supabase menolak `GRANT` berulang pada skema `cron` dengan 2BP01
 * (event trigger pg_cron). Ekstensi yang dibuat dua kali juga ditolak.
 * Pemeriksaan ini hanya membaca berkas di supabase/migrations/.
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

/** @param {string} sql */
export function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

/**
 * @param {{ name: string, sql: string }[]} files
 * @returns {string[]}
 */
export function findRepeatedMigrationRisks(files) {
  /** @type {Map<string, string[]>} */
  const extensions = new Map();
  /** @type {Map<string, string[]>} */
  const grants = new Map();

  for (const file of files) {
    const sql = stripSqlComments(file.sql);
    const extRe =
      /create\s+extension\s+(?:if\s+not\s+exists\s+)?(?:"([^"]+)"|([a-zA-Z_][\w$]*))/gi;
    let match;
    while ((match = extRe.exec(sql))) {
      const name = (match[1] || match[2]).toLowerCase();
      const seen = extensions.get(name) ?? [];
      seen.push(file.name);
      extensions.set(name, seen);
    }
    const grantRe = /grant\s+[^;]*\bschema\s+cron\b[^;]*;/gi;
    while ((match = grantRe.exec(sql))) {
      const fingerprint = match[0].replace(/\s+/g, " ").trim().toLowerCase();
      const seen = grants.get(fingerprint) ?? [];
      seen.push(file.name);
      grants.set(fingerprint, seen);
    }
  }

  /** @type {string[]} */
  const errors = [];
  for (const [name, seen] of extensions) {
    if (seen.length > 1) {
      errors.push(`create extension ${name} berulang di ${seen.join(", ")}`);
    }
  }
  for (const [fingerprint, seen] of grants) {
    if (seen.length > 1) {
      errors.push(`grant schema cron berulang di ${seen.join(", ")}: ${fingerprint}`);
    }
  }
  return errors;
}

/**
 * @param {string} [dir]
 * @returns {Promise<{ name: string, sql: string }[]>}
 */
export async function readMigrationFiles(dir = MIGRATIONS_DIR) {
  const names = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
  const files = [];
  for (const name of names) {
    files.push({ name, sql: await readFile(join(dir, name), "utf8") });
  }
  return files;
}

async function main() {
  const files = await readMigrationFiles();
  const errors = findRepeatedMigrationRisks(files);
  if (errors.length > 0) {
    console.error(`Gagal: ${errors.length} pengulangan CREATE EXTENSION atau GRANT schema cron`);
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
  }
  console.log(
    `Migrasi bayangan (statis): ${files.length} berkas, tidak ada CREATE EXTENSION atau GRANT schema cron yang berulang. DB live tidak disentuh.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
