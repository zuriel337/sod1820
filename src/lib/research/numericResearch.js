import { createSequenceRegistry, runSequenceLens } from './sequenceLens.js';
import { piSequenceAdapter } from './piSequence.js';
import { fibonacciSequenceAdapter } from './fibonacciSequence.js';
import { makeUniversalFinding } from './universalFinding.js';

// Numeric Research Router — reconciled onto current main (NUMERIC_ROUTER_PR206_CURRENT_MAIN_RECONCILIATION).
// Ported from PR #206 (gpt/numeric-router-integration-v1-clean, d3142dd8), base 998240255e.
//
// ── RECONCILIATION vs PR #206 (truth_axes_foundation_law drift, both fixed below) ──────────
// 1. sequenceUniversalFinding() no longer passes stage:"candidate" into makeUniversalFinding().
//    INVARIANT PR1 (see universalFinding.js M1 Final Acceptance Patch) is explicit: a projection
//    adapter does not own the epistemic type of what it transports — every sibling adapter
//    (canonicalGematria.js, elsStateToUniversalFindings, numberAnchorToUniversalFinding,
//    researchObjectToUniversalFinding) leaves `stage` unset for exactly this reason. PR206
//    predates that invariant and asserted it directly; that assertion is dropped here, not
//    replaced — the epistemic type of a sequence-position result stays a Human-Gate decision.
// 2. sequenceUniversalFinding() now explicitly declares `verification_state:"not_tested"`
//    (HG-3: a deterministic computation is not a claim-vs-engine test, so nothing was "matched",
//    but the engine output itself is fully known and is recorded), matching the same explicit
//    "not_tested" pattern already used by the gematria and ELS adapters. PR206 left this field
//    entirely absent instead of declaring what it already knew.
// Everything else (lens dispatch, budgets, derived-root/relation-candidate shape, truth
// boundaries) is unchanged from PR206 — those were not found to conflict with anything live.

export const DEFAULT_NUMERIC_RESEARCH_BUDGET = Object.freeze({
  depth: 2,
  maxLenses: 8,
  sequence: Object.freeze({ maxSearchDepth: 25000, maxOccurrences: 25, windowRadius: 12 }),
});

export const DEFAULT_PRIORITY_WEIGHTS = Object.freeze({
  convergence: 1,
  engineVerified: 1,
  sourceDiversity: 1,
  relationEvidence: 1,
  openQuestions: 1,
  hotContext: 1,
});

export const NUMERIC_LENS_STATUS = Object.freeze({ READY: 'READY', ADAPTER_NEEDED: 'ADAPTER_NEEDED' });
export const DEFAULT_SEQUENCE_ADAPTERS = Object.freeze([piSequenceAdapter, fibonacciSequenceAdapter]);

// ── W2.2b · PER-LENS ACCESS + SEMANTIC CLASS ──────────────────────────────────────────────
// READY alone was an insufficient and, in one case, FALSE claim (GPT preflight de9969d1 item 4).
// Two facts were missing from every entry and are now stated explicitly, verified live 11.9.2026:
//
//   access_class   — is the underlying source actually readable by the caller? fn_number_lookup is
//                    a plain STABLE function with anon/authenticated execute. fn_hot_context is
//                    SECURITY DEFINER with anon_exec=false AND auth_exec=false, so an ordinary
//                    client call CANNOT execute it; research_objects has no anon/authenticated
//                    table grant at all. Calling those "READY" told the composer they were safe to
//                    dispatch when they in fact fail-close.
//   semantic_class — does the lens return EVIDENCE, or context/projection/ranking? fn_number_dossier
//                    mixes several truth families and duplicates, fn_number_journey is a derivation
//                    map with seed/readiness state, number_neighbors and fn_hot_context are
//                    explicitly candidate/hot signals and hot is NOT truth. Only number_lookup
//                    returns atomic, governed, source-native evidence rows — so it is the only
//                    numeric lens permitted to emit positive Findings. The rest stay in the
//                    capability trace as context, which is where they were already going.
export const NUMERIC_LENS_ACCESS_CLASS = Object.freeze({
  PUBLIC_SOURCE: 'public_source',
  SOURCE_ACCESS_CONTROLLED: 'source_access_controlled',
  SERVER_ONLY: 'server_only',
  LOCAL_COMPUTATION: 'local_computation',
});

