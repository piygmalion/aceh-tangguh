import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { rateLimit, rateLimitAsync } from "./rate-limit";

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

test("rateLimit allows up to the cap then denies", () => {
  const now = 1_700_000_000_000;
  assert.equal(rateLimit("t:a", 2, 60_000, now), true);
  assert.equal(rateLimit("t:a", 2, 60_000, now + 10), true);
  assert.equal(rateLimit("t:a", 2, 60_000, now + 20), false);
  assert.equal(rateLimit("t:a", 2, 60_000, now + 60_000), true);
});

test("rateLimitAsync falls back to in-memory in development", async () => {
  setNodeEnv("development");
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const key = `dev-fallback:${Date.now()}`;
  assert.deepEqual(await rateLimitAsync(key, 2, 60_000), { allowed: true });
  assert.deepEqual(await rateLimitAsync(key, 2, 60_000), { allowed: true });
  assert.deepEqual(await rateLimitAsync(key, 2, 60_000), {
    allowed: false,
    reason: "too_many_requests",
  });
});

test("rateLimitAsync falls back to in-memory in production without Upstash", async () => {
  setNodeEnv("production");
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.RATE_LIMIT_REQUIRE_UPSTASH;

  const key = `prod-fallback:${Date.now()}`;
  assert.deepEqual(await rateLimitAsync(key, 2, 60_000), { allowed: true });
  assert.deepEqual(await rateLimitAsync(key, 2, 60_000), { allowed: true });
  assert.deepEqual(await rateLimitAsync(key, 2, 60_000), {
    allowed: false,
    reason: "too_many_requests",
  });
});

test("rateLimitAsync fail-closes in production when Upstash is required", async () => {
  setNodeEnv("production");
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.RATE_LIMIT_REQUIRE_UPSTASH = "1";

  const outcome = await rateLimitAsync("prod-require-upstash", 8, 3_600_000);
  assert.deepEqual(outcome, { allowed: false, reason: "rate_limit_unconfigured" });
});
