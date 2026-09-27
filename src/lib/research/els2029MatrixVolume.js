const toInt = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

const gcd2 = (a, b) => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
};

const gcd3 = (a, b, c) => gcd2(gcd2(a, b), c);

export function buildElsMatrixVolumeBasis({
  origin,
  axisWidth,
  planeWidth = null,
  planeHeight,
  corpusLength = null,
} = {}) {
  const o = toInt(origin);
  const S = toInt(axisWidth);
  const W = planeWidth == null ? S : toInt(planeWidth);
  const H = toInt(planeHeight);
  const N = corpusLength == null ? null : toInt(corpusLength);

  if (o == null || o < 0 || S == null || S < 1 || W == null || W < 1 || W > S || H == null || H < 1) {
    return Object.freeze({
      contract: "els_matrix_volume_basis_v1",
      status: "CONTEXT_REQUIRED",
      origin: o,
      axisWidth: S,
      planeWidth: W,
      planeHeight: H,
      basis: null,
      projectionOnly: true,
    });
  }

  return Object.freeze({
    contract: "els_matrix_volume_basis_v1",
    status: "READY",
    origin: o,
    axisWidth: S,
    planeWidth: W,
    planeHeight: H,
    corpusLength: N,
    basis: Object.freeze({
      eX: 1,
      eY: S,
      eZ: S * H,
    }),
    projectionOnly: true,
    semantics: Object.freeze({
      sliceShiftStep: S,
      sliceShiftIsIndependentZ: false,
      trueZIndependentFromRowStep: true,
      rendererOwnsBasis: false,
    }),
  });
}

export function mapElsVolumeCell(basis, { x = 0, y = 0, z = 0 } = {}) {
  if (!basis || basis.contract !== "els_matrix_volume_basis_v1" || basis.status !== "READY") return null;
  const xi = toInt(x);
  const yi = toInt(y);
  const zi = toInt(z);
  if (xi == null || yi == null || zi == null) return null;
  if (xi < 0 || xi >= basis.planeWidth || yi < 0 || yi >= basis.planeHeight) return null;

  const requestedCorpusIndex = basis.origin
    + xi * basis.basis.eX
    + yi * basis.basis.eY
    + zi * basis.basis.eZ;
  const inCorpus = requestedCorpusIndex >= 0
    && (basis.corpusLength == null || requestedCorpusIndex < basis.corpusLength);

  return Object.freeze({
    x: xi,
    y: yi,
    z: zi,
    corpusIndex: inCorpus ? requestedCorpusIndex : null,
    requestedCorpusIndex,
    inCorpus,
    outOfCorpus: !inCorpus,
  });
}

export function normalizeElsDirection3d(direction) {
  if (!Array.isArray(direction) || direction.length !== 3) return null;
  const raw = direction.map(toInt);
  if (raw.some((value) => value == null)) return null;
  const [dx, dy, dz] = raw;
  if (dx === 0 && dy === 0 && dz === 0) return null;

  const divisor = gcd3(dx, dy, dz);
  let primitive = [dx / divisor, dy / divisor, dz / divisor];
  const first = primitive.find((value) => value !== 0);
  const traversalSign = first < 0 ? -1 : 1;
  if (traversalSign < 0) primitive = primitive.map((value) => -value);

  return Object.freeze({
    raw: Object.freeze(raw),
    primitive: Object.freeze(primitive),
    traversalSign,
  });
}