export const NUMERIC_LENS_SEMANTIC_CLASS = Object.freeze({
  EVIDENCE: 'evidence',
  DERIVATION: 'derivation',
  CONTEXT: 'context',
  PROJECTION: 'projection',
  RANKING: 'ranking',
});

const LC = NUMERIC_LENS_ACCESS_CLASS;
const SC = NUMERIC_LENS_SEMANTIC_CLASS;

export const numericLensMap = Object.freeze({
  number_lookup: { status: NUMERIC_LENS_STATUS.READY, rpc: 'fn_number_lookup', access_class: LC.PUBLIC_SOURCE, client_executable: true, semantic_class: SC.EVIDENCE, emits_findings: true },
  number_dossier: { status: NUMERIC_LENS_STATUS.READY, rpc: 'fn_number_dossier', access_class: LC.PUBLIC_SOURCE, client_executable: true, semantic_class: SC.CONTEXT, emits_findings: false, reason: 'composite of several truth families with duplicate card entries — context, not one atomic evidence fact' },
  number_journey: { status: NUMERIC_LENS_STATUS.READY, rpc: 'fn_number_journey', access_class: LC.PUBLIC_SOURCE, client_executable: true, semantic_class: SC.PROJECTION, emits_findings: false, reason: 'derivation/projection map carrying seed draft/readiness state, not positive evidence' },
  neighbors: { status: NUMERIC_LENS_STATUS.READY, rpc: 'number_neighbors', access_class: LC.PUBLIC_SOURCE, client_executable: true, semantic_class: SC.RANKING, emits_findings: false, reason: 'proximity/weight signal — ranking, not truth' },
  // anon_exec=false AND auth_exec=false live: only a service-role/server caller can execute this.
  hot_context: { status: NUMERIC_LENS_STATUS.READY, rpc: 'fn_hot_context', access_class: LC.SERVER_ONLY, client_executable: false, semantic_class: SC.RANKING, emits_findings: false, reason: 'SECURITY DEFINER with no anon/authenticated execute; returns hot candidate context and HOT is explicitly not TRUE' },
  research_objects: { status: NUMERIC_LENS_STATUS.READY, source: 'research_objects', access_class: LC.SOURCE_ACCESS_CONTROLLED, client_executable: false, semantic_class: SC.EVIDENCE, emits_findings: true, reason: 'no anon/authenticated table grant; requires an injected access-filtered reader and composition-boundary filtering' },
  relation_candidates: { status: NUMERIC_LENS_STATUS.ADAPTER_NEEDED, reason: 'fn_relation_candidate requires two semantic endpoints, not a number-only input' },
  cross_resonance: { status: NUMERIC_LENS_STATUS.ADAPTER_NEEDED, reason: 'number_cross_resonance requires p_self + p_pairs contract' },
  source_post_context: { status: NUMERIC_LENS_STATUS.ADAPTER_NEEDED, reason: 'no single canonical number-only source/post RPC' },
  els: { status: NUMERIC_LENS_STATUS.ADAPTER_NEEDED, reason: 'ELS native adapter exists for Universal Findings, but no safe number-only dispatch contract' },
  // A LOGICAL ALIAS, not a lens of its own: it dispatches number_lookup + number_dossier and owns no
  // RPC, no row and no per-lens result. It must never be reported as if it executed something itself.
  gematria_reverse: { status: NUMERIC_LENS_STATUS.READY, alias_of: ['number_lookup', 'number_dossier'], is_logical_alias: true, via: 'fn_number_lookup/fn_number_dossier; do not recalculate in router', access_class: LC.PUBLIC_SOURCE, client_executable: true, semantic_class: SC.EVIDENCE, emits_findings: false, reason: 'alias — findings and context come from the two lenses it dispatches' },
  'sequence:pi': { status: NUMERIC_LENS_STATUS.READY, sequence_id: 'pi', access_class: LC.LOCAL_COMPUTATION, client_executable: true, semantic_class: SC.EVIDENCE, emits_findings: true },
  'sequence:fibonacci': { status: NUMERIC_LENS_STATUS.READY, sequence_id: 'fibonacci', access_class: LC.LOCAL_COMPUTATION, client_executable: true, semantic_class: SC.EVIDENCE, emits_findings: true },
});

