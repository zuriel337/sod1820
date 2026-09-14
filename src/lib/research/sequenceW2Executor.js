import { researchNumber } from './numericResearch.js';
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  EVIDENCE_RELATION,
  SEMANTIC_CLASS,
} from './researchResultBundle.js';
import { CONTROL_STATE, SELECTION_PROTOCOL } from './researchEvaluation.js';

// G2 2029 — one generic Sequence/Pattern -> W2 capability bridge.
// Operator-specific execution/evaluation stays inside registered sequence adapters. This module
// contains no Pi/Fibonacci/Lucas/palindrome/etc branching and owns no sequence registry or truth.

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

function numberFromIdentity(identityResolution) {
  for (const identity of Array.isArray(identityResolution?.identities) ? identityResolution.identities : []) {
    if (identity?.type !== 'number') continue;
    const number = parseCanonicalNumber(identity?.value ?? identity?.ref ?? identity?.key ?? identity?.label);
    if (number != null) return number;
  }
  return null;
}

function rpcExecutor(supabase) {
  return async (name, args) => supabase.rpc(name, args);
}

function operationIsAll(operation) {
  return String(operation || '').includes('all_occurrences');
}

function sequenceLocation(number, sequence) {
  const position = Number(sequence?.result?.first_position);
  if (!Number.isInteger(position) || position <= 0) return null;
  const representation = clean(sequence?.representation_kind);
  const query = String(sequence?.query ?? number);
  const spanLength = representation === 'digit_stream' ? Math.max(1, query.length) : 1;
  const end = position + spanLength - 1;
  return {
    native: {
      convention: clean(sequence?.position_convention),
      start: position,
      end,
      locator: sequence?.result?.surrounding_window ?? null,
    },
    canonical: {
      convention: clean(sequence?.position_convention),
      start: position,
      end,
      locator: sequence?.result?.surrounding_window ?? null,
    },
    reconciliation_state: 'identity_same_convention',
    reconciliation: null,
    span: { start: position, end, unit: representation === 'digit_stream' ? 'digit' : 'term' },
    window_ref: null,
    locator: sequence?.result?.surrounding_window ?? null,
  };
}

function sequenceCompletion(sequence, foundState) {
  if (foundState === false) {
    return {
      state: 'bounded_complete_negative',
      complete: true,
      truncated: false,
      continuation: null,
      stop_reason: 'declared bounded search exhausted without a match',
    };
  }

  if (operationIsAll(sequence?.operation)) {
    const truncated = sequence?.result?.occurrences_truncated === true;
    return {
      state: truncated ? 'occurrence_cap_truncated' : 'bounded_all_occurrences_complete',
      complete: !truncated,
      truncated,
      continuation: null,
      stop_reason: truncated
        ? 'operator occurrence cap hid one or more additional matches'
        : 'operator attested no additional occurrence was hidden by the cap',
    };
  }

  return {
    state: 'first_match_objective_complete',
    complete: true,
    truncated: false,
    continuation: null,
    stop_reason: 'first requested occurrence objective completed within the declared bounded search',
  };
}

function defaultSearchSpace(number, lensId, sequence) {
  const occurrenceCount = Array.isArray(sequence?.result?.occurrences)
    ? sequence.result.occurrences.length
    : sequence?.result?.found === true ? 1 : 0;
  return {
    declared: {
      sequence_id: clean(sequence?.sequence_id) || lensId.replace('sequence:', ''),
      operation: clean(sequence?.operation),
      search_depth: sequence?.search_depth ?? null,
    },
    effective: {
      sequence_id: clean(sequence?.sequence_id) || lensId.replace('sequence:', ''),
      search_depth: sequence?.search_depth ?? null,
    },
    tested: {
      target_ref: `number:${number}`,
      found: sequence?.result?.found === true,
      occurrence_count_returned: occurrenceCount,
    },
    dimensions: {
      representation_kind: clean(sequence?.representation_kind),
      query: sequence?.query ?? String(number),
    },
    budget: { max_search_depth: sequence?.search_depth ?? null },
    multiplicity: {
      targets: 1,
      operators: 1,
      windows: null,
      languages: null,
      transforms: null,
      cohorts: null,
      total_tests: null,
      known_complete: false,
    },
    unavailable_reason: 'operator-level opportunity/multiple-testing count was not declared by the adapter',
  };
}

