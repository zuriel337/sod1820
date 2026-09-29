import { evaluateElsAdaptiveBox, evaluateElsCandidateEligibility } from "./els2029MatrixVolume.js";
import { extractElsVectorGeometry } from "./els2029VectorGeometry.js";

/**
 * Bounded adaptive ELS scanner / orchestrator (planning only).
 *
 * Owns NO ELS arithmetic or occurrence generation. Every occurrence comes from an injected canonical
 * adapter (public els_search_page_v1 / els_verify_occurrence_v1 via the server-gated bridge). This
 * module only decides which bounded page calls to make next, using the existing matrix-volume and
 * vector-geometry planning primitives. Outcomes are preserved (negative / truncated / partial /
 * failed) and nothing here is Truth promotion.
 */

export const ELS_SCANNER_CONTRACT = "els_adaptive_scanner_v1";
export const ELS_SCANNER_SKIP_CEILING = 500; // mirrors els-search-bridge PAGE_SKIP_MAX_CEILING
export const ELS_SCANNER_STAGES = Object.freeze(["SEED", "EXPAND", "VERIFY"]);

export const ELS_SCANNER_STOP = Object.freeze({
  COMPLETE: "COMPLETE",
  BUDGET_MAX_TRIALS: "BUDGET_MAX_TRIALS",
  BUDGET_MAX_CANDIDATES: "BUDGET_MAX_CANDIDATES",
  BUDGET_MAX_DEPTH: "BUDGET_MAX_DEPTH",
  BUDGET_WALL_TIME: "BUDGET_WALL_TIME",
  CONTEXT_REQUIRED: "CONTEXT_REQUIRED",
  MISSING_ADAPTER: "MISSING_ADAPTER",
});

const toInt = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};
const posInt = (v) => {
  const n = toInt(v);
  return n != null && n >= 1 ? n : null;
};

export function normalizeElsScannerBudget(budget = {}) {
  const b = budget || {};
  const skipMin = Math.max(2, toInt(b.skipMin) ?? 2);
  const skipMax = toInt(b.skipMax);
  const maxTrials = posInt(b.maxTrials);
  const maxCandidates = posInt(b.maxCandidates);
  const maxDepth = toInt(b.maxDepth);
  const maxWallMs = posInt(b.maxWallMs);
  const pageSize = Math.max(1, Math.min(posInt(b.pageSize) ?? 100, 500));
  const maxPagesPerCandidate = posInt(b.maxPagesPerCandidate) ?? 1;
  const missing = [];
  if (skipMax == null || skipMax < skipMin || skipMax > ELS_SCANNER_SKIP_CEILING) missing.push("skipMax");
  if (maxTrials == null) missing.push("maxTrials");
  if (maxCandidates == null) missing.push("maxCandidates");
  if (maxDepth == null || maxDepth < 0) missing.push("maxDepth");
  if (maxWallMs == null) missing.push("maxWallMs");
  return Object.freeze({
    ok: missing.length === 0,
    missing: Object.freeze(missing),
    skipMin, skipMax, maxTrials, maxCandidates, maxDepth, maxWallMs, pageSize, maxPagesPerCandidate,
  });
}

function cursorOf(result) {
  const after = result?.completion?.continuation?.after;
  if (!after) return null;
  const c = { skip: toInt(after.skip), start: toInt(after.start), dir: toInt(after.dir) };
  return c.skip == null || c.start == null || c.dir == null ? null : c;
}

/** Derive planning signals from canonical hits only (structure comes from the geometry primitive). */
function planFromHits(hits, axisWidth, termLength) {
  const geometry = axisWidth
    ? extractElsVectorGeometry({
      axisWidth,
      occurrences: hits.map((h) => ({ occurrenceId: h.occurrence_id, term: "", dir: h.dir, positions: h.positions })),
    })
    : null;
  const box = evaluateElsAdaptiveBox({
    exactIntersection: (geometry?.intersections?.length ?? 0) > 0,
    parallelFamily: (geometry?.clusters?.length ?? 0) > 0,
    onlyShortTokenSignal: termLength < 5 && !(geometry?.clusters?.length || geometry?.intersections?.length),
  });
  return { geometry, box };
}

