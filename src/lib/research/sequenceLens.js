const DEFAULT_SEQUENCE_BUDGET = Object.freeze({ maxSearchDepth: 25000, maxOccurrences: 25, windowRadius: 12 });

export const SEQUENCE_REPRESENTATION = Object.freeze({ DIGIT_STREAM: 'digit_stream', TERM_SEQUENCE: 'term_sequence' });
export const SEQUENCE_OPERATION = Object.freeze({
  FIRST: 'exact_digit_sequence_first_occurrence',
  ALL: 'exact_digit_sequence_all_occurrences',
  TERM_FIRST: 'exact_term_first_occurrence',
  TERM_ALL: 'exact_term_all_occurrences',
});

function positiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

export function createSequenceRegistry(adapters = []) {
  const registry = new Map();
  for (const adapter of adapters) {
    if (!adapter?.sequenceId || typeof adapter.execute !== 'function') throw new Error('Invalid sequence adapter');
    if (registry.has(adapter.sequenceId)) throw new Error(`Duplicate sequence adapter: ${adapter.sequenceId}`);
    registry.set(adapter.sequenceId, adapter);
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
  const sequenceId = String(request.sequenceId || '').trim();
  const adapter = registry?.get?.(sequenceId);
  if (!adapter) return { status: 'error', error: 'SEQUENCE_ADAPTER_NOT_REGISTERED', sequence_id: sequenceId || null };
  const budget = normalizeSequenceBudget(request.budget, adapter);
  const operation = request.operation || adapter.defaultOperation || null;
  return adapter.execute({ ...request, operation, budget });
}
