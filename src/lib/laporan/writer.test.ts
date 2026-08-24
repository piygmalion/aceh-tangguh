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

function snapshotEnv() {
  for (const k of KEYS) saved[k] = process.env[k];
}

function restoreEnv() {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}

snapshotEnv();
afterEach(restoreEnv);

test("requireLaporanWriter fails when Supabase URL is set without service role", () => {
  process.env.NODE_ENV = "development";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.throws(() => requireLaporanWriter(), LaporanConfigError);
});

test("requireLaporanWriter fails closed in production without PII or service role", () => {
  process.env.NODE_ENV = "production";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.throws(() => requireLaporanWriter(), LaporanConfigError);
});
