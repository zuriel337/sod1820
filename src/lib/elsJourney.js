// Ported verbatim from gpt/els-research-journey-v2 (b00fee2e), Pass 2 research_journey_reconciliation.
const DEFAULT_AXIS_COLOR = "#e8c84a";

// Research Journey is host-side serialization/navigation only.
// It never computes ELS, ranks hits, or invents a Finding identity.
// The only anchor we accept is the engine-owned hitKey: skip_dir_start.
export function parseElsHitKey(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parts = value.trim().split("_");
  if (parts.length !== 3) return null;
  const signedSkip = Number(parts[0]);
  const dir = Number(parts[1]);
  const start = Number(parts[2]);
  if (!Number.isFinite(signedSkip) || !Number.isFinite(start) || (dir !== 1 && dir !== -1)) return null;
  return {
    hitId: `${signedSkip}_${dir}_${start}`,
    signedSkip,
    skip: Math.abs(signedSkip),
    dir,
    direction: dir === -1 ? "back" : "fwd",
    start,
  };
}

// Mirrors the historical Journey behavior: promote the first currently-shown
// occurrence of the Finding, never a newly searched/guessed occurrence.
export function firstFindingAnchor(finding) {
  const shown = Array.isArray(finding?.shown) ? finding.shown : [];
  for (const key of shown) {
    const parsed = parseElsHitKey(key);
    if (parsed) return parsed;
  }
  return null;
}

export function makeJourneySnapshot(engineState, view = {}) {
  if (engineState?.status !== "ok" || !engineState.axis?.hitId) return null;
  const axisAnchor = parseElsHitKey(engineState.axis.hitId);
  if (!axisAnchor) return null;

  return {
    term: engineState.termRaw || engineState.term || "",
    normalizedTerm: engineState.term || "",
    scope: engineState.scope === "tanakh" ? "tanakh" : "torah",
    axis: {
      ...axisAnchor,
      length: Number(engineState.axis.length ?? engineState.length ?? 0),
    },
    occurrence: {
      index: Number(engineState.occurrence?.index ?? 0),
      count: Number(engineState.occurrence?.count ?? 0),
      capped: Boolean(engineState.occurrence?.capped),
    },
    findings: (Array.isArray(engineState.findings) ? engineState.findings : []).map((f) => ({
      t: f.t,
      color: f.color,
      shown: Array.isArray(f.shown) ? [...f.shown] : [],
    })),
    view: {
      mode: view.mode || null,
      viewMode: view.viewMode || null,
      matrixRtl: view.matrixRtl ?? null,
      cellSize: Number.isFinite(Number(view.cellSize)) ? Number(view.cellSize) : null,
    },
  };
}

// Produces the exact load-item contract the canonical engine needs for
// promote-to-axis. The previous axis is carried forward as a gold Finding,
// matching the historical ce148f07 Journey semantics without copying its UI.
export function buildJourneyPromotion(engineState, finding, options = {}) {
  if (engineState?.status !== "ok") return { ok: false, reason: "no-active-finding" };
  if (!finding?.t) return { ok: false, reason: "missing-finding" };

  const target = firstFindingAnchor(finding);
  if (!target) return { ok: false, reason: "finding-has-no-shown-anchor" };

  const snapshot = makeJourneySnapshot(engineState, options.view || {});
  if (!snapshot) return { ok: false, reason: "invalid-current-axis" };

  const axisColor = options.axisColor || DEFAULT_AXIS_COLOR;
  const maxFindings = Math.max(1, Number(options.maxFindings || 12));
  const previousAxis = engineState.termRaw || engineState.term || "";
  const carry = [
    previousAxis ? { t: previousAxis, color: axisColor, sh: [engineState.axis.hitId] } : null,
    ...(Array.isArray(engineState.findings) ? engineState.findings : [])
      .filter((f) => f?.t && f.t !== finding.t)
      .map((f) => ({ t: f.t, color: f.color, sh: Array.isArray(f.shown) ? [...f.shown] : [] })),
  ].filter(Boolean).slice(0, maxFindings);

  return {
    ok: true,
    target,
    snapshot,
    loadItem: {
      journey: true,
      term: finding.t,
      skip: target.skip,
      start: target.start,
      dir: target.dir,
      hitId: target.hitId,
      words: carry,
      scope: options.scope || snapshot.scope,
    },
  };
}

// Breadcrumb restore is an exact engine load too. We reconstruct only from the
// previously captured engine-owned snapshot; no search result or Finding is invented here.
export function buildJourneyRestore(snapshot) {
  if (!snapshot?.term || !snapshot?.axis?.hitId) return { ok: false, reason: "invalid-snapshot" };
  const target = parseElsHitKey(snapshot.axis.hitId);
  if (!target) return { ok: false, reason: "invalid-snapshot-anchor" };
  const words = (Array.isArray(snapshot.findings) ? snapshot.findings : [])
    .filter((f) => f?.t)
    .map((f) => ({ t: f.t, color: f.color, sh: Array.isArray(f.shown) ? [...f.shown] : [] }));
  return {
    ok: true,
    target,
    loadItem: {
      journey: true,
      term: snapshot.term,
      skip: target.skip,
      start: target.start,
      dir: target.dir,
      hitId: target.hitId,
      words,
      scope: snapshot.scope === "tanakh" ? "tanakh" : "torah",
    },
  };
}

// Human-visible success must be based on the engine returning the exact same
// engine-owned hitId. Same term/skip alone is not enough because another start
// position at the same skip would be a different occurrence.
export function journeyAnchorMatches(engineState, target) {
  if (!target?.hitId || engineState?.status !== "ok") return false;
  return engineState.axis?.hitId === target.hitId;
}
