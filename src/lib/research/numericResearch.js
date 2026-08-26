import { createSequenceRegistry, runSequenceLens, SEQUENCE_OPERATION } from './sequenceLens.js';
import { piSequenceAdapter } from './piSequence.js';
import { makeUniversalFinding } from './universalFinding.js';

export const DEFAULT_NUMERIC_RESEARCH_BUDGET = Object.freeze({
  depth: 2,
  maxLenses: 8,
  sequence: Object.freeze({ maxSearchDepth: 25000, maxOccurrences: 25, windowRadius: 12 }),
});

export const NUMERIC_LENS_STATUS = Object.freeze({ READY: 'READY', ADAPTER_NEEDED: 'ADAPTER_NEEDED' });
const SEQUENCES = createSequenceRegistry([piSequenceAdapter]);

export const numericLensMap = Object.freeze({
  number_lookup: { status: NUMERIC_LENS_STATUS.READY, rpc: 'fn_number_lookup' },
  number_dossier: { status: NUMERIC_LENS_STATUS.READY, rpc: 'fn_number_dossier' },
  number_journey: { status: NUMERIC_LENS_STATUS.READY, rpc: 'fn_number_journey' },
  neighbors: { status: NUMERIC_LENS_STATUS.READY, rpc: 'number_neighbors' },
  hot_context: { status: NUMERIC_LENS_STATUS.READY, rpc: 'fn_hot_context' },
  research_objects: { status: NUMERIC_LENS_STATUS.READY, source: 'research_objects' },
  relation_candidates: { status: NUMERIC_LENS_STATUS.ADAPTER_NEEDED, reason: 'fn_relation_candidate requires two semantic endpoints, not a number-only input' },
  cross_resonance: { status: NUMERIC_LENS_STATUS.ADAPTER_NEEDED, reason: 'number_cross_resonance requires p_self + p_pairs contract' },
  source_post_context: { status: NUMERIC_LENS_STATUS.ADAPTER_NEEDED, reason: 'no single canonical number-only source/post RPC' },
  els: { status: NUMERIC_LENS_STATUS.ADAPTER_NEEDED, reason: 'ELS native adapter exists for Universal Findings, but no safe number-only dispatch contract' },
  gematria_reverse: { status: NUMERIC_LENS_STATUS.READY, via: 'fn_number_lookup/fn_number_dossier; do not recalculate in router' },
  pi: { status: NUMERIC_LENS_STATUS.READY, sequence_id: 'pi' },
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
    stage: 'candidate',
    subject: { type: 'number', key: String(number), label: String(number), value: number },
    source: { engine: 'sequence', adapter: 'sequence-lens-v1', sourceRef: `${sequenceFinding.sequence_id}:${sequenceFinding.sequence_version}`, method: sequenceFinding.operation, corpus: null },
    identity: { sourceIdentity: `${sequenceFinding.sequence_id}:${sequenceFinding.operation}:${sequenceFinding.query}:${sequenceFinding.result?.first_position ?? 'not-found'}@${sequenceFinding.search_depth}` },
    evidence: { facts: [{ type: 'sequence-search', sequence_id: sequenceFinding.sequence_id, query: sequenceFinding.query, operation: sequenceFinding.operation, position_convention: sequenceFinding.position_convention, search_depth: sequenceFinding.search_depth, result: sequenceFinding.result, verification: sequenceFinding.verification }] },
    provenance: { createdBy: 'ENGINE:sequence', createdAt: sequenceFinding.provenance?.generated_at || new Date().toISOString(), inputRef: sequenceFinding.provenance?.input_ref || null },
    projection: { dimensions: { sequence_id: sequenceFinding.sequence_id, representation_kind: sequenceFinding.representation_kind } },
  });
}