function defaultReplay(number, lensId, sequence) {
  return {
    // Deterministic execution is necessary but not sufficient for a formal replay acceptance claim.
    replayable: null,
    run_id: null,
    input_ref: `number:${number}`,
    source_ref: clean(sequence?.sequence_id) ? `sequence:${sequence.sequence_id}` : lensId,
    engine_ref: sequence?.operator_ref?.operator_id || clean(sequence?.sequence_id),
    version_refs: [clean(sequence?.sequence_version), clean(sequence?.operator_ref?.version)].filter(Boolean),
    parameters: {
      query: sequence?.query ?? String(number),
      operation: clean(sequence?.operation),
      search_depth: sequence?.search_depth ?? null,
      position_convention: clean(sequence?.position_convention),
    },
    random_seed: null,
    generator_version: null,
    unavailable_reason: 'formal replay/idempotency acceptance has not yet attested replayable=true',
  };
}

function selectionFromPlan(plan, number) {
  const protocol = clean(plan?.selection_protocol) || SELECTION_PROTOCOL.UNKNOWN;
  return {
    protocol,
    target_ref: `number:${number}`,
    provenance_ref: null,
    fixed_before_inspection: protocol === SELECTION_PROTOCOL.PRE_REGISTERED_TARGET
      ? true
      : protocol === SELECTION_PROTOCOL.POST_HOC_EXPLORATORY ? false : null,
    reason: protocol === SELECTION_PROTOCOL.UNKNOWN
      ? 'Research Plan did not declare a stronger selection-provenance class'
      : 'selection-provenance class supplied by canonical Research Plan',
  };
}

function buildResearchEvaluation(number, lensId, sequence, plan) {
  const operatorEvaluation = sequence?.evaluation && typeof sequence.evaluation === 'object' && !Array.isArray(sequence.evaluation)
    ? sequence.evaluation
    : {};
  const foundState = sequence?.result?.found;

  return {
    operator_ref: sequence?.operator_ref || null,
    access: null,
    selection: operatorEvaluation.selection ?? selectionFromPlan(plan, number),
    search_space: operatorEvaluation.search_space ?? defaultSearchSpace(number, lensId, sequence),
    expectedness: operatorEvaluation.expectedness ?? null,
    controls: Array.isArray(operatorEvaluation.controls) ? operatorEvaluation.controls : [],
    controls_state: operatorEvaluation.controls_state ?? {
      status: CONTROL_STATE.UNKNOWN,
      reason: 'operator did not report whether a control protocol was executed',
    },
    location: operatorEvaluation.location ?? (foundState === true ? sequenceLocation(number, sequence) : null),
    dependency: operatorEvaluation.dependency ?? null,
    robustness: operatorEvaluation.robustness ?? null,
    competing_patterns: Array.isArray(operatorEvaluation.competing_patterns) ? operatorEvaluation.competing_patterns : [],
    completion: operatorEvaluation.completion ?? sequenceCompletion(sequence, foundState),
    replay: operatorEvaluation.replay ?? defaultReplay(number, lensId, sequence),
  };
}

function outcomeReason(evaluation) {
  const expectedness = evaluation?.expectedness;
  const rate = expectedness?.base_rate;
  if (typeof rate === 'number' && Number.isFinite(rate) && rate >= 0.95) {
    return 'independent operator lineage; occurrence is high-base-rate under the declared evaluation model and is not corroboration by itself';
  }
  if (expectedness?.model) {
    return 'independent operator lineage; expectedness was evaluated by the operator-declared model; semantic relevance is not implied';
  }
  return 'independent operator lineage; expectedness/base-rate is unavailable, so semantic relevance and strength are not implied';
}

function evidenceLineage(number, sequence) {
  const occurrence = sequence?.result?.first_position;
  const source = clean(sequence?.sequence_id);
  const version = clean(sequence?.sequence_version);
  return {
    relation: 'unknown',
    root_input_ref: `number:${number}`,
    representation_ref: `number:${number}`,
    occurrence_ref: occurrence == null ? null : `${source || 'sequence'}:${clean(sequence?.operation) || 'operation'}:${occurrence}`,
    window_ref: null,
    artifact_refs: [],
    source_lineage_refs: source ? [`sequence:${source}${version ? `@${version}` : ''}`] : [],
    parent_refs: [],
  };
}

