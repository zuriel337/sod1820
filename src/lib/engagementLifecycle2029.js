// Engagement v1 exposes its state and idempotent flush for tests. Sealing the
// state first, then invoking flush, reuses its listener cleanup without sending
// a final event when the analytics owner is switched OFF.
export function cancelPageEngagementTracker2029(tracker) {
  if (!tracker) return;
  try { tracker._state?.flush?.(); } catch { /* observability never blocks runtime */ }
  try { tracker.flush?.("analytics_disabled"); } catch { /* observability never blocks runtime */ }
}
