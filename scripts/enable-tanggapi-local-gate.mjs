/**
 * Append local Tanggapi gate flags. Never prints secret values.
 */
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(".env.local");
if (!existsSync(path)) {
  console.log(JSON.stringify({ wrote: false, reason: "missing .env.local" }));
  process.exit(1);
}

const raw = readFileSync(path, "utf8");
const has = (name) => new RegExp(`^(?:export\\s+)?${name}\\s*=`, "m").test(raw);
const empty = (name) => {
  const match = raw.match(new RegExp(`^(?:export\\s+)?${name}\\s*=\\s*(.*)$`, "m"));
  if (!match) return true;
  return match[1].replace(/^['"]|['"]$/g, "").trim() === "";
};

const before = {
  enabledPresent: has("PANDUAN_LLM_ENABLED"),
  providerPresent: has("PANDUAN_LLM_PROVIDER"),
  modelPresent: has("PANDUAN_LLM_MODEL"),
  xaiPresent: has("XAI_API_KEY") && !empty("XAI_API_KEY"),
};

const lines = [];
if (!has("PANDUAN_LLM_ENABLED")) lines.push("PANDUAN_LLM_ENABLED=1");
if (!has("PANDUAN_LLM_PROVIDER")) lines.push("PANDUAN_LLM_PROVIDER=grok");
if (!has("PANDUAN_LLM_MODEL")) lines.push("PANDUAN_LLM_MODEL=grok-4.20-0309-non-reasoning");

if (lines.length) {
  const prefix = raw.endsWith("\n") || raw.length === 0 ? "" : "\n";
  appendFileSync(path, `${prefix}# Tanggapi local gate — do not commit\n${lines.join("\n")}\n`);
}

console.log(
  JSON.stringify(
    {
      wrote: lines,
      before,
      after: {
        enabledPresent: true,
        providerPresent: true,
        modelPresent: true,
        xaiPresent: before.xaiPresent,
        processXai: Boolean(process.env.XAI_API_KEY?.trim()),
      },
    },
    null,
    2
  )
);