function normalizeBudget(input = {}) {
  return {
    depth: Math.min(2, Number.isInteger(input.depth) && input.depth > 0 ? input.depth : DEFAULT_NUMERIC_RESEARCH_BUDGET.depth),
    maxLenses: Math.min(12, Number.isInteger(input.maxLenses) && input.maxLenses > 0 ? input.maxLenses : DEFAULT_NUMERIC_RESEARCH_BUDGET.maxLenses),
    sequence: { ...DEFAULT_NUMERIC_RESEARCH_BUDGET.sequence, ...(input.sequence || {}) },
  };
}

async function rpcCall(rpc, name, args) {
  if (typeof rpc !== 'function') return { status: 'adapter_needed', error: 'RPC_EXECUTOR_NOT_PROVIDED', rpc: name };
  try {
    const out = await rpc(name, args);
    if (out?.error) return { status: 'error', error: out.error.message || String(out.error), rpc: name };
    return { status: 'ok', data: out?.data ?? out, rpc: name };
  } catch (error) {
    return { status: 'error', error: error?.message || String(error), rpc: name };
  }
}

function sequenceUniversalFinding(number, sequenceFinding) {
  if (!sequenceFinding || sequenceFinding.status !== 'ok') return null;
  return makeUniversalFinding({
    kind: 'sequence',
    // stage deliberately NOT set here — see reconciliation note at the top of this file
    // (INVARIANT PR1: a projection adapter does not own epistemic type).
    subject: { type: 'number', key: String(number), label: String(number), value: number },
    source: { engine: 'sequence', adapter: 'sequence-lens-v1', sourceRef: `${sequenceFinding.sequence_id}:${sequenceFinding.sequence_version || 'adapter'}`, method: sequenceFinding.operation || null, corpus: null },
    identity: { sourceIdentity: `${sequenceFinding.sequence_id}:${sequenceFinding.operation || 'operation'}:${sequenceFinding.query ?? number}:${sequenceFinding.result?.first_position ?? 'not-found'}@${sequenceFinding.search_depth ?? 'bounded'}` },
    // HG-3, same pattern as canonicalGematria.js/elsStateToUniversalFindings: no claim was
    // submitted for this deterministic computation, so nothing was "matched" — the honest
    // state is "not_tested", declared explicitly because the adapter genuinely knows it, while
    // the engine's own output is fully recorded below.
    verification: {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: null,
      engine_method_tested: sequenceFinding.sequence_id,
      engine_result: sequenceFinding.result,
      verification_state: 'not_tested',
    },
    evidence: { facts: [{ type: 'sequence-search', sequence_id: sequenceFinding.sequence_id, query: sequenceFinding.query ?? String(number), operation: sequenceFinding.operation || null, position_convention: sequenceFinding.position_convention || null, search_depth: sequenceFinding.search_depth ?? null, result: sequenceFinding.result, verification: sequenceFinding.verification || null }] },
    provenance: { createdBy: 'ENGINE:sequence', createdAt: sequenceFinding.provenance?.generated_at || new Date().toISOString(), inputRef: sequenceFinding.provenance?.input_ref || null },
    projection: { dimensions: { sequence_id: sequenceFinding.sequence_id, representation_kind: sequenceFinding.representation_kind || null } },
  });
}