export function evaluateElsAdaptiveBox({
  sameLineExtensionLength = 0,
  exactIntersection = false,
  parallelFamily = false,
  crossSliceContinuation = false,
  rareReplayableCandidate = false,
  repeatedMotif = false,
  independentRelation = false,
  contradictionNeedsControl = false,
  explicitHumanRequest = false,
  onlyShortTokenSignal = false,
} = {}) {
  const extensionLength = Math.max(0, toInt(sameLineExtensionLength) ?? 0);
  const hotReasons = [];
  const warmReasons = [];

  if (explicitHumanRequest) hotReasons.push("EXPLICIT_HUMAN_RESEARCH_REQUEST");
  if (extensionLength >= 5) hotReasons.push("LONG_SAME_LINE_EXTENSION");
  if (independentRelation) hotReasons.push("INDEPENDENT_RELATION");
  if (crossSliceContinuation && (parallelFamily || exactIntersection)) {
    hotReasons.push("CROSS_SLICE_STRUCTURAL_CONTINUATION");
  }
  if (rareReplayableCandidate && (exactIntersection || parallelFamily || repeatedMotif)) {
    hotReasons.push("RARE_STRUCTURED_CANDIDATE");
  }
  if (repeatedMotif && (exactIntersection || parallelFamily)) {
    hotReasons.push("REPEATED_STRUCTURAL_MOTIF");
  }

  if (exactIntersection) warmReasons.push("EXACT_INTERSECTION");
  if (parallelFamily) warmReasons.push("PARALLEL_FAMILY");
  if (crossSliceContinuation) warmReasons.push("CROSS_SLICE_CONTINUATION");
  if (rareReplayableCandidate) warmReasons.push("RARE_REPLAYABLE_CANDIDATE");
  if (repeatedMotif) warmReasons.push("REPEATED_MOTIF");
  if (contradictionNeedsControl) warmReasons.push("CONTROL_CHALLENGE_NEEDED");
  if (extensionLength > 0 && extensionLength < 5) warmReasons.push("SHORT_EXTENSION");

  // Short lexical noise is never sufficient to heat a cold box by itself.
  const effectiveHotReasons = onlyShortTokenSignal && !explicitHumanRequest ? [] : hotReasons;
  const planningState = effectiveHotReasons.length
    ? "HOT"
    : warmReasons.length
      ? "WARM"
      : "COLD";

  const expansionHints = [];
  if (extensionLength > 0) expansionHints.push("ALONG_ACTIVE_VECTOR");
  if (crossSliceContinuation) expansionHints.push("DEPTH_FACE");
  if (exactIntersection || parallelFamily || repeatedMotif) expansionHints.push("LOCAL_XY_RING");
  if (contradictionNeedsControl) expansionHints.push("MATCHED_CONTROLS");
  if (explicitHumanRequest && expansionHints.length === 0) expansionHints.push("HUMAN_REQUESTED_BOUNDED");

  return Object.freeze({
    contract: "els_adaptive_box_interest_v1",
    planningState,
    hotReasons: Object.freeze(effectiveHotReasons),
    warmReasons: Object.freeze(warmReasons),
    expansionHints: Object.freeze([...new Set(expansionHints)]),
    shortTokenScanAllowed: planningState === "HOT",
    truthPromotion: false,
  });
}

export function evaluateElsCandidateEligibility({
  termLength,
  boxInterest,
  preRegistered = false,
  userRequested = false,
  extendsToLength = null,
  structuralRelation = false,
} = {}) {
  const len = toInt(termLength);
  const extended = toInt(extendsToLength);
  if (len == null || len < 3) {
    return Object.freeze({ eligible: false, reason: "TOO_SHORT", truthPromotion: false });
  }

  if (len >= 5) {
    return Object.freeze({ eligible: true, reason: "NORMAL_LENGTH", truthPromotion: false });
  }

  if (preRegistered || userRequested) {
    return Object.freeze({ eligible: true, reason: "TARGETED_SHORT_TERM", truthPromotion: false });
  }

  if (extended != null && extended >= 5) {
    return Object.freeze({ eligible: true, reason: "SHORT_SEED_EXTENDS_LONG", truthPromotion: false });
  }

  if (boxInterest?.planningState === "HOT" && structuralRelation) {
    return Object.freeze({ eligible: true, reason: "HOT_CONTEXT_STRUCTURAL_SHORT_TERM", truthPromotion: false });
  }

  return Object.freeze({
    eligible: false,
    reason: boxInterest?.planningState === "HOT"
      ? "HOT_BUT_NO_STRUCTURAL_SUPPORT"
      : "SHORT_TERM_REQUIRES_HOT_CONTEXT",
    truthPromotion: false,
  });
}

export default buildElsMatrixVolumeBasis;
