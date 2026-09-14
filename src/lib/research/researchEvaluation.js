import { normalizeEvidenceLineage } from './researchDependency.js';

// G2 2029 — maximal research-evaluation transport for the existing Result Bundle.
// Semantics are owned by research_strategy_layer_law v13. No truth/statistics/dependency/replay engine here.

export const RESEARCH_EVALUATION_CONTRACT_VERSION = 1;
export const SELECTION_PROTOCOL = Object.freeze({
  SOURCE_CLAIM_REPLAY: 'source_claim_replay',
  PRE_REGISTERED_TARGET: 'pre_registered_target',
  HYPOTHESIS_DRIVEN_FOLLOWUP: 'hypothesis_driven_followup',
  POST_HOC_EXPLORATORY: 'post_hoc_exploratory',
  UNKNOWN: 'unknown',
});
export const CONTROL_STATE = Object.freeze({
  EXECUTED: 'executed',
  PARTIAL: 'partial',
  UNAVAILABLE: 'unavailable',
  NOT_REQUIRED: 'not_required',
  UNKNOWN: 'unknown',
});
const VALID_SELECTION_PROTOCOL = new Set(Object.values(SELECTION_PROTOCOL));
const VALID_CONTROL_STATE = new Set(Object.values(CONTROL_STATE));

const clean = v => v == null ? null : (String(v).trim() || null);
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : null;
const arr = v => Array.isArray(v) ? v : [];
const uniq = v => [...new Set(arr(v).map(clean).filter(Boolean))];

function finiteNumber(value, label) {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(`researchEvaluation: ${label} must be finite when supplied`);
  return n;
}
function integer(value, label, { min = null } = {}) {
  const n = finiteNumber(value, label);
  if (n == null) return null;
  if (!Number.isInteger(n) || (min != null && n < min)) {
    throw new TypeError(`researchEvaluation: ${label} must be an integer${min != null ? ` >= ${min}` : ''}`);
  }
  return n;
}
function probability(value, label) {
  const n = finiteNumber(value, label);
  if (n == null) return null;
  if (n < 0 || n > 1) throw new TypeError(`researchEvaluation: ${label} must be between 0 and 1`);
  return n;
}

export function normalizeOperatorRef(ref) {
  if (ref == null) return null;
  const value = obj(ref);
  if (!value) throw new TypeError('researchEvaluation: malformed owner-qualified operator_ref');
  const owner = clean(value.owner), capabilityKey = clean(value.capability_key ?? value.capabilityKey);
  const operatorId = clean(value.operator_id ?? value.operatorId), version = clean(value.version);
  if (!owner || !capabilityKey || !operatorId || !version) throw new TypeError('researchEvaluation: malformed owner-qualified operator_ref');
  return { type: clean(value.type) || 'research_operator', owner, capability_key: capabilityKey, operator_id: operatorId, version };
}

