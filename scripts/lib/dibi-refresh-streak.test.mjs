import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideStreak } from "./dibi-refresh-streak.mjs";

const empty = {
  consecutiveScheduledFailures: 0,
  lastRejectReason: null,
  lastAcceptedFetchedAt: null,
};

describe("DIBI refresh streak", () => {
  it("counts a scheduled fetch failure and a guard rejection, then alerts at 3", () => {
    const first = decideStreak(empty, {
      eventName: "schedule",
      force: false,
      ok: false,
      reason: "fetch-failed",
      fetchedAt: "2026-09-01T00:00:00.000Z",
    });
    assert.equal(first.streak, 1);
    assert.equal(first.shouldAlert, false);
    assert.equal(first.state.lastRejectReason, "fetch-failed");

    const second = decideStreak(first.state, {
      eventName: "schedule",
      force: false,
      ok: false,
      reason: "empty-kabupaten",
      fetchedAt: "2026-09-01T00:00:00.000Z",
    });
    assert.equal(second.streak, 2);
    assert.equal(second.shouldAlert, false);

    const third = decideStreak(second.state, {
      eventName: "schedule",
      force: false,
      ok: false,
      reason: "kejadian-drop",
      fetchedAt: "2026-09-01T00:00:00.000Z",
    });
    assert.equal(third.streak, 3);
    assert.equal(third.shouldAlert, true);
    assert.equal(third.shouldClose, false);
    assert.equal(third.reason, "kejadian-drop");
    assert.equal(third.fetchedAt, "2026-09-01T00:00:00.000Z");
  });

  it("ignores a manual force run", () => {
    const prior = decideStreak(empty, {
      eventName: "schedule",
      force: false,
      ok: false,
      reason: "year-sum-mismatch",
      fetchedAt: "2026-09-01T00:00:00.000Z",
    });
    const forced = decideStreak(prior.state, {
      eventName: "workflow_dispatch",
      force: true,
      ok: false,
      reason: "fetch-failed",
      fetchedAt: "2026-09-01T00:00:00.000Z",
    });
    assert.equal(forced.streak, 1);
    assert.equal(forced.changed, false);
    assert.equal(forced.shouldAlert, false);
    assert.equal(forced.shouldClose, false);
  });

  it("does not count a manual non-force failure", () => {
    const manual = decideStreak(empty, {
      eventName: "workflow_dispatch",
      force: false,
      ok: false,
      reason: "fetch-failed",
      fetchedAt: "2026-09-01T00:00:00.000Z",
    });
    assert.equal(manual.streak, 0);
    assert.equal(manual.changed, false);
    assert.equal(manual.shouldAlert, false);
  });

  it("resets and asks to close the issue after a passing run", () => {
    const failed = decideStreak(empty, {
      eventName: "schedule",
      force: false,
      ok: false,
      reason: "empty-kabupaten",
      fetchedAt: "2026-09-01T00:00:00.000Z",
    });
    const passed = decideStreak(failed.state, {
      eventName: "schedule",
      force: false,
      ok: true,
      reason: "",
      fetchedAt: "2026-10-01T00:00:00.000Z",
    });
    assert.equal(passed.streak, 0);
    assert.equal(passed.state.lastRejectReason, null);
    assert.equal(passed.shouldClose, true);
    assert.equal(passed.shouldAlert, false);
    assert.equal(passed.changed, true);
  });
});