/**
 * @param {object} args
 * @param {Array<{term:string, preRegistered?:boolean, userRequested?:boolean, depth?:number, parent?:string}>} args.candidates
 * @param {(req:object)=>Promise<object>} args.invokePage canonical page adapter (returns els_search_page_v1 result)
 * @param {(req:object)=>Promise<object>} [args.invokeVerify] canonical verify adapter
 * @param {(ctx:object)=>Array} [args.expand] injected planner: returns next candidates from a page outcome
 * @param {object} args.budget see normalizeElsScannerBudget
 * @param {number|null} [args.axisWidth] planning geometry width (projection only)
 * @param {()=>number} [args.now] injected clock (deterministic in tests)
 */
export async function runElsAdaptiveScan({
  candidates = [],
  invokePage,
  invokeVerify = null,
  expand = null,
  budget = {},
  scope = "torah",
  stage = "SEED",
  axisWidth = null,
  selectionProtocol = "HYPOTHESIS_DRIVEN_FOLLOWUP",
  verifyTop = 0,
  now = () => Date.now(),
} = {}) {
  const b = normalizeElsScannerBudget(budget);
  const base = { contract: ELS_SCANNER_CONTRACT, truthPromotion: false, occurrenceAuthority: "canonical_engine_only", scope, stage };
  if (!ELS_SCANNER_STAGES.includes(stage) || !b.ok) {
    return Object.freeze({ ...base, stop: ELS_SCANNER_STOP.CONTEXT_REQUIRED, complete: false, budget: b, outcomes: [], trials: 0 });
  }
  if (typeof invokePage !== "function") {
    return Object.freeze({ ...base, stop: ELS_SCANNER_STOP.MISSING_ADAPTER, complete: false, budget: b, outcomes: [], trials: 0 });
  }

  const started = now();
  const queue = candidates.map((c) => ({ ...c, depth: toInt(c.depth) ?? 0 }));
  const seen = new Set();
  const outcomes = [];
  let trials = 0;
  let stop = ELS_SCANNER_STOP.COMPLETE;
  let admitted = 0;

  const overWall = () => now() - started >= b.maxWallMs;

  outer:
  while (queue.length) {
    const cand = queue.shift();
    const term = String(cand.term ?? "").trim();
    const key = `${scope}|${term}`;
    if (!term || seen.has(key)) continue;
    if (cand.depth > b.maxDepth) { stop = ELS_SCANNER_STOP.BUDGET_MAX_DEPTH; outcomes.push(skipped(term, cand, "MAX_DEPTH")); continue; }
    const eligibility = evaluateElsCandidateEligibility({
      termLength: [...term].length, preRegistered: cand.preRegistered, userRequested: cand.userRequested,
      boxInterest: cand.boxInterest, structuralRelation: cand.structuralRelation === true,
    });
    if (!eligibility.eligible) { outcomes.push(skipped(term, cand, eligibility.reason)); continue; }
    if (admitted >= b.maxCandidates) { stop = ELS_SCANNER_STOP.BUDGET_MAX_CANDIDATES; break; }
    seen.add(key);
    admitted += 1;

    const pages = [];
    let cursor = null;
    let hits = [];
    let truncated = false;
    let state = "OK";
    for (let p = 0; p < b.maxPagesPerCandidate; p += 1) {
      if (trials >= b.maxTrials) { stop = ELS_SCANNER_STOP.BUDGET_MAX_TRIALS; truncated = true; state = "BUDGET_STOPPED"; break; }
      if (overWall()) { stop = ELS_SCANNER_STOP.BUDGET_WALL_TIME; truncated = true; state = "BUDGET_STOPPED"; break; }
      const request = Object.freeze({
        op: "page", term, scope, stage,
        skip_min: b.skipMin, skip_max: b.skipMax, page_size: b.pageSize,
        after_skip: cursor?.skip ?? null, after_start: cursor?.start ?? null, after_dir: cursor?.dir ?? null,
        selection_protocol: selectionProtocol,
      });
      trials += 1;
      let result;
      try {
        result = await invokePage(request);
      } catch (error) {
        state = "FAILED";
        pages.push({ request, error: String(error?.message || error) });
        break;
      }
      pages.push({ request, status: result?.status ?? null, completion: result?.completion ?? null });
      if (result?.status !== "OK" && result?.status !== "EXECUTED_EMPTY") { state = result?.status ?? "FAILED"; break; }
      hits = hits.concat(Array.isArray(result.hits) ? result.hits : []);
      cursor = cursorOf(result);
      if (!cursor) break;
      if (p === b.maxPagesPerCandidate - 1) truncated = true; // more pages exist beyond the page budget
    }
    if (cursor && !truncated && state === "OK") truncated = true;

    const { geometry, box } = planFromHits(hits, axisWidth, [...term].length);
    const outcome = Object.freeze({
      term, depth: cand.depth, parent: cand.parent ?? null, state,
      eligibility: eligibility.reason,
      negative: state === "OK" && hits.length === 0 && !truncated,
      truncated, partial: truncated || state === "BUDGET_STOPPED",
      hit_count: hits.length, hits: Object.freeze(hits),
      pages: Object.freeze(pages), box, geometryStatus: geometry?.status ?? null,
      provenance: { source: "els_search_page_v1", occurrenceAuthority: "canonical_engine_only" },
      truthPromotion: false,
    });
    outcomes.push(outcome);
    if (stop === ELS_SCANNER_STOP.BUDGET_MAX_TRIALS || stop === ELS_SCANNER_STOP.BUDGET_WALL_TIME) break outer;

    if (typeof expand === "function" && cand.depth < b.maxDepth) {
      for (const next of expand({ candidate: cand, outcome, box, geometry }) || []) {
        queue.push({ ...next, depth: cand.depth + 1, parent: term, boxInterest: box });
      }
    }
  }
  if (stop === ELS_SCANNER_STOP.COMPLETE && queue.some((c) => !seen.has(`${scope}|${String(c.term ?? "").trim()}`) && String(c.term ?? "").trim())) {
    stop = ELS_SCANNER_STOP.BUDGET_MAX_CANDIDATES;
  }

  const verifications = [];
  if (invokeVerify && verifyTop > 0 && stop !== ELS_SCANNER_STOP.BUDGET_WALL_TIME) {
    for (const o of outcomes) {
      for (const h of (o.hits || []).slice(0, verifyTop)) {
        if (trials >= b.maxTrials) { stop = ELS_SCANNER_STOP.BUDGET_MAX_TRIALS; break; }
        trials += 1;
        const request = Object.freeze({ op: "verify", term: o.term, scope, skip: h.skip, dir: h.dir, start: h.start, stage: "VERIFY" });
        try {
          const r = await invokeVerify(request);
          verifications.push({ term: o.term, occurrence_id: h.occurrence_id, verification_state: r?.verification_state ?? r?.result?.verification_state ?? null });
        } catch (error) {
          verifications.push({ term: o.term, occurrence_id: h.occurrence_id, verification_state: "FAILED", error: String(error?.message || error) });
        }
      }
    }
  }

  return Object.freeze({
    ...base, stop, complete: stop === ELS_SCANNER_STOP.COMPLETE, budget: b, trials,
    elapsedMs: now() - started, outcomes: Object.freeze(outcomes), verifications: Object.freeze(verifications),
  });
}

function skipped(term, cand, reason) {
  return Object.freeze({ term, depth: cand.depth ?? 0, state: "SKIPPED", skipReason: reason, hit_count: 0, hits: Object.freeze([]), truthPromotion: false });
}

export default runElsAdaptiveScan;
