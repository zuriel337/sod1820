// Canonical W2 executor entrypoint.
//
// Extends the existing executor tree only. No second composer/engine/registry is created.

import { createCanonicalNumberW2Executors as createBaseW2Executors } from './researchW2ExecutorsBase.js';
import { createGematriaW2Executor } from './gematriaW2Executor.js';
import { createCanonicalElsW2Executor } from './elsW2Executor.js';
import { createSequenceW2Executor } from './sequenceW2Executor.js';
import { CONTROL_STATE, SELECTION_PROTOCOL } from './researchEvaluation.js';
import { ACCESS_CLASS, CAPABILITY_STATUS } from './researchResultBundle.js';

export { SAFE_W2_NUMERIC_LENSES, NUMERIC_SYSTEM_METHOD_RULE_IDS } from './researchW2ExecutorsBase.js';
export { createSequenceW2Executor } from './sequenceW2Executor.js';

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function parseCanonicalNumber(raw) {
  if (typeof raw === 'number') return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function numberAnchors(identityResolution, maxAnchors = 4) {
  const max = Math.max(1, Math.min(Number(maxAnchors) || 4, 8));
  const seen = new Set();
  const out = [];
  for (const identity of Array.isArray(identityResolution?.identities) ? identityResolution.identities : []) {
    if (identity?.type !== 'number') continue;
    const number = parseCanonicalNumber(identity?.value ?? identity?.ref ?? identity?.key ?? identity?.label);
    if (number == null || seen.has(number)) continue;
    seen.add(number);
    out.push({ identity, number });
    if (out.length >= max) break;
  }
  return out;
}

function narrowToAnchor(identityResolution, anchor) {
  return {
    ...(identityResolution || {}),
    identities: [anchor.identity],
    primary: anchor.identity,
    semantic: [anchor.identity],
    text_representations: [],
  };
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

const ACCESS_CLASS_RESTRICTION_ORDER = Object.freeze([
  ACCESS_CLASS.PUBLIC_SOURCE,
  ACCESS_CLASS.UNCLASSIFIED,
  ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
  ACCESS_CLASS.PERSONAL,
]);

function mostRestrictiveAccessClass(runs) {
  let best = null;
  let bestRank = -1;
  for (const run of runs) {
    const value = run.result?.accessClass || run.result?.access_class;
    if (!value) continue;
    const rank = ACCESS_CLASS_RESTRICTION_ORDER.indexOf(value);
    const effectiveRank = rank === -1 ? ACCESS_CLASS_RESTRICTION_ORDER.length : rank;
    if (effectiveRank > bestRank) { bestRank = effectiveRank; best = value; }
  }
  return best;
}

function validCount(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function aggregateBounded(runs) {
  const boundedRuns = runs.filter(x => x.result?.bounded);
  if (!boundedRuns.length) return null;

  const totals = boundedRuns.map(x => validCount(x.result.bounded?.total_count));
  const returneds = boundedRuns.map(x => validCount(x.result.bounded?.returned_count));
  const continuations = boundedRuns
    .filter(x => x.result.bounded?.truncated && x.result.bounded?.continuation)
    .map(x => ({ number: x.number, continuation: x.result.bounded.continuation }));

  return {
    total_count: totals.every(x => x != null) ? totals.reduce((a, b) => a + b, 0) : null,
    returned_count: returneds.every(x => x != null) ? returneds.reduce((a, b) => a + b, 0) : null,
    // Truncation is a truth fact even when the adapter has no continuation mechanism.
    truncated: boundedRuns.some(x => x.result.bounded?.truncated === true),
    window: { kind: 'multi_anchor', anchor_count: runs.length },
    ordering: 'per_anchor_canonical_order__anchor_input_order',
    continuation: continuations.length ? { kind: 'multi_anchor_keyset', anchors: continuations } : null,
  };
}

function aggregateStatus(runs) {
  const statuses = runs.map(x => x.result?.status).filter(Boolean);
  if (!statuses.length || statuses.every(x => x === CAPABILITY_STATUS.SKIPPED)) return CAPABILITY_STATUS.SKIPPED;
  if (statuses.every(x => x === CAPABILITY_STATUS.NEGATIVE_RESULT)) return CAPABILITY_STATUS.NEGATIVE_RESULT;
  if (statuses.some(x => x === CAPABILITY_STATUS.EXECUTED || x === CAPABILITY_STATUS.NEGATIVE_RESULT)) return CAPABILITY_STATUS.EXECUTED;
  if (statuses.some(x => x === CAPABILITY_STATUS.FAILED)) return CAPABILITY_STATUS.FAILED;
  if (statuses.some(x => x === CAPABILITY_STATUS.CONTEXT_REQUIRED)) return CAPABILITY_STATUS.CONTEXT_REQUIRED;
  if (statuses.some(x => x === CAPABILITY_STATUS.MISSING_ADAPTER)) return CAPABILITY_STATUS.MISSING_ADAPTER;
  if (statuses.some(x => x === CAPABILITY_STATUS.UNVERIFIED)) return CAPABILITY_STATUS.UNVERIFIED;
  return statuses[0] || CAPABILITY_STATUS.SKIPPED;
}

function operatorSignature(ref) {
  if (!ref || typeof ref !== 'object') return null;
  const owner = clean(ref.owner), key = clean(ref.capability_key ?? ref.capabilityKey);
  const id = clean(ref.operator_id ?? ref.operatorId), version = clean(ref.version);
  return owner && key && id && version ? `${owner}|${key}|${id}|${version}` : null;
}

function aggregateOperatorRef(runs) {
  const refs = runs.map(x => x.result?.operatorRef ?? x.result?.operator_ref ?? null);
  if (!refs.length || refs.some(x => !x)) return null;
  const signatures = refs.map(operatorSignature);
  if (signatures.some(x => !x) || new Set(signatures).size !== 1) return null;
  return refs[0];
}

function commonEvaluationAccess(evaluations) {
  const tiers = evaluations.map(x => clean(x?.access?.tier)).filter(Boolean);
  if (!tiers.length || new Set(tiers).size !== 1) return null;
  return { tier: tiers[0], reason: 'shared access tier across all multi-anchor capability runs' };
}

function aggregateResearchEvaluation(runs, capability, operatorRef, bounded) {
  const entries = runs
    .map(x => ({ number: x.number, evaluation: x.result?.researchEvaluation ?? x.result?.research_evaluation ?? null, status: x.result?.status || null }))
    .filter(x => x.evaluation);
  if (!entries.length) return null;

  const protocols = entries.map(x => clean(x.evaluation?.selection?.protocol)).filter(Boolean);
  const selectionProtocol = protocols.length && new Set(protocols).size === 1 ? protocols[0] : SELECTION_PROTOCOL.UNKNOWN;
  const completionEntries = entries.map(x => x.evaluation?.completion).filter(Boolean);
  const anyTruncated = bounded?.truncated === true || completionEntries.some(x => x?.truncated === true);
  const allComplete = completionEntries.length === entries.length && completionEntries.every(x => x?.complete === true) && !anyTruncated;
  const versionRefs = uniq(entries.flatMap(x => x.evaluation?.replay?.version_refs || []));

  return {
    operator_ref: operatorRef,
    access: commonEvaluationAccess(entries.map(x => x.evaluation)),
    selection: {
      protocol: selectionProtocol,
      target_ref: null,
      provenance_ref: null,
      fixed_before_inspection: selectionProtocol === SELECTION_PROTOCOL.PRE_REGISTERED_TARGET
        ? true
        : selectionProtocol === SELECTION_PROTOCOL.POST_HOC_EXPLORATORY ? false : null,
      reason: 'multi-anchor aggregation preserves one shared protocol class; target provenance remains per anchor',
    },
    search_space: {
      declared: { capability, anchor_count: runs.length },
      effective: { executed_anchor_count: entries.length },
      tested: {
        anchors: entries.map(x => ({
          number: x.number,
          status: x.status,
          search_space: x.evaluation?.search_space ?? null,
          expectedness: x.evaluation?.expectedness ?? null,
          controls_state: x.evaluation?.controls_state ?? null,
        })),
      },
      dimensions: { anchor_kind: 'number' },
      budget: { max_anchors: runs.length },
      multiplicity: {
        targets: runs.length,
        operators: operatorRef ? 1 : null,
        windows: null,
        languages: null,
        transforms: null,
        cohorts: null,
        total_tests: null,
        known_complete: false,
      },
      unavailable_reason: 'total cross-anchor test multiplicity remains operator-specific and is not inferred from result count',
    },
    expectedness: {
      state: 'per_anchor_only',
      model: null,
      base_rate: null,
      assumptions: [],
      unavailable_reason: 'expectedness is preserved per anchor because one aggregate base-rate would be misleading',
    },
    controls: [],
    controls_state: {
      status: CONTROL_STATE.UNKNOWN,
      reason: 'control execution state is preserved per anchor in search_space.tested.anchors',
      model: null,
      coverage: { anchors: entries.length },
    },
    location: null,
    dependency: null,
    robustness: null,
    competing_patterns: [],
    completion: {
      state: anyTruncated ? 'multi_anchor_truncated' : allComplete ? 'multi_anchor_complete' : 'multi_anchor_partial_or_unknown',
      complete: allComplete,
      truncated: anyTruncated,
      continuation: bounded?.continuation ?? null,
      stop_reason: anyTruncated ? 'one or more anchor runs were truncated' : allComplete ? 'all anchor objectives completed' : 'one or more anchor completion states remain partial/unknown',
    },
    replay: {
      replayable: false,
      run_id: null,
      input_ref: null,
      source_ref: capability,
      engine_ref: operatorRef?.operator_id ?? operatorRef?.operatorId ?? null,
      version_refs: versionRefs.length ? versionRefs : [operatorRef?.version].filter(Boolean),
      parameters: { anchors: runs.map(x => x.number), capability },
      random_seed: null,
      generator_version: null,
      unavailable_reason: 'formal multi-anchor replay requires replay of each preserved per-anchor run',
    },
  };
}

function wrapMultiNumberExecutor(executor, { maxAnchors = 4, capability }) {
  if (typeof executor !== 'function') return executor;
  return async context => {
    const anchors = numberAnchors(context?.identityResolution, maxAnchors);
    if (anchors.length <= 1) return executor(context);

    const runs = [];
    for (const anchor of anchors) {
      const result = await executor({
        ...context,
        identityResolution: narrowToAnchor(context.identityResolution, anchor),
      });
      runs.push({ number: anchor.number, result });
    }

    const findings = runs.flatMap(x => Array.isArray(x.result?.findings) ? x.result.findings : []);
    const findingOutcomes = runs.flatMap(x => Array.isArray(x.result?.findingOutcomes)
      ? x.result.findingOutcomes
      : Array.isArray(x.result?.finding_outcomes) ? x.result.finding_outcomes : []);
    const status = aggregateStatus(runs);
    const partial = new Set(runs.map(x => x.result?.status)).size > 1;
    const first = runs.find(x => x.result)?.result || {};
    const bounded = aggregateBounded(runs);
    const operatorRef = aggregateOperatorRef(runs);
    const researchEvaluation = aggregateResearchEvaluation(runs, capability, operatorRef, bounded);

    return {
      owner: first.owner || 'research_strategy_layer_law',
      status,
      reason: partial
        ? `${capability} per-anchor outcomes differ (${runs.map(x => `${x.number}:${x.result?.status || 'unknown'}`).join(', ')})`
        : first.reason || null,
      findings,
      findingOutcomes,
      negativeScope: status === CAPABILITY_STATUS.NEGATIVE_RESULT
        ? { anchors: runs.map(x => ({ number: x.number, scope: x.result?.negativeScope ?? x.result?.negative_scope ?? null })) }
        : null,
      operatorRef,
      researchEvaluation,
      sourceRefs: uniq(runs.flatMap(x => x.result?.sourceRefs || x.result?.source_refs || [`number:${x.number}`])),
      versionRefs: uniq(runs.flatMap(x => x.result?.versionRefs || x.result?.version_refs || [])),
      accessClass: mostRestrictiveAccessClass(runs) || first.accessClass || first.access_class,
      semanticClass: first.semanticClass || first.semantic_class,
      bounded,
      trace: {
        multi_anchor: true,
        anchor_count: anchors.length,
        max_anchor_budget: Math.max(1, Math.min(Number(maxAnchors) || 4, 8)),
        anchors: runs.map(x => ({
          number: x.number,
          status: x.result?.status || null,
          reason: clean(x.result?.reason),
          bounded: x.result?.bounded ?? null,
          trace: x.result?.trace ?? null,
        })),
      },
    };
  };
}

export function createCanonicalNumberW2Executors(options = {}) {
  const base = createBaseW2Executors(options);
  const maxNumberAnchors = options.maxNumberAnchors ?? 4;
  const gematria = createGematriaW2Executor({
    supabase: options.supabase,
    maxRepresentations: options.gematriaMaxRepresentations ?? 16,
    controls: options.gematriaControls !== false,
  });
  // The canonical entrypoint now exposes the callable ELS seam itself. With no injected core/request
  // resolver it fails closed as MISSING_ADAPTER/CONTEXT_REQUIRED; it never falls back to fn_els_search
  // or the legacy iframe as architectural authority.
  const els = createCanonicalElsW2Executor({
    executeCanonicalEls: options.executeCanonicalEls ?? null,
    resolveRequest: options.resolveElsRequest ?? null,
  });

  // Sequence/Pattern capability execution is routed through ONE family-agnostic bridge. Operator
  // evaluation comes from adapter.evaluate() via sequenceLens; the canonical W2 entrypoint has no
  // Pi/Fibonacci expectedness branch. Additional sequence:* capabilities use the same exported
  // createSequenceW2Executor with their owner-qualified adapter, without redesigning this contract.
  const sequenceCommon = {
    supabase: options.supabase,
    sequenceAdapters: options.sequenceAdapters || [],
    sequenceBudget: options.sequenceBudget || null,
    sequenceOperation: options.sequenceOperation || null,
    sequenceOperations: options.sequenceOperations || null,
  };
  const sequencePi = createSequenceW2Executor({ ...sequenceCommon, lensId: 'sequence:pi' });
  const sequenceFibonacci = createSequenceW2Executor({ ...sequenceCommon, lensId: 'sequence:fibonacci' });

  return {
    ...base,
    numeric: wrapMultiNumberExecutor(base.numeric, { maxAnchors: maxNumberAnchors, capability: 'numeric' }),
    numeric_operators: wrapMultiNumberExecutor(base.numeric_operators, { maxAnchors: maxNumberAnchors, capability: 'numeric_operators' }),
    research_objects: wrapMultiNumberExecutor(base.research_objects, { maxAnchors: maxNumberAnchors, capability: 'research_objects' }),
    'sequence:pi': wrapMultiNumberExecutor(sequencePi, { maxAnchors: maxNumberAnchors, capability: 'sequence:pi' }),
    'sequence:fibonacci': wrapMultiNumberExecutor(sequenceFibonacci, { maxAnchors: maxNumberAnchors, capability: 'sequence:fibonacci' }),
    gematria,
    els,
  };
}

export const createCanonicalW2Executors = createCanonicalNumberW2Executors;
export default createCanonicalNumberW2Executors;