function relationCandidate(number, sequenceFinding, positionContext, universalFinding) {
  const pos = sequenceFinding?.result?.first_position;
  if (pos == null) return null;
  return {
    stage: 'candidate',
    type: 'sequence_position_context',
    from: { type: 'number', value: number },
    to: { type: 'number', value: pos },
    relation: 'occurs_at_sequence_position',
    sequence_id: sequenceFinding.sequence_id,
    verification: sequenceFinding.verification || null,
    evidence: { finding_id: universalFinding?.id || null, sequence_finding: sequenceFinding, position_context: positionContext || null },
    canonical: false,
    published: false,
  };
}

function derivedNumericRoot(number, sequenceFinding, positionContext, universalFinding) {
  const value = sequenceFinding?.result?.first_position;
  if (value == null) return null;
  return {
    stage: 'candidate',
    type: 'derived_numeric_root',
    root: { type: 'number', value },
    traversable: true,
    derivation: {
      from: { type: 'number', value: number },
      lens: `sequence:${sequenceFinding.sequence_id}`,
      operation: sequenceFinding.operation || null,
      relation: 'sequence_position',
    },
    verification: sequenceFinding.verification || null,
    provenance: {
      finding_id: universalFinding?.id || null,
      sequence_id: sequenceFinding.sequence_id,
      sequence_version: sequenceFinding.sequence_version || null,
      position_convention: sequenceFinding.position_convention || null,
      search_depth: sequenceFinding.search_depth ?? null,
    },
    context: positionContext || null,
    canonical: false,
    published: false,
  };
}

export function deriveNumericResearchPriority({ dossier, researchObjects = [], hotContext = null, weights = {} } = {}) {
  const signals = {
    convergence_count: dossier?.facts?.convergences?.length || 0,
    engine_verified_findings: researchObjects.filter(x => x?.engine_verified === true).length,
    source_diversity: new Set(researchObjects.map(x => x?.source).filter(Boolean)).size,
    relation_evidence: dossier?.evidence?.length || 0,
    open_questions: researchObjects.filter(x => x?.kind === 'question' && x?.status !== 'dismissed').length,
    hot_context_signal: Math.max(0, Number(hotContext?.score || hotContext?.priority || 0) || 0),
  };
  const w = { ...DEFAULT_PRIORITY_WEIGHTS, ...weights };
  const score = signals.convergence_count * w.convergence
    + signals.engine_verified_findings * w.engineVerified
    + signals.source_diversity * w.sourceDiversity
    + signals.relation_evidence * w.relationEvidence
    + signals.open_questions * w.openQuestions
    + signals.hot_context_signal * w.hotContext;
  return {
    score,
    rank_basis: signals,
    weights: w,
    policy: 'router_local_configurable_v1_not_canonical',
    truth_status: 'NOT_A_TRUTH_SIGNAL',
  };
}

// ── W2.2b · BOUNDED NUMBER LOOKUP WINDOW ──────────────────────────────────────────────────
// Live fan-out is real: 28,673 distinct verified bidim values, rows-per-value p50=2 / p90=25 /
// p99=195 / max=497; 358 alone returns 226 rows and its raw lookup JSON is ~201KB BEFORE Universal
// Finding expansion. Returning "whatever came back" would either blow the Bundle up or, worse, let
// a truncated window look source-exhaustive. So the window is explicit and always reports
// total/returned/truncated plus a continuation cursor.
export const DEFAULT_NUMBER_LOOKUP_WINDOW = Object.freeze({ limit: 50, maxLimit: 500 });

