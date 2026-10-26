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

// Mirrors the historical Journey behavior: promote a currently-shown occurrence
// of the Finding, never a newly searched/guessed occurrence. An explicit selection
// is authoritative and therefore fails closed instead of silently changing anchors.
export function firstFindingAnchor(finding, preferredHitId = null) {
  const shown = Array.isArray(finding?.shown) ? finding.shown : [];
  if (preferredHitId) {
    if (!shown.includes(preferredHitId)) return null;
    return parseElsHitKey(preferredHitId);
  }
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

  const windowProfiles = {
    small: { ctxR: 1, windowColumns: 40 },
    medium: { ctxR: 3, windowColumns: 60 },
    large: { ctxR: 8, windowColumns: 80 },
    legacy: { ctxR: 3, windowColumns: 80 },
  };
  const windowSize = windowProfiles[engineState.ui?.windowSize] ? engineState.ui.windowSize : "legacy";
  const windowRequested = windowProfiles[engineState.ui?.windowRequested] ? engineState.ui.windowRequested : "legacy";
  const preset = windowProfiles[windowSize];

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
    geometry: engineState.geometry ? { ...engineState.geometry } : null,
    findings: (Array.isArray(engineState.findings) ? engineState.findings : []).map((f) => ({
      t: f.t,
      color: f.color,
      shown: Array.isArray(f.shown) ? [...f.shown] : [],
    })),
    searchWindow: {
      ctxR: Number.isInteger(engineState.ui?.ctxR) ? engineState.ui.ctxR : preset.ctxR,
      windowColumns: preset.windowColumns,
      windowSize,
      windowRequested,
    },
    view: {
      mode: view.mode || null,
      viewMode: view.viewMode || null,
      matrixRtl: view.matrixRtl ?? null,
      cellSize: Number.isFinite(Number(view.cellSize)) ? Number(view.cellSize) : null,
      showN: Number.isInteger(engineState.ui?.showN) ? engineState.ui.showN : 2,
      findingRadius: Number.isFinite(engineState.ui?.findingRadius) ? engineState.ui.findingRadius : null,
      zoom: Number.isFinite(engineState.ui?.zoom) ? engineState.ui.zoom : 1,
      fit: engineState.ui?.fit !== false,
      heat: engineState.ui?.heat === true,
      niqqud: engineState.ui?.niqqud === true,
      hideMain: engineState.ui?.hideMain === true,
    },
  };
}

// Produces the exact load-item contract the canonical engine needs for
// promote-to-axis. The previous axis is carried forward as a gold Finding,
// matching the historical ce148f07 Journey semantics without copying its UI.
export function buildJourneyPromotion(engineState, finding, options = {}) {
  if (engineState?.status !== "ok") return { ok: false, reason: "no-active-finding" };
  if (!finding?.t) return { ok: false, reason: "missing-finding" };

  const target = firstFindingAnchor(finding, options.hitId);
  if (!target) return { ok: false, reason: "finding-has-no-shown-anchor" };

  const snapshot = makeJourneySnapshot(engineState, options.view || {});
  if (!snapshot) return { ok: false, reason: "invalid-current-axis" };

  const axisColor = options.axisColor || DEFAULT_AXIS_COLOR;
  const maxFindings = Math.max(1, Number(options.maxFindings || 12));
  const previousAxis = engineState.termRaw || engineState.term || "";
  // Promotion changes which occurrence is the primary axis. Always reveal that
  // new axis so the user can verify the result in the matrix. The snapshot still
  // retains the previous axis' visibility and exact return restores it.
  const promotedView = { ...snapshot.view, hideMain: false };
  const carry = [
    previousAxis ? { t: previousAxis, color: axisColor, sh: [engineState.axis.hitId] } : null,
    ...(Array.isArray(engineState.findings) ? engineState.findings : [])
      .filter((f) => f?.t && f.t !== finding.t)
      // Finding hit IDs belong to the current axis geometry. Carrying them into
      // the promoted geometry makes the canonical engine treat stale IDs as an
      // explicit visibility selection and can hide every newly computed hit.
      // Keep the terms/colors, then let the engine project their first verified
      // occurrences around the new axis. The snapshot above still owns the
      // exact old hit IDs used by buildJourneyRestore().
      .map((f) => ({ t: f.t, color: f.color })),
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
      searchWindow: snapshot.searchWindow,
      view: promotedView,
      hideMain: false,
    },
  };
}

