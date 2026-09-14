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
const VALID_SELECTION_PROTOCOL = new Set(Object.values(SELECTION_PROTOCOL));

const clean = v => v == null ? null : (String(v).trim() || null);
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : null;
const arr = v => Array.isArray(v) ? v : [];
const uniq = v => [...new Set(arr(v).map(clean).filter(Boolean))];
const num = v => v == null ? null : (Number.isFinite(Number(v)) ? Number(v) : null);
const integer = v => Number.isInteger(num(v)) ? num(v) : null;

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
  return {
    protocol, target_ref: clean(input.target_ref ?? input.targetRef), provenance_ref: clean(input.provenance_ref ?? input.provenanceRef),
    fixed_before_inspection: typeof input.fixed_before_inspection === 'boolean' ? input.fixed_before_inspection : typeof input.fixedBeforeInspection === 'boolean' ? input.fixedBeforeInspection : null,
    reason: clean(input.reason),
  };
}
function normalizeSearchSpace(value) {
  const input = obj(value); if (!input) return null; const m = obj(input.multiplicity);
  return {
    declared: input.declared ?? null, effective: input.effective ?? null, tested: input.tested ?? null,
    dimensions: obj(input.dimensions) || {}, budget: obj(input.budget) || null,
    multiplicity: m ? {
      targets: integer(m.targets), operators: integer(m.operators), windows: integer(m.windows), languages: integer(m.languages), transforms: integer(m.transforms), cohorts: integer(m.cohorts),
      total_tests: integer(m.total_tests ?? m.totalTests), known_complete: typeof m.known_complete === 'boolean' ? m.known_complete : typeof m.knownComplete === 'boolean' ? m.knownComplete : null,
    } : null,
    unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason),
  };
}
function normalizeExpectedness(value) {
  const input = obj(value); if (!input) return null;
  return { state: clean(input.state ?? input.expectedness), model: clean(input.model ?? input.expectedness_model ?? input.expectednessModel), base_rate: num(input.base_rate ?? input.baseRate), assumptions: arr(input.assumptions).map(String), unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason) };
}
function normalizeControls(value) {
  return arr(value).map((c, i) => { const x = obj(c) || {}; return { control_id: clean(x.control_id ?? x.controlId) || `control:${i + 1}`, type: clean(x.type), model: clean(x.model), result: x.result ?? null, seed: clean(x.seed), version: clean(x.version), provenance_ref: clean(x.provenance_ref ?? x.provenanceRef) }; });
}
function normalizeLocation(value) {
  const input = obj(value); if (!input) return null; const native = obj(input.native), canonical = obj(input.canonical), span = obj(input.span);
  const point = x => x ? { convention: clean(x.convention), start: integer(x.start), end: integer(x.end), locator: x.locator ?? null } : null;
  return { native: point(native), canonical: point(canonical), reconciliation_state: clean(input.reconciliation_state ?? input.reconciliationState), reconciliation: input.reconciliation ?? null, span: span ? { start: integer(span.start), end: integer(span.end), unit: clean(span.unit) } : null, window_ref: clean(input.window_ref ?? input.windowRef), locator: input.locator ?? null };
}
function normalizeDependency(value) {
  const input = obj(value); if (!input) return null;
  return {
    group: clean(input.group ?? input.dependency_group ?? input.dependencyGroup),
    relation: clean(input.relation ?? input.dependency_relation ?? input.dependencyRelation),
    root_input_ref: clean(input.root_input_ref ?? input.rootInputRef),
    representation_ref: clean(input.representation_ref ?? input.representationRef),
    occurrence_ref: clean(input.occurrence_ref ?? input.occurrenceRef),
    window_ref: clean(input.window_ref ?? input.windowRef),
    artifact_refs: uniq(input.artifact_refs ?? input.artifactRefs),
    source_lineage_refs: uniq(input.source_lineage_refs ?? input.sourceLineageRefs),
    parent_refs: uniq(input.parent_refs ?? input.parentRefs),
    depends_on: uniq(input.depends_on ?? input.dependsOn),
    notes: clean(input.notes),
  };
}
function normalizeRobustness(value) {
  const input = obj(value); return input ? { state: clean(input.state), protocol: clean(input.protocol), perturbations_tested: integer(input.perturbations_tested ?? input.perturbationsTested), result: input.result ?? null, unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason) } : null;
}
function normalizeCompletion(value) {
  const input = obj(value); return input ? { state: clean(input.state), complete: typeof input.complete === 'boolean' ? input.complete : null, truncated: typeof input.truncated === 'boolean' ? input.truncated : null, continuation: input.continuation ?? null, stop_reason: clean(input.stop_reason ?? input.stopReason) } : null;
}
function normalizeReplay(value) {
  const input = obj(value); return input ? { replayable: typeof input.replayable === 'boolean' ? input.replayable : null, run_id: clean(input.run_id ?? input.runId), input_ref: clean(input.input_ref ?? input.inputRef), source_ref: clean(input.source_ref ?? input.sourceRef), engine_ref: clean(input.engine_ref ?? input.engineRef), version_refs: uniq(input.version_refs ?? input.versionRefs), parameters: obj(input.parameters) || null, random_seed: clean(input.random_seed ?? input.randomSeed), generator_version: clean(input.generator_version ?? input.generatorVersion), unavailable_reason: clean(input.unavailable_reason ?? input.unavailableReason) } : null;
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
    location: normalizeLocation(input?.location),
    dependency: normalizeDependency(input?.dependency),
    robustness: normalizeRobustness(input?.robustness),
    competing_patterns: arr(input?.competing_patterns ?? input?.competingPatterns),
    completion: normalizeCompletion(input?.completion),
    replay: normalizeReplay(input?.replay),
  };
}

export default normalizeResearchEvaluation;