// Deterministic GOVERNED-FIRST order, mirroring fn_number_lookup's own SQL ORDER BY so a client-side
// window can never disagree with the server's paging. The final bid_id tiebreaker is what makes the
// order TOTAL — (governed, composite, method, phrase) is not unique across provenance generations.
export function orderNumberLookupRowsGovernedFirst(rows) {
  const rank = row => [
    row?.method_governed === true ? 0 : 1,
    clean(row?.atomic_or_composite) === 'composite' ? 1 : 0,
    clean(row?.method) || '',
    clean(row?.phrase) || '',
    clean(row?.bid_id) || '',
  ];
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] === rb[i]) continue;
      return ra[i] < rb[i] ? -1 : 1;
    }
    return 0;
  });
}

/**
 * Apply the bounded window to an ordered lookup row set.
 * Returns the window plus an honest description of what was NOT returned.
 */
export function boundNumberLookupRows(rows, { limit, afterBidId = null, offset = 0 } = {}) {
  const ordered = orderNumberLookupRowsGovernedFirst(rows);
  const total = ordered.length;
  const size = Math.max(1, Math.min(Number(limit) || DEFAULT_NUMBER_LOOKUP_WINDOW.limit, DEFAULT_NUMBER_LOOKUP_WINDOW.maxLimit));

  // Cursor form is preferred (stable under concurrent writes); numeric offset stays supported.
  let start = Number.isSafeInteger(Number(offset)) && Number(offset) > 0 ? Number(offset) : 0;
  if (afterBidId) {
    const at = ordered.findIndex(row => clean(row?.bid_id) === clean(afterBidId));
    start = at >= 0 ? at + 1 : start;
  }

  const window = ordered.slice(start, start + size);
  const lastBidId = window.length ? clean(window[window.length - 1]?.bid_id) : null;
  const consumed = start + window.length;
  const truncated = consumed < total;

  return {
    rows: window,
    bounded: {
      total_count: total,
      returned_count: window.length,
      truncated,
      window: { limit: size, offset: start, after_bid_id: afterBidId || null },
      ordering: 'governed_first__then_atomic_before_composite__then_method__phrase__bid_id',
      continuation: truncated
        ? { lens: 'number_lookup', after_bid_id: lastBidId, offset: consumed, limit: size, remaining: total - consumed }
        : null,
      // Stated so no downstream reader can mistake a window for the whole source population.
      source_exhaustive: !truncated,
    },
  };
}

