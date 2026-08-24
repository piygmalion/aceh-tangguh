import assert from "node:assert/strict";
import { test } from "node:test";
import { rateLimit } from "./rate-limit";

test("rateLimit allows up to the cap then denies", () => {
  const now = 1_700_000_000_000;
  assert.equal(rateLimit("t:a", 2, 60_000, now), true);
  assert.equal(rateLimit("t:a", 2, 60_000, now + 10), true);
  assert.equal(rateLimit("t:a", 2, 60_000, now + 20), false);
  assert.equal(rateLimit("t:a", 2, 60_000, now + 60_000), true);
});
