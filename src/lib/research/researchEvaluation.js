// G2 2029 — maximal research-evaluation transport for the existing Result Bundle.
//
// research_strategy_layer_law v13 owns the semantics. This module is ONLY a normalizer/transport
// contract used by the existing Research Result Bundle. It owns no engine truth, statistical model,
// dependency engine, replay engine, store or registry.

export const RESEARCH_EVALUATION_CONTRACT_VERSION = 1;

export const SELECTION_PROTOCOL = Object.freeze({
  SOURCE_CLAIM_REPLAY: 'source_claim_replay',
  PRE_REGISTERED_TARGET: 'pre_registered_target',
  HYPOTHESIS_DRIVEN_FOLLOWUP: 'hypothesis_driven_followup',
  POST_HOC_EXPLORATORY: 'post_hoc_exploratory',
  UNKNOWN: 'unknown',
});

const VALID_SELECTION_PROTOCOL = new Set(Object.values(SELECTION_PROTOCOL));

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function finiteOrNull(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function integerOrNull(value) {
  const n = finiteOrNull(value);
  return Number.isInteger(n) ? n : null;
}

function objectOrNull(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function uniqStrings(values) {
  return [...new Set(array(values).map(clean).filter(Boolean))];
}

export function normalizeOperatorRef(ref) {
  const value = objectOrNull(ref);
  if (!value) return null;
  const owner = clean(value.owner);
  const capabilityKey = clean(value.capability_key ?? value.capabilityKey);
  const operatorId = clean(value.operator_id ?? value.operatorId);
  const version = clean(value.version);
  if (!owner || !capabilityKey || !operatorId || !version) return null;
  return {
    type: clean(value.type) || 'research_operator',
    owner,
    capability_key: capabilityKey,
    operator_id: operatorId,
    version,
  };
}

function normalizeSelection(value) {
  const input = objectOrNull(value);
  if (!input) return null;
  const protocol = clean(input.protocol) || SELECTION_PROTOCOL.UNKNOWN;
  if (!VALID_SELECTION_PROTOCOL.has(protocol)) {
    throw new TypeError(`researchEvaluation: invalid selection protocol "${protocol}"`);
  }
  return {
    protocol,
    target_ref: clean(input.target_ref ?? input.targetRef),
    provenance_ref: clean(input.provenance_ref ?? input.provenanceRef),
    fixed_before_inspection: typeof input.fixed_before_inspection === 'boolean'
      ? input.fixed_before_inspection
      : typeof input.fixedBeforeInspection === 'boolean' ? input.fixedBeforeInspection : null,
    reason: clean(input.reason),
  };
}

function normalizeSearchSpace(value) {
  const input = objectOrNull(value);
  if (!input) return null;
  const multiplicity = objectOrNull(input.multiplicity);
  return {
    declared: input.declared ?? null,
    effective: input.effective ?? null,
    tested: input.tested ?? null,
    dimensions: objectOrNull(input.dimensions) || {},
    budget: objectOrNull(input.budget) || null,
    multiplicity: multiplicity ? {
      targets: integerOrNull(multiplicity.targets),
      operators: integerOrNull(multiplicity.operators),
      windows: integerOrNull(multiplicity.windows),
      languages: integerOrNull(multiplicity.languages),
      transforms: integerOrNull(multiplicity.transforms),
      cohorts: integerOrNull(multiplicity.cohorts),
      total_tests: integerOrNull(multiplicity.total_tests ?? multiplicity.totalTests),
      known_complete: typeof multiplicity.known_complete === 'boolean'
        ? multiplicity.known_complete
        : typeof multiplicity.knownComplete === 'boolean' ? multiplicity.knownComplete : null,
    } : null,
    unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason),
  };
}

function normalizeExpectedness(value) {
  const input = objectOrNull(value);
  if (!input) return null;
  const rawBaseRate = input.base_rate ?? input.baseRate;
  const baseRate = rawBaseRate == null ? null : finiteOrNull(rawBaseRate);
  return {
    state: clean(input.state ?? input.expectedness),
    model: clean(input.model ?? input.expectedness_model ?? input.expectednessModel),
    base_rate: baseRate,
    assumptions: array(input.assumptions).map(String),
    unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason),
  };
}

function normalizeControls(value) {
  return array(value).map((control, index) => {
    const input = objectOrNull(control) || {};
    return {
      control_id: clean(input.control_id ?? input.controlId) || `control:${index + 1}`,
      type: clean(input.type),
      model: clean(input.model),
      result: input.result ?? null,
      seed: clean(input.seed),
      version: clean(input.version),
      provenance_ref: clean(input.provenance_ref ?? input.provenanceRef),
    };
  });
}

