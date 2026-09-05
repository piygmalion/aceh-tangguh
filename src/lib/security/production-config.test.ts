import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { assertProductionConfig } from "./production-config";

const savedEnv = { ...process.env };

function setNodeEnv(value: "development" | "production" | "test") {
  // Test-only override; Node allows assigning NODE_ENV at runtime.
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  restoreEnv();
});

test("assertProductionConfig skips static export builds", () => {
  setNodeEnv("production");
  process.env.STATIC_EXPORT = "1";
  delete process.env.UPSTASH_REDIS_REST_URL;
  assert.doesNotThrow(() => assertProductionConfig());
});

test("assertProductionConfig allows production without Supabase or Upstash", () => {
  setNodeEnv("production");
  delete process.env.STATIC_EXPORT;
  delete process.env.GITHUB_PAGES;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  assert.doesNotThrow(() => assertProductionConfig());
});

test("assertProductionConfig throws when Supabase is set without Upstash", () => {
  setNodeEnv("production");
  delete process.env.STATIC_EXPORT;
  delete process.env.GITHUB_PAGES;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.LAPORAN_PII_KEY = "a".repeat(64);
  process.env.LAPORAN_PII_SALT = "prod-salt";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  assert.throws(() => assertProductionConfig(), /UPSTASH_REDIS/);
});

test("assertProductionConfig throws when production secrets are missing", () => {
  setNodeEnv("production");
  delete process.env.STATIC_EXPORT;
  delete process.env.GITHUB_PAGES;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.LAPORAN_PII_KEY;
  delete process.env.LAPORAN_PII_SALT;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  assert.throws(() => assertProductionConfig(), /Missing required env/);
});

test("assertProductionConfig passes with full production env", () => {
  setNodeEnv("production");
  delete process.env.STATIC_EXPORT;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.LAPORAN_PII_KEY = "a".repeat(64);
  process.env.LAPORAN_PII_SALT = "prod-salt";
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";

  assert.doesNotThrow(() => assertProductionConfig());
});