function relationCandidate(number, sequenceFinding, positionContext, universalFinding) {
  const pos = sequenceFinding?.result?.first_position;
  if (!pos) return null;
  return {
    stage: 'candidate',
    type: 'sequence_position_context',
    from: { type: 'number', value: number },
    to: { type: 'number', value: pos },
    relation: 'occurs_at_sequence_position',
    sequence_id: sequenceFinding.sequence_id,
    verification: sequenceFinding.verification,
    evidence: { finding_id: universalFinding?.id || null, sequence_finding: sequenceFinding, position_context: positionContext || null },
    canonical: false,
    published: false,
  };
}

export function deriveNumericResearchPriority({ dossier, researchObjects = [], hotContext = null } = {}) {
  const convergenceCount = dossier?.facts?.convergences?.length || 0;
  const verifiedCount = researchObjects.filter(x => x?.engine_verified === true).length;
  const sourceDiversity = new Set(researchObjects.map(x => x?.source).filter(Boolean)).size;
  const evidenceCount = dossier?.evidence?.length || 0;
  const openQuestions = researchObjects.filter(x => x?.kind === 'question' && x?.status !== 'dismissed').length;
  const activitySignal = Number(hotContext?.score || hotContext?.priority || 0) || 0;
  const score = convergenceCount * 2 + verifiedCount + sourceDiversity * 2 + evidenceCount * 2 + openQuestions + Math.max(0, activitySignal);
  return { score, rank_basis: { convergence_count: convergenceCount, engine_verified_findings: verifiedCount, source_diversity: sourceDiversity, relation_evidence: evidenceCount, open_questions: openQuestions, hot_context_signal: activitySignal }, truth_status: 'NOT_A_TRUTH_SIGNAL' };
}

export async function researchNumber(numberInput, options = {}) {
  const number = Number(numberInput);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error('number must be a non-negative safe integer');
  const budget = normalizeBudget(options.budget);
  const requested = (options.lenses?.length ? options.lenses : ['number_lookup', 'number_dossier', 'research_objects', 'pi']).slice(0, budget.maxLenses);
  const perLens = {};
  const rpc = options.rpc;

  if (requested.includes('number_lookup') || requested.includes('gematria_reverse')) perLens.number_lookup = await rpcCall(rpc, 'fn_number_lookup', { p_value: number });
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

  let sequenceFinding = null;
  if (requested.includes('pi')) {
    sequenceFinding = await runSequenceLens(SEQUENCES, { sequenceId: 'pi', query: String(number), operation: options.sequenceOperation || SEQUENCE_OPERATION.FIRST, budget: budget.sequence, provenance: options.provenance });
    perLens.pi = sequenceFinding;
  }

  let positionContext = null;
  if (budget.depth >= 2 && sequenceFinding?.result?.first_position != null) {
    positionContext = await rpcCall(rpc, 'fn_number_lookup', { p_value: sequenceFinding.result.first_position });
    perLens.pi_position_numeric_context = positionContext;
  }
  const objects = Array.isArray(perLens.research_objects?.data) ? perLens.research_objects.data : Array.isArray(perLens.research_objects) ? perLens.research_objects : [];
  const dossier = perLens.number_dossier?.data || null;
  const hotContext = perLens.hot_context?.data || null;
  const universalFinding = sequenceUniversalFinding(number, sequenceFinding);
  const candidate = relationCandidate(number, sequenceFinding, positionContext, universalFinding);

  return {
    v: 1,
    root: { type: 'number', value: number },
    context: options.context || null,
    requested_lenses: requested,
    budget,
    per_lens: perLens,
    universal_findings: universalFinding ? [universalFinding] : [],
    relation_candidates: candidate ? [candidate] : [],
    priority: deriveNumericResearchPriority({ dossier, researchObjects: objects, hotContext }),
    provenance: { request_source: options.provenance?.requestSource || null, input_ref: options.provenance?.inputRef || null },
    truth_lifecycle: { automatic_canonical_promotion: false, automatic_publication: false, human_gate_required: true },
  };
}
