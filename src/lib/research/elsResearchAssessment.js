// A read-only projection of existing discovery results. No store, scan or AI call.
// score intentionally remains null until a calibrated, comparable matrix policy exists.
export function assessElsResearch({ contextKey, runs = [], rows = [], isVerified = row => row.verified === true } = {}) {
  const current = runs.filter(run => contextKey && run.key === contextKey && run.data?.ok);
  const coverage = current.map(({ data }) => ({
    mode: data.plan?.mode === 'language' ? 'language' : 'words',
    plan: { ...data.plan },
    origin: data.origin ? { ...data.origin } : null,
    window: data.box ? { ...data.box } : null,
    completed: Number.isSafeInteger(data.coverage?.completedRays) ? data.coverage.completedRays : null,
    total: Number.isSafeInteger(data.coverage?.totalRays) ? data.coverage.totalRays : null,
    remaining: Number.isSafeInteger(data.coverage?.remainingRays) ? data.coverage.remainingRays : null,
    complete: data.coverage?.complete === true,
  }));
  const unique = [...new Map(rows.map(row => [row.occurrenceId || row.key, row])).values()];
  const verified = unique.filter(isVerified);
  return {
    version: 1, contextKey: contextKey || null, score: null,
    scoreReason: 'ranking-policy-not-calibrated',
    coverage, scanned: current.length > 0,
    partial: coverage.some(item => !item.complete || item.mode === 'language'),
    counts: { collected: unique.length, verified: verified.length, awaitingVerification: unique.length - verified.length,
      axisIntersections: verified.filter(row => row.kind === 'els' && row.distance === 0).length },
    // A sampled language pass cannot establish exhaustive matrix coverage.
    comparable: false,
  };
}

// An explainable investigation order. No source bonus and no claim of significance.
export function compareElsResearchRows(a, b) {
  const priority = row => row.verified ? (row.kind === 'els' && row.distance === 0 ? 0 : 1) : 2;
  return priority(a) - priority(b) || (a.distance ?? Infinity) - (b.distance ?? Infinity)
    || b.term.length - a.term.length || a.key.localeCompare(b.key);
}
