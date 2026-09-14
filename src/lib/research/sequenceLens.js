const DEFAULT_SEQUENCE_BUDGET = Object.freeze({ maxSearchDepth: 25000, maxOccurrences: 25, windowRadius: 12 });

export const SEQUENCE_REPRESENTATION = Object.freeze({ DIGIT_STREAM: 'digit_stream', TERM_SEQUENCE: 'term_sequence' });
export const SEQUENCE_OPERATION = Object.freeze({
  FIRST: 'exact_digit_sequence_first_occurrence',
  ALL: 'exact_digit_sequence_all_occurrences',
  TERM_FIRST: 'exact_term_first_occurrence',
  TERM_ALL: 'exact_term_all_occurrences',
});

// research_strategy_layer_law v13 owns these semantics. This is only the executable socket that
// requires every sequence/pattern adapter to identify itself well enough for owner-first routing,
// replay and future Method/Rule/Operator projections. It is NOT a Pattern registry or truth store.
export const OPERATOR_CONTRACT_VERSION = 1;
export const OPERATOR_EXECUTION_KIND = Object.freeze({
  DETERMINISTIC: 'deterministic',
  STATISTICAL: 'statistical',
  HYBRID: 'hybrid',
});
const VALID_OPERATOR_EXECUTION_KIND = new Set(Object.values(OPERATOR_EXECUTION_KIND));

function clean(value) {
  if (value == null) return '';
  return String(value).trim();
}

function positiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

/**
 * Normalize and validate the owner-qualified operator identity carried by one adapter.
 *
 * Stable identity = current canonical owner + capability key + operator id/version. The adapter
 * remains the implementation; this descriptor is only the semantic plug reference consumed by the
 * existing Research Plan / Result Bundle / Method Home composition. Unknown future operators can
 * therefore attach without editing central consumers merely to invent a new identity convention.
 */
export function describeSequenceOperator(adapter = {}) {
  const sequenceId = clean(adapter.sequenceId);
  const owner = clean(adapter.owner);
  const operatorFamily = clean(adapter.operatorFamily);
  const executionKind = clean(adapter.executionKind);
  const outputType = clean(adapter.outputType);
  const applicabilityBoundary = clean(adapter.applicabilityBoundary);
  const representationKind = clean(adapter.representationKind);
  const operatorVersion = clean(adapter.operatorVersion || adapter.sequenceVersion);
  const operatorId = clean(adapter.operatorId) || sequenceId;
  const capabilityKey = clean(adapter.capabilityKey) || (sequenceId ? `sequence:${sequenceId}` : '');
  const operations = Array.isArray(adapter.operations)
    ? [...new Set(adapter.operations.map(clean).filter(Boolean))]
    : [];

  const missing = [];
  if (!sequenceId) missing.push('sequenceId');
  if (!owner) missing.push('owner');
  if (!operatorFamily) missing.push('operatorFamily');
  if (!operatorVersion) missing.push('operatorVersion/sequenceVersion');
  if (!executionKind) missing.push('executionKind');
  if (!outputType) missing.push('outputType');
  if (!applicabilityBoundary) missing.push('applicabilityBoundary');
  if (!representationKind) missing.push('representationKind');
  if (!operations.length) missing.push('operations');
  if (typeof adapter.execute !== 'function') missing.push('execute');
  if (missing.length) throw new Error(`Invalid sequence operator contract: missing ${missing.join(', ')}`);
  if (!VALID_OPERATOR_EXECUTION_KIND.has(executionKind)) {
    throw new Error(`Invalid sequence operator contract: unsupported executionKind ${executionKind}`);
  }

  const defaultOperation = clean(adapter.defaultOperation);
  if (defaultOperation && !operations.includes(defaultOperation)) {
    throw new Error(`Invalid sequence operator contract: defaultOperation ${defaultOperation} is not declared in operations`);
  }

  const operatorRef = Object.freeze({
    type: 'research_operator',
    owner,
    capability_key: capabilityKey,
    operator_id: operatorId,
    version: operatorVersion,
  });

  return Object.freeze({
    contract_version: OPERATOR_CONTRACT_VERSION,
    operator_ref: operatorRef,
    operator_family: operatorFamily,
    execution_kind: executionKind,
    output_type: outputType,
    applicability_boundary: applicabilityBoundary,
    representation_kind: representationKind,
    supported_operations: Object.freeze(operations),
  });
}

export function createSequenceRegistry(adapters = []) {
  const registry = new Map();
  for (const adapter of adapters) {
    const operatorSpec = describeSequenceOperator(adapter);
    const sequenceId = clean(adapter.sequenceId);
    if (registry.has(sequenceId)) throw new Error(`Duplicate sequence adapter: ${sequenceId}`);
    registry.set(sequenceId, Object.freeze({ ...adapter, operatorSpec }));
  }
  return Object.freeze({
    get: id => registry.get(id) || null,
    list: () => [...registry.values()].map(({ execute, ...meta }) => meta),
  });
}

export function normalizeSequenceBudget(input = {}, adapter = {}) {
  const adapterMax = positiveInt(adapter.maxSearchDepth, DEFAULT_SEQUENCE_BUDGET.maxSearchDepth);
  return Object.freeze({
    maxSearchDepth: positiveInt(input.maxSearchDepth, Math.min(DEFAULT_SEQUENCE_BUDGET.maxSearchDepth, adapterMax), adapterMax),
    maxOccurrences: positiveInt(input.maxOccurrences, DEFAULT_SEQUENCE_BUDGET.maxOccurrences, 100),
    windowRadius: positiveInt(input.windowRadius, DEFAULT_SEQUENCE_BUDGET.windowRadius, 100),
  });
}

export async function runSequenceLens(registry, request = {}) {
  const sequenceId = clean(request.sequenceId);
  const adapter = registry?.get?.(sequenceId);
  if (!adapter) return { status: 'error', error: 'SEQUENCE_ADAPTER_NOT_REGISTERED', sequence_id: sequenceId || null };
  const budget = normalizeSequenceBudget(request.budget, adapter);
  const operation = request.operation || adapter.defaultOperation || null;
  const result = await adapter.execute({ ...request, operation, budget });
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return { status: 'error', error: 'SEQUENCE_ADAPTER_INVALID_RESULT', sequence_id: sequenceId || null };
  }
  return {
    ...result,
    operator_ref: adapter.operatorSpec.operator_ref,
    operator_contract_version: adapter.operatorSpec.contract_version,
  };
}