function normalizeLocation(value) {
  const input = objectOrNull(value);
  if (!input) return null;
  const native = objectOrNull(input.native);
  const canonical = objectOrNull(input.canonical);
  const span = objectOrNull(input.span);
  return {
    native: native ? {
      convention: clean(native.convention),
      start: integerOrNull(native.start),
      end: integerOrNull(native.end),
      locator: native.locator ?? null,
    } : null,
    canonical: canonical ? {
      convention: clean(canonical.convention),
      start: integerOrNull(canonical.start),
      end: integerOrNull(canonical.end),
      locator: canonical.locator ?? null,
    } : null,
    reconciliation_state: clean(input.reconciliation_state ?? input.reconciliationState),
    reconciliation: input.reconciliation ?? null,
    span: span ? {
      start: integerOrNull(span.start),
      end: integerOrNull(span.end),
      unit: clean(span.unit),
    } : null,
    window_ref: clean(input.window_ref ?? input.windowRef),
    locator: input.locator ?? null,
  };
}

function normalizeDependency(value) {
  const input = objectOrNull(value);
  if (!input) return null;
  return {
    group: clean(input.group ?? input.dependency_group ?? input.dependencyGroup),
    relation: clean(input.relation ?? input.dependency_relation ?? input.dependencyRelation),
    window_ref: clean(input.window_ref ?? input.windowRef),
    occurrence_ref: clean(input.occurrence_ref ?? input.occurrenceRef),
    depends_on: uniqStrings(input.depends_on ?? input.dependsOn),
    notes: clean(input.notes),
  };
}

function normalizeRobustness(value) {
  const input = objectOrNull(value);
  if (!input) return null;
  return {
    state: clean(input.state),
    protocol: clean(input.protocol),
    perturbations_tested: integerOrNull(input.perturbations_tested ?? input.perturbationsTested),
    result: input.result ?? null,
    unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason),
  };
}

function normalizeCompletion(value) {
  const input = objectOrNull(value);
  if (!input) return null;
  return {
    state: clean(input.state),
    complete: typeof input.complete === 'boolean' ? input.complete : null,
    truncated: typeof input.truncated === 'boolean' ? input.truncated : null,
    continuation: input.continuation ?? null,
    stop_reason: clean(input.stop_reason ?? input.stopReason),
  };
}

function normalizeReplay(value) {
  const input = objectOrNull(value);
  if (!input) return null;
  return {
    replayable: typeof input.replayable === 'boolean' ? input.replayable : null,
    run_id: clean(input.run_id ?? input.runId),
    input_ref: clean(input.input_ref ?? input.inputRef),
    source_ref: clean(input.source_ref ?? input.sourceRef),
    engine_ref: clean(input.engine_ref ?? input.engineRef),
    version_refs: uniqStrings(input.version_refs ?? input.versionRefs),
    parameters: objectOrNull(input.parameters) || null,
    random_seed: clean(input.random_seed ?? input.randomSeed),
    generator_version: clean(input.generator_version ?? input.generatorVersion),
    unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason),
  };
}

/**
 * Stable additive envelope used by Pattern/Sequence, ELS, Method/Rule applications and unknown future
 * capabilities. Missing information remains null/unknown. Normalization never manufactures
 * expectedness, independence, controls or replayability.
 */
export function normalizeResearchEvaluation(value = null, { operatorRef = null } = {}) {
  const input = objectOrNull(value);
  const normalizedOperatorRef = normalizeOperatorRef(input?.operator_ref ?? input?.operatorRef ?? operatorRef);
  if (!input && !normalizedOperatorRef) return null;
  return {
    contract_version: RESEARCH_EVALUATION_CONTRACT_VERSION,
    operator_ref: normalizedOperatorRef,
    selection: normalizeSelection(input?.selection),
    search_space: normalizeSearchSpace(input?.search_space ?? input?.searchSpace),
    expectedness: normalizeExpectedness(input?.expectedness),
    controls: normalizeControls(input?.controls),
    location: normalizeLocation(input?.location),
    dependency: normalizeDependency(input?.dependency),
    robustness: normalizeRobustness(input?.robustness),
    competing_patterns: array(input?.competing_patterns ?? input?.competingPatterns),
    completion: normalizeCompletion(input?.completion),
    replay: normalizeReplay(input?.replay),
  };
}

export default normalizeResearchEvaluation;
