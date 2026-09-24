// BEIT_MIDRASH_2029_GOLDEN_V1 — pure presentation helpers over existing canonical readers.
// This module computes zero gematria and owns zero state; it only shapes already-fetched
// System Events (getSystemEvents) and Method Registry rows (fetchGematriaMethodStates /
// fetchNumberMethodProfile) into the compact projections the Golden Beit Midrash page renders.
// No second event feed, no second method registry, no invented soul/sub/derivation text.

export function buildBeitMidrashSystemNow(systemEvents) {
  const events = systemEvents && typeof systemEvents === "object" ? systemEvents : {};
  const convergence = Array.isArray(events.convergence) ? events.convergence : [];
  const growth = Array.isArray(events.growth) ? events.growth : [];
  const communication = Array.isArray(events.communication) ? events.communication : [];
  const activity = events.activity && typeof events.activity === "object" ? events.activity : null;
  const counts = events.counts && typeof events.counts === "object" ? events.counts : {};

  return {
    topConvergence: convergence.slice(0, 3),
    topGrowth: growth.slice(0, 4),
    topCommunication: communication.slice(0, 2),
    channelCount: communication.length,
    activity,
    counts: {
      convergence: Number.isFinite(counts.convergence) ? counts.convergence : convergence.length,
      growth: Number.isFinite(counts.growth) ? counts.growth : growth.length,
      channels: Number.isFinite(counts.channels) ? counts.channels : communication.length,
    },
  };
}

export function selectMethodMenu(methodStates) {
  const rows = Array.isArray(methodStates) ? methodStates : [];
  return rows
    .filter((r) => r && r.active === true)
    .slice()
    .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)
      || String(a.method_key).localeCompare(String(b.method_key), "he"))
    .map((r) => ({
      methodKey: r.method_key,
      displayLabel: r.display_label || r.method_key,
      category: r.category || null,
      executionKind: r.execution_kind || null,
      scannable: r.scannable !== false,
    }));
}

export function countRegisteredInactive(methodStates) {
  const rows = Array.isArray(methodStates) ? methodStates : [];
  return rows.filter((r) => r && r.registered === true && r.active !== true).length;
}

// Honest single-method detail: never fabricates soul/sub/derivation when the live rows lack it.
export function resolveSelectedMethod(methodStates, profileRows, methodKey) {
  const rows = Array.isArray(methodStates) ? methodStates : [];
  const profile = Array.isArray(profileRows) ? profileRows : [];
  if (!methodKey) return null;
  const row = rows.find((r) => r && r.method_key === methodKey) || null;
  if (!row) return null;
  const profileRow = profile.find((p) => p && p.methodKey === methodKey) || null;
  const hasComputed = !!profileRow && Number.isFinite(profileRow.computedValue);
  return {
    methodKey: row.method_key,
    displayLabel: row.display_label || row.method_key,
    category: row.category || null,
    executionKind: row.execution_kind || null,
    scannable: row.scannable !== false,
    notScannableReason: row.not_scannable_reason || null,
    contextActivated: row.execution_kind === "context_activated",
    derivedFrom: Array.isArray(row.derived_from) ? row.derived_from : [],
    operator: row.operator || profileRow?.operator || null,
    soul: profileRow?.soul ?? null,
    sub: profileRow?.sub ?? null,
    hasComputed,
    computedValue: hasComputed ? profileRow.computedValue : null,
  };
}