// Opens an engine-verified continuation as a temporary Research target. This is
// the same exact load/return seam as C02; unlike Finding promotion, the target
// was verified by the result-triage lens and is not written to a Finding store.
export function buildJourneyResearchTarget(engineState, descriptor, options = {}) {
  if (engineState?.status !== "ok") return { ok: false, reason: "no-active-axis" };
  const term = String(descriptor?.term || "").trim();
  const target = parseElsHitKey(descriptor?.hitId);
  if (!term || !target) return { ok: false, reason: "invalid-research-target" };
  const scope = descriptor?.scope === "tanakh" ? "tanakh" : "torah";
  const currentScope = engineState.scope === "tanakh" ? "tanakh" : "torah";
  if (scope !== currentScope) return { ok: false, reason: "scope-mismatch" };

  const snapshot = makeJourneySnapshot(engineState, options.view || {});
  if (!snapshot) return { ok: false, reason: "invalid-current-axis" };

  const axisColor = options.axisColor || DEFAULT_AXIS_COLOR;
  const maxFindings = Math.max(1, Number(options.maxFindings || 12));
  const previousAxis = engineState.termRaw || engineState.term || "";
  const words = [
    previousAxis && previousAxis !== term ? { t: previousAxis, color: axisColor, sh: [engineState.axis.hitId] } : null,
    ...(Array.isArray(engineState.findings) ? engineState.findings : [])
      .filter((finding) => finding?.t && finding.t !== term)
      .map((finding) => ({ t: finding.t, color: finding.color })),
  ].filter(Boolean).slice(0, maxFindings);

  return {
    ok: true,
    target,
    snapshot,
    loadItem: {
      journey: true,
      researchNonce: `${term}:${target.hitId}`,
      term,
      skip: target.skip,
      start: target.start,
      dir: target.dir,
      hitId: target.hitId,
      words,
      scope,
      searchWindow: snapshot.searchWindow,
      view: { ...snapshot.view, hideMain: false },
      hideMain: false,
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
      searchWindow: snapshot.searchWindow || null,
      view: snapshot.view || null,
      hideMain: snapshot.view?.hideMain === true,
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

// Exact return is complete only after the engine has finished its asynchronous
// Finding verification pass. Matching the axis alone would expose a transient
// state with empty Finding selections as a successful return.
export function journeySnapshotMatches(engineState, snapshot) {
  if (!snapshot || !journeyAnchorMatches(engineState, snapshot.axis)) return false;
  const actualTerm = engineState.termRaw || engineState.term || "";
  if (actualTerm !== snapshot.term || (engineState.scope === "tanakh" ? "tanakh" : "torah") !== snapshot.scope) return false;

  const geometryKeys = ["S", "mainCol", "c0", "cw", "r0", "r1"];
  if (snapshot.geometry && geometryKeys.some((key) => engineState.geometry?.[key] !== snapshot.geometry[key])) return false;

  const actualFindings = Array.isArray(engineState.findings) ? engineState.findings : [];
  if (actualFindings.length !== snapshot.findings.length) return false;
  const sameShown = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
  if (snapshot.findings.some((expected, index) => {
    const actual = actualFindings[index];
    return actual?.t !== expected.t || actual?.color !== expected.color
      || !sameShown(Array.isArray(actual?.shown) ? actual.shown : [], expected.shown);
  })) return false;

  const ui = engineState.ui || {};
  const searchWindow = snapshot.searchWindow || {};
  if (ui.ctxR !== searchWindow.ctxR || ui.windowSize !== searchWindow.windowSize || ui.windowRequested !== searchWindow.windowRequested) return false;
  const view = snapshot.view || {};
  return ui.showN === view.showN
    && ui.findingRadius === view.findingRadius
    && ui.zoom === view.zoom
    && ui.fit === view.fit
    && ui.heat === view.heat
    && ui.niqqud === view.niqqud
    && ui.hideMain === view.hideMain;
}