export async function researchNumber(numberInput, options = {}) {
  const number = Number(numberInput);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error('number must be a non-negative safe integer');
  const budget = normalizeBudget(options.budget);
  const requested = (options.lenses?.length ? options.lenses : ['number_lookup', 'number_dossier', 'research_objects', 'sequence:pi']).slice(0, budget.maxLenses);
  const perLens = {};
  const rpc = options.rpc;

  let lookupBounds = null;
  if (requested.includes('number_lookup') || requested.includes('gematria_reverse')) {
    const lookup = await rpcCall(rpc, 'fn_number_lookup', { p_value: number });
    if (lookup.status === 'ok' && Array.isArray(lookup.data)) {
      const { rows, bounded } = boundNumberLookupRows(lookup.data, options.lookupWindow || {});
      lookupBounds = bounded;
      perLens.number_lookup = { ...lookup, data: rows, bounded };
    } else {
      perLens.number_lookup = lookup;
    }
  }
  if (requested.includes('number_dossier') || requested.includes('gematria_reverse')) perLens.number_dossier = await rpcCall(rpc, 'fn_number_dossier', { p_value: number });
  if (requested.includes('number_journey')) perLens.number_journey = await rpcCall(rpc, 'fn_number_journey', { p_value: number });
  if (requested.includes('neighbors')) perLens.neighbors = await rpcCall(rpc, 'number_neighbors', { p_value: number, p_limit: Math.min(25, options.neighborLimit || 12) });
  if (requested.includes('hot_context')) perLens.hot_context = await rpcCall(rpc, 'fn_hot_context', { p_values: [number], p_scope: options.scope || 'numeric-router-v1' });
  if (requested.includes('research_objects')) {
    perLens.research_objects = typeof options.fetchResearchObjects === 'function'
      ? await options.fetchResearchObjects(number, { limit: Math.min(50, options.researchObjectLimit || 25) })
      : { status: 'adapter_needed', error: 'RESEARCH_OBJECT_FETCHER_NOT_PROVIDED' };
  }
  for (const id of requested.filter(id => numericLensMap[id]?.status === NUMERIC_LENS_STATUS.ADAPTER_NEEDED)) perLens[id] = { status: 'adapter_needed', ...numericLensMap[id] };

  const registry = createSequenceRegistry([...DEFAULT_SEQUENCE_ADAPTERS, ...(options.sequenceAdapters || [])]);
  const sequenceLensIds = requested.filter(id => id.startsWith('sequence:'));
  const universalFindings = [];
  // number_lookup is the ONLY numeric lens that returns atomic, governed, source-native evidence
  // rows, so it is the only one that becomes positive Findings here. dossier/journey/neighbors/
  // hot_context stay in per_lens as context/projection/ranking (see numericLensMap semantic_class).
  if (Array.isArray(perLens.number_lookup?.data)) {
    universalFindings.push(...numberLookupRowsToUniversalFindings(perLens.number_lookup.data, { requestedValue: number }));
  }
  const relationCandidates = [];
  const derivedNumericRoots = [];

  for (const lensId of sequenceLensIds) {
    const sequenceId = lensId.slice('sequence:'.length);
    const sequenceFinding = await runSequenceLens(registry, {
      sequenceId,
      query: String(number),
      operation: options.sequenceOperations?.[sequenceId] || options.sequenceOperation,
      budget: budget.sequence,
      provenance: options.provenance,
    });
    perLens[lensId] = sequenceFinding;
    const universalFinding = sequenceUniversalFinding(number, sequenceFinding);
    if (universalFinding) universalFindings.push(universalFinding);

    let positionContext = null;
    if (budget.depth >= 2 && sequenceFinding?.result?.first_position != null) {
      positionContext = await rpcCall(rpc, 'fn_number_lookup', { p_value: sequenceFinding.result.first_position });
      perLens[`${lensId}:position_context`] = positionContext;
    }
    const candidate = relationCandidate(number, sequenceFinding, positionContext, universalFinding);
    if (candidate) relationCandidates.push(candidate);
    const derivedRoot = derivedNumericRoot(number, sequenceFinding, positionContext, universalFinding);
    if (derivedRoot) derivedNumericRoots.push(derivedRoot);
  }

  const objects = Array.isArray(perLens.research_objects?.data) ? perLens.research_objects.data : Array.isArray(perLens.research_objects) ? perLens.research_objects : [];
  const dossier = perLens.number_dossier?.data || null;
  const hotContext = perLens.hot_context?.data || null;

  return {
    v: 1,
    root: { type: 'number', value: number },
    context: options.context || null,
    requested_lenses: requested,
    budget,
    per_lens: perLens,
    bounds: { number_lookup: lookupBounds },
    universal_findings: universalFindings,
    relation_candidates: relationCandidates,
    derived_numeric_roots: derivedNumericRoots,
    priority: deriveNumericResearchPriority({ dossier, researchObjects: objects, hotContext, weights: options.priorityWeights }),
    provenance: { request_source: options.provenance?.requestSource || null, input_ref: options.provenance?.inputRef || null },
    truth_lifecycle: { automatic_canonical_promotion: false, automatic_publication: false, human_gate_required: true },
  };
}

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

