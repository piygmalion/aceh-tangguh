import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { LaporanConfigError, requireLaporanWriter } from "./writer";

const KEYS = [
  "NODE_ENV",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LAPORAN_PII_KEY",
  "LAPORAN_PII_SALT",
] as const;

const saved: Record<string, string | undefined> = {};

function envBag() {
  return process.env as unknown as Record<string, string | undefined>;
}

function setEnv(key: (typeof KEYS)[number], value: string | undefined) {
  const env = envBag();
  if (value === undefined) delete env[key];
  else env[key] = value;
}

function snapshotEnv() {
  for (const k of KEYS) saved[k] = process.env[k];
}

function restoreEnv() {
  for (const k of KEYS) setEnv(k, saved[k]);
}

snapshotEnv();
afterEach(restoreEnv);

test("requireLaporanWriter fails when Supabase URL is set without service role", () => {
  setEnv("NODE_ENV", "development");
  setEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
  assert.throws(() => requireLaporanWriter(), LaporanConfigError);
});

test("requireLaporanWriter fails closed in production without PII or service role", () => {
  setEnv("NODE_ENV", "production");
  setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
  setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
  assert.throws(() => requireLaporanWriter(), LaporanConfigError);
});
