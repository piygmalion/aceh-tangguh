/**
 * Consecutive scheduled DIBI refresh failures.
 * Manual force runs do not move the counter. A passing non-force run resets it.
 */

export function decideStreak(state, input) {
  const current = Number(state?.consecutiveScheduledFailures) || 0;
  const next = {
    consecutiveScheduledFailures: current,
    lastRejectReason: state?.lastRejectReason ?? null,
    lastAcceptedFetchedAt: state?.lastAcceptedFetchedAt ?? null,
  };
  const force = input.force === true;
  const scheduled = input.eventName === "schedule";
  const ok = input.ok === true;

  if (force) {
    return {
      state: next,
      changed: false,
      shouldAlert: false,
      shouldClose: false,
      streak: current,
      reason: input.reason || next.lastRejectReason,
      fetchedAt: input.fetchedAt || next.lastAcceptedFetchedAt,
    };
  }

  if (!ok && scheduled) {
    next.consecutiveScheduledFailures = current + 1;
    next.lastRejectReason = input.reason || "fetch-failed";
    if (input.fetchedAt) next.lastAcceptedFetchedAt = input.fetchedAt;
    return {
      state: next,
      changed: true,
      shouldAlert: next.consecutiveScheduledFailures >= 3,
      shouldClose: false,
      streak: next.consecutiveScheduledFailures,
      reason: next.lastRejectReason,
      fetchedAt: next.lastAcceptedFetchedAt,
    };
  }

  if (ok) {
    const dirty = current !== 0 || next.lastRejectReason != null;
    next.consecutiveScheduledFailures = 0;
    next.lastRejectReason = null;
    return {
      state: next,
      changed: dirty,
      shouldAlert: false,
      shouldClose: true,
      streak: 0,
      reason: null,
      fetchedAt: input.fetchedAt || next.lastAcceptedFetchedAt,
    };
  }

  return {
    state: next,
    changed: false,
    shouldAlert: false,
    shouldClose: false,
    streak: current,
    reason: input.reason || next.lastRejectReason,
    fetchedAt: input.fetchedAt || next.lastAcceptedFetchedAt,
  };
}
