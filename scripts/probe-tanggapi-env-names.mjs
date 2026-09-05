/**
 * Print which Tanggapi/xAI env names exist. Never prints values.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const INTERESTING = /^(PANDUAN_|XAI_|GROK_|GEMINI_|OPENAI_|UPSTASH_)/i;
const files = [".env.local", ".env.production", ".env"];

function parseNames(raw) {
  const names = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, name, value] = match;
    if (!INTERESTING.test(name)) continue;
    const empty = value.replace(/^['"]|['"]$/g, "").trim() === "";
    names.push({ name, empty });
  }
  return names;
}

const report = {};
for (const file of files) {
  const path = resolve(file);
  if (!existsSync(path)) {
    report[file] = { exists: false };
    continue;
  }
  const buf = readFileSync(path);
  const bom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  const utf16 = buf[0] === 0xff && buf[1] === 0xfe;
  const raw = utf16 ? buf.toString("utf16le") : buf.toString("utf8");
  report[file] = {
    exists: true,
    bom,
    utf16,
    bytes: buf.length,
    keys: parseNames(raw),
  };
}

console.log(JSON.stringify(report, null, 2));