function normalizeAccess(value) {
  const input = obj(value); return input ? { tier: clean(input.tier), reason: clean(input.reason) } : null;
}
function normalizeSelection(value) {
  const input = obj(value); if (!input) return null;
  const protocol = clean(input.protocol) || SELECTION_PROTOCOL.UNKNOWN;
  if (!VALID_SELECTION_PROTOCOL.has(protocol)) throw new TypeError(`researchEvaluation: invalid selection protocol "${protocol}"`);
  const fixedBeforeInspection = typeof input.fixed_before_inspection === 'boolean'
    ? input.fixed_before_inspection
    : typeof input.fixedBeforeInspection === 'boolean' ? input.fixedBeforeInspection : null;
  // Protocol class and timing fact must never contradict each other. A target cannot be both
  // pre-registered and explicitly chosen after inspection, nor post-hoc and fixed beforehand.
  if (protocol === SELECTION_PROTOCOL.PRE_REGISTERED_TARGET && fixedBeforeInspection === false) {
    throw new TypeError('researchEvaluation: pre_registered_target cannot declare fixed_before_inspection=false');
  }
  if (protocol === SELECTION_PROTOCOL.POST_HOC_EXPLORATORY && fixedBeforeInspection === true) {
    throw new TypeError('researchEvaluation: post_hoc_exploratory cannot declare fixed_before_inspection=true');
  }
  return {
    protocol,
    target_ref: clean(input.target_ref ?? input.targetRef),
    provenance_ref: clean(input.provenance_ref ?? input.provenanceRef),
    fixed_before_inspection: fixedBeforeInspection,
    reason: clean(input.reason),
  };
}
function normalizeSearchSpace(value) {
  const input = obj(value); if (!input) return null; const m = obj(input.multiplicity);
  return {
    declared: input.declared ?? null, effective: input.effective ?? null, tested: input.tested ?? null,
    dimensions: obj(input.dimensions) || {}, budget: obj(input.budget) || null,
    multiplicity: m ? {
      targets: integer(m.targets, 'multiplicity.targets', { min: 0 }),
      operators: integer(m.operators, 'multiplicity.operators', { min: 0 }),
      windows: integer(m.windows, 'multiplicity.windows', { min: 0 }),
      languages: integer(m.languages, 'multiplicity.languages', { min: 0 }),
      transforms: integer(m.transforms, 'multiplicity.transforms', { min: 0 }),
      cohorts: integer(m.cohorts, 'multiplicity.cohorts', { min: 0 }),
      total_tests: integer(m.total_tests ?? m.totalTests, 'multiplicity.total_tests', { min: 0 }),
      known_complete: typeof m.known_complete === 'boolean' ? m.known_complete : typeof m.knownComplete === 'boolean' ? m.knownComplete : null,
    } : null,
    unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason),
  };
}
function normalizeExpectedness(value) {
  const input = obj(value); if (!input) return null;
  return {
    state: clean(input.state ?? input.expectedness),
    model: clean(input.model ?? input.expectedness_model ?? input.expectednessModel),
    base_rate: probability(input.base_rate ?? input.baseRate, 'expectedness.base_rate'),
    assumptions: arr(input.assumptions).map(String),
    unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason),
  };
}
function normalizeControls(value) {
  return arr(value).map((control) => {
    const x = obj(control);
    if (!x) throw new TypeError('researchEvaluation: every control entry must be an object');
    return {
      // Missing provenance identity stays null. Never manufacture "control:1".
      control_id: clean(x.control_id ?? x.controlId),
      type: clean(x.type),
      model: clean(x.model),
      result: x.result ?? null,
      seed: clean(x.seed),
      version: clean(x.version),
      provenance_ref: clean(x.provenance_ref ?? x.provenanceRef),
    };
  });
}
function normalizeControlsState(value) {
  const input = obj(value); if (!input) return null;
  const status = clean(input.status) || CONTROL_STATE.UNKNOWN;
  if (!VALID_CONTROL_STATE.has(status)) throw new TypeError(`researchEvaluation: invalid controls_state status "${status}"`);
  return { status, reason: clean(input.reason), model: clean(input.model), coverage: input.coverage ?? null };
}
function normalizeLocation(value) {
  const input = obj(value); if (!input) return null; const native = obj(input.native), canonical = obj(input.canonical), span = obj(input.span);
  const point = x => x ? { convention: clean(x.convention), start: integer(x.start, 'location.start'), end: integer(x.end, 'location.end'), locator: x.locator ?? null } : null;
  return { native: point(native), canonical: point(canonical), reconciliation_state: clean(input.reconciliation_state ?? input.reconciliationState), reconciliation: input.reconciliation ?? null, span: span ? { start: integer(span.start, 'location.span.start'), end: integer(span.end, 'location.span.end'), unit: clean(span.unit) } : null, window_ref: clean(input.window_ref ?? input.windowRef), locator: input.locator ?? null };
}
function normalizeDependency(value) {
  const input = obj(value); if (!input) return null;
  const lineage = normalizeEvidenceLineage(input);
  return {
    group: lineage?.explicit_group || null,
    relation: lineage?.relation || 'unknown',
    root_input_ref: lineage?.root_input_ref || null,
    representation_ref: lineage?.representation_ref || null,
    occurrence_ref: lineage?.occurrence_ref || null,
    window_ref: lineage?.window_ref || null,
    artifact_refs: lineage?.artifact_refs || [],
    source_lineage_refs: lineage?.source_lineage_refs || [],
    parent_refs: lineage?.parent_refs || [],
    depends_on: uniq(input.depends_on ?? input.dependsOn),
    notes: lineage?.notes || clean(input.notes),
  };
}
function normalizeRobustness(value) {
  const input = obj(value); return input ? { state: clean(input.state), protocol: clean(input.protocol), perturbations_tested: integer(input.perturbations_tested ?? input.perturbationsTested, 'robustness.perturbations_tested', { min: 0 }), result: input.result ?? null, unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason) } : null;
}
function normalizeCompletion(value) {
  const input = obj(value); if (!input) return null;
  const complete = typeof input.complete === 'boolean' ? input.complete : null;
  const truncated = typeof input.truncated === 'boolean' ? input.truncated : null;
  const continuation = input.continuation ?? null;
  if (complete === true && truncated === true) throw new TypeError('researchEvaluation: completion cannot be both complete=true and truncated=true');
  if (complete === true && continuation != null) throw new TypeError('researchEvaluation: complete=true cannot carry a continuation');
  return { state: clean(input.state), complete, truncated, continuation, stop_reason: clean(input.stop_reason ?? input.stopReason) };
}
function normalizeReplay(value) {
  const input = obj(value); if (!input) return null;
  const replayable = typeof input.replayable === 'boolean' ? input.replayable : null;
  const out = {
    replayable,
    run_id: clean(input.run_id ?? input.runId),
    input_ref: clean(input.input_ref ?? input.inputRef),
    source_ref: clean(input.source_ref ?? input.sourceRef),
    engine_ref: clean(input.engine_ref ?? input.engineRef),
    version_refs: uniq(input.version_refs ?? input.versionRefs),
    parameters: obj(input.parameters) || null,
    random_seed: clean(input.random_seed ?? input.randomSeed),
    generator_version: clean(input.generator_version ?? input.generatorVersion),
    unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason),
  };
  if (replayable === true) {
    if (!out.input_ref || (!out.source_ref && !out.engine_ref) || !out.version_refs.length || !out.parameters) {
      throw new TypeError('researchEvaluation: replayable=true requires input_ref, source_ref/engine_ref, version_refs and parameters');
    }
  }
  return out;
}

export function normalizeResearchEvaluation(value = null, { operatorRef = null } = {}) {
  const input = obj(value); const normalizedOperatorRef = normalizeOperatorRef(input?.operator_ref ?? input?.operatorRef ?? operatorRef);
  if (!input && !normalizedOperatorRef) return null;
  return {
    contract_version: RESEARCH_EVALUATION_CONTRACT_VERSION,
    operator_ref: normalizedOperatorRef,
    access: normalizeAccess(input?.access),
    selection: normalizeSelection(input?.selection),
    search_space: normalizeSearchSpace(input?.search_space ?? input?.searchSpace),
    expectedness: normalizeExpectedness(input?.expectedness),
    controls: normalizeControls(input?.controls),
    controls_state: normalizeControlsState(input?.controls_state ?? input?.controlsState),
    location: normalizeLocation(input?.location),
    dependency: normalizeDependency(input?.dependency),
    robustness: normalizeRobustness(input?.robustness),
    competing_patterns: arr(input?.competing_patterns ?? input?.competingPatterns),
    completion: normalizeCompletion(input?.completion),
    replay: normalizeReplay(input?.replay),
  };
}

export default normalizeResearchEvaluation;