// ── W2.2b · NUMBER LOOKUP ROW → UNIVERSAL FINDING ─────────────────────────────────────────
// Sibling of sequenceUniversalFinding() above: the numeric router already owns the job of turning
// one lens result into the shared Universal Finding envelope, so the number_lookup lens gets its
// adapter HERE rather than a second owner. (It deliberately does NOT live in canonicalGematria.js,
// which imports the Supabase client and would drag a live client into a pure projection path.)
// It never recalculates anything: every row arrives already computed by the canonical engine.
//
// IDENTITY (the whole point of this adapter). A Universal Finding must be keyed on SOURCE-NATIVE
// STABLE IDENTITY. A lookup row's identity is public.bidim.bid_id — unique, engine-assigned and
// stable across re-reads — NOT method+phrase+value, and emphatically not the human-readable
// `provenance` string. One phrase can hold several bidim rows for the same method across
// provenance/verification generations, so a label/value key would silently collapse distinct
// source rows into one Finding. W2.2b extended fn_number_lookup additively to project bid_id and
// the row's run/dependency/verification provenance for exactly this reason.
//
// VERIFICATION MAPPING (honest, verified against live row shape on 11.9.2026):
//   * provenance_state='governed' rows carry engine_run_id + computed_at + method_version and no
//     verification run — the value IS the governed engine's own output, and no CLAIM was submitted
//     for it, so the honest state is "not_tested" (the same HG-3 pattern as gematria_api/ELS).
//   * provenance_state='legacy_verified' rows carry verified_at + verified_run_id: a pre-existing
//     stored value WAS re-executed and compared. That is a genuine claim-vs-engine test, so it may
//     honestly report "match" (or "mismatch" when verified_mismatch_value is set), with the stored
//     value as the claim and the re-execution recorded in evidence.
//   * anything else stays null — honestly unknown, never coerced (INVARIANT PR2/PR3).
// `stage` is never set: the epistemic type of a gematria row is a Human-Gate decision, not this
// adapter's (INVARIANT PR1). `status` carries the row's real GOVERNANCE state (governed /
// legacy_verified), which the envelope's governance axis genuinely does own.

const LOOKUP_ACCESS_REASON =
  "fn_number_lookup is the canonical public Number lookup contract (anon-executable, is_verified=true rows only)";

function lookupIdentity(row) {
  const bidId = clean(row?.bid_id);
  if (bidId) return { key: bidId, sourceIdentity: { bidId, table: "bidim" }, keyed_on: "bid_id" };
  // Defensive only — every live bidim row carries bid_id (366,492/366,492 verified 11.9.2026).
  // If one ever does not, fall back to the full composite key and SAY SO, rather than quietly
  // keying a Finding on a label.
  const composite = [clean(row?.word_id), clean(row?.method), row?.value ?? null].filter(v => v != null).join("|");
  if (!composite) return null;
  return {
    key: `bidim-composite:${composite}`,
    sourceIdentity: { table: "bidim", wordId: clean(row?.word_id), method: clean(row?.method), value: row?.value ?? null, bidId: null },
    keyed_on: "composite_fallback_bid_id_absent",
  };
}

function lookupVerification(row) {
  const method = clean(row?.method);
  const value = row?.value ?? null;

  if (row?.verified_mismatch_value != null) {
    return {
      claimed_expression: clean(row?.phrase),
      claimed_method: method,
      claimed_value: value,
      engine_method_tested: method,
      engine_result: row.verified_mismatch_value,
      statement_lang: "he",
      verification_state: "mismatch",
    };
  }
  if (row?.verified_at != null) {
    return {
      claimed_expression: clean(row?.phrase),
      claimed_method: method,
      claimed_value: value,
      engine_method_tested: method,
      engine_result: value,
      statement_lang: "he",
      verification_state: "match",
    };
  }
  if (clean(row?.row_provenance_state) === "governed" && clean(row?.engine_run_id)) {
    return {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: null,
      engine_method_tested: method,
      engine_result: value,
      statement_lang: null,
      verification_state: "not_tested",
    };
  }
  return {
    claimed_expression: null,
    claimed_method: null,
    claimed_value: null,
    engine_method_tested: method,
    engine_result: value,
    statement_lang: null,
    verification_state: null,
  };
}

