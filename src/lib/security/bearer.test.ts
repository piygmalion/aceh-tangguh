import assert from "node:assert/strict";
import { test } from "node:test";
import { bearerMatches } from "./bearer";

test("bearerMatches is true only for the exact secret", () => {
  assert.equal(bearerMatches("Bearer secret-token", "secret-token"), true);
  assert.equal(bearerMatches("Bearer secret-token", "other"), false);
  assert.equal(bearerMatches("secret-token", "secret-token"), false);
  assert.equal(bearerMatches(null, "secret-token"), false);
  assert.equal(bearerMatches("Bearer secret-token", ""), false);
});
