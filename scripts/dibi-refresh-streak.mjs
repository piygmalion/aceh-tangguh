/**
 * Update .github/dibi-refresh-state.json and print GitHub Actions outputs.
 * Usage (CI): node scripts/dibi-refresh-streak.mjs
 */
import { appendFileSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { decideStreak } from "./lib/dibi-refresh-streak.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = process.env.DIBI_STATE_PATH || path.join(root, ".github/dibi-refresh-state.json");
const verdictPath =
  process.env.DIBI_VERDICT_PATH || path.join(root, ".github/dibi-refresh-verdict.json");
const fixturePath =
  process.env.DIBI_FIXTURE_PATH || path.join(root, "public/fixtures/dibi-aceh.json");

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const verdict = readJson(verdictPath);
const fixture = readJson(fixturePath);
const reasonFromEnv = process.env.DIBI_REASON || "";
const reason = reasonFromEnv || (verdict && verdict.ok === false ? verdict.reason : "") || "";
const fetchedAt =
  process.env.DIBI_FETCHED_AT ||
  (fixture && fixture.metadata && fixture.metadata.fetched_at) ||
  "";
const ok = process.env.DIBI_OK === "true";
const decision = decideStreak(readJson(statePath) || {}, {
  eventName: process.env.DIBI_EVENT_NAME || "",
  force: process.env.DIBI_FORCE === "true",
  ok,
  reason: ok ? "" : reason || "fetch-failed",
  fetchedAt,
});

if (decision.changed) {
  writeFileSync(statePath, `${JSON.stringify(decision.state, null, 2)}\n`);
}

const lines = {
  streak: String(decision.streak),
  reason: decision.reason || "",
  fetched_at: decision.fetchedAt || "",
  should_alert: decision.shouldAlert ? "true" : "false",
  should_close: decision.shouldClose ? "true" : "false",
  changed: decision.changed ? "true" : "false",
};

if (process.env.GITHUB_OUTPUT) {
  const body = Object.entries(lines)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  appendFileSync(process.env.GITHUB_OUTPUT, `${body}\n`);
}

console.log(JSON.stringify(lines));