/**
 * Project ONE fn_number_lookup row into the shared Universal Finding envelope.
 * Read-only: nothing is recomputed, re-ranked, promoted or published here.
 */
export function numberLookupRowToUniversalFinding(row, { requestedValue = null } = {}) {
  const method = clean(row?.method);
  const phrase = clean(row?.phrase);
  const value = row?.value ?? requestedValue ?? null;
  if (!method || !phrase || value == null) return null;

  const identity = lookupIdentity(row);
  if (!identity) return null;

  const nodeId = clean(row?.node_id);
  const provenanceState = clean(row?.row_provenance_state);

  return makeUniversalFinding({
    kind: "gematria",
    // INVARIANT PR1 — epistemic type stays a Human-Gate decision.
    stage: null,
    // GOVERNANCE axis: the row's real provenance state, which this adapter genuinely knows.
    status: provenanceState,
    // Source-native subject: the row is a statement about a PHRASE. The number is the query, and is
    // carried as an anchor/dimension so the Finding still joins the number's lens.
    subject: { type: "phrase", key: phrase, label: phrase, value: Number(value), lang: "he" },
    source: {
      engine: "gematria",
      adapter: "number-lookup-v1",
      sourceRef: identity.sourceIdentity.bidId ? `bidim:${identity.sourceIdentity.bidId}` : null,
      method,
      corpus: null,
      lang: "he",
    },
    identity: {
      sourceIdentity: identity.sourceIdentity,
      occurrence: null,
      entityRef: nodeId ? `node:${nodeId}` : null,
      relationRef: null,
    },
    verification: lookupVerification(row),
    evidence: {
      refs: identity.sourceIdentity.bidId ? [`bidim:${identity.sourceIdentity.bidId}`] : [],
      facts: [{
        type: "gematria-lookup-row",
        method,
        phrase,
        value: Number(value),
        method_version: row?.method_version ?? null,
        provenance_state: provenanceState,
        engine_run_id: clean(row?.engine_run_id),
        computed_at: row?.computed_at ?? null,
        dependency_version_snapshot: row?.dependency_version_snapshot ?? null,
        verified_run_id: clean(row?.verified_run_id),
        verified_at: row?.verified_at ?? null,
        verified_method_version: row?.verified_method_version ?? null,
        verified_mismatch_value: row?.verified_mismatch_value ?? null,
      }],
      score: null,
      confidence: null,
    },
    // The source contract itself is public, so this is a fact about the source, not a fabricated
    // publication claim. It is what lets the composition-boundary access filter pass the row.
    access: { tier: "public", reason: LOOKUP_ACCESS_REASON },
    provenance: {
      createdBy: provenanceState === "governed" ? "ENGINE:gematria" : null,
      createdAt: row?.computed_at || row?.verified_at || undefined,
      inputRef: `number:${Number(value)}`,
    },
    projection: {
      anchors: [{ space: "number", value: Number(value) }],
      relations: [],
      dimensions: {
        numberLookup: {
          value: Number(value),
          method,
          identityKeyedOn: identity.keyed_on,
          methodGoverned: row?.method_governed ?? null,
          methodActive: row?.method_active ?? null,
          methodScannable: row?.method_scannable ?? null,
          methodExecutable: row?.method_executable ?? null,
          methodEngineVerified: row?.method_engine_verified ?? null,
          methodEvidenceClass: clean(row?.method_evidence_class),
          mathematicalFamily: clean(row?.mathematical_family),
          atomicOrComposite: clean(row?.atomic_or_composite),
          provenanceState,
        },
      },
    },
    view: { rendererHints: { role: "number-lookup-row" } },
  });
}

export function numberLookupRowsToUniversalFindings(rows, options = {}) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => numberLookupRowToUniversalFinding(row, options))
    .filter(Boolean);
}