export function createSequenceW2Executor({
  supabase,
  lensId,
  sequenceAdapters = [],
  sequenceBudget = null,
  sequenceOperation = null,
  sequenceOperations = null,
} = {}) {
  if (typeof supabase?.rpc !== 'function') throw new Error('canonical Supabase RPC client required');
  const capability = clean(lensId);
  if (!capability || !capability.startsWith('sequence:')) {
    throw new TypeError('sequenceW2Executor: lensId must be an owner-routed sequence:* capability key');
  }
  const sequenceId = capability.slice('sequence:'.length);

  return async function sequenceW2Executor({ identityResolution, plan = null } = {}) {
    const number = numberFromIdentity(identityResolution);
    if (number == null) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.SKIPPED,
        reason: 'no canonical number identity resolved',
        findings: [],
      };
    }

    const result = await researchNumber(number, {
      lenses: [capability],
      rpc: rpcExecutor(supabase),
      budget: { depth: 1, sequence: sequenceBudget || {} },
      sequenceAdapters,
      sequenceOperation,
      sequenceOperations,
      provenance: { requestSource: 'research-composer-w2', inputRef: `number:${number}` },
    });
    const sequence = result?.per_lens?.[capability];
    if (!sequence) {
      return { owner: 'research_strategy_layer_law', status: CAPABILITY_STATUS.FAILED, reason: `${capability} returned no result`, findings: [] };
    }
    if (sequence.status === 'error') {
      return {
        owner: 'research_strategy_layer_law',
        status: sequence.error === 'SEQUENCE_ADAPTER_NOT_REGISTERED' ? CAPABILITY_STATUS.MISSING_ADAPTER : CAPABILITY_STATUS.FAILED,
        reason: sequence.error || `${capability} failed`,
        findings: [],
        trace: { lens: capability, status: sequence.status, error: sequence.error || null },
      };
    }
    if (sequence.status === 'adapter_needed') {
      return { owner: 'research_strategy_layer_law', status: CAPABILITY_STATUS.MISSING_ADAPTER, reason: sequence.error || `${capability} adapter missing`, findings: [] };
    }

    const foundState = sequence?.result?.found;
    const researchEvaluation = buildResearchEvaluation(number, capability, sequence, plan);
    const operatorRef = sequence?.operator_ref || null;

    if (foundState === false) {
      return {
        owner: operatorRef?.owner || 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.NEGATIVE_RESULT,
        reason: `${number} not found in bounded ${sequence.sequence_id || sequenceId} search`,
        negativeScope: {
          sequence_id: sequence.sequence_id || sequenceId,
          operation: clean(sequence.operation),
          search_depth: sequence.search_depth ?? null,
          position_convention: clean(sequence.position_convention),
        },
        findings: [],
        operatorRef,
        researchEvaluation,
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
        sourceRefs: [`number:${number}`],
        versionRefs: [clean(sequence.sequence_version), clean(operatorRef?.version)].filter(Boolean),
        trace: {
          lens: capability,
          sequence_id: sequence.sequence_id || sequenceId,
          status: 'ok',
          found: false,
          evaluation_status: clean(sequence?.evaluation?.status),
        },
      };
    }

    if (foundState !== true) {
      return {
        owner: operatorRef?.owner || 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.UNVERIFIED,
        reason: `${capability} did not return an explicit found=true/false outcome`,
        findings: [],
        operatorRef,
        researchEvaluation,
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
        trace: { lens: capability, status: sequence.status || 'unknown', found: null },
      };
    }

    const findings = (Array.isArray(result?.universal_findings) ? result.universal_findings : [])
      .filter(finding => finding?.kind === 'sequence');
    const lineage = evidenceLineage(number, sequence);
    const expectedness = researchEvaluation.expectedness || null;

    return {
      owner: operatorRef?.owner || 'research_strategy_layer_law',
      status: CAPABILITY_STATUS.EXECUTED,
      findings,
      operatorRef,
      researchEvaluation,
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.EVIDENCE,
      findingOutcomes: findings.map(finding => ({
        findingId: finding.id,
        evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE,
        evidenceLineage: lineage,
        reason: outcomeReason(researchEvaluation),
        expectedness: expectedness?.state ?? null,
        expectednessModel: expectedness?.model ?? null,
        baseRate: expectedness?.base_rate ?? null,
      })),
      sourceRefs: [`number:${number}`],
      versionRefs: [clean(sequence.sequence_version), clean(operatorRef?.version)].filter(Boolean),
      trace: {
        lens: capability,
        sequence_id: sequence.sequence_id || sequenceId,
        status: 'ok',
        found: true,
        first_position: sequence?.result?.first_position ?? null,
        search_depth: sequence.search_depth ?? null,
        evaluation_status: clean(sequence?.evaluation?.status),
        expectedness_state: expectedness?.state ?? null,
        expectedness_model: expectedness?.model ?? null,
        base_rate: expectedness?.base_rate ?? null,
      },
    };
  };
}

export default createSequenceW2Executor;
