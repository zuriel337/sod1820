import { SEQUENCE_OPERATION, SEQUENCE_REPRESENTATION } from './sequenceLens.js';

const SOURCE = Object.freeze({
  id: 'fibonacci',
  version: 'iterative-bigint-f1-f2-v1',
  algorithm: 'Iterative BigInt Fibonacci generation',
  representation: SEQUENCE_REPRESENTATION.TERM_SEQUENCE,
  positionConvention: 'one_based_terms_F1_1_F2_1',
  maxSearchDepth: 10000,
});

function fibonacciTerms(depth) {
  const n = Math.max(1, Math.min(Number(depth) || 1, SOURCE.maxSearchDepth));
  const out = [];
  let a = 1n;
  let b = 1n;
  for (let i = 0; i < n; i += 1) {
    out.push(a);
    [a, b] = [b, a + b];
  }
  return out;
}

function termWindow(terms, zeroIndex, radius) {
  if (zeroIndex < 0) return null;
  const start = Math.max(0, zeroIndex - radius);
  const end = Math.min(terms.length, zeroIndex + radius + 1);
  return {
    start_position: start + 1,
    end_position: end,
    terms: terms.slice(start, end).map(String),
  };
}

export const fibonacciSequenceAdapter = Object.freeze({
  sequenceId: SOURCE.id,
  sequenceVersion: SOURCE.version,
  representationKind: SOURCE.representation,
  positionConvention: SOURCE.positionConvention,
  maxSearchDepth: SOURCE.maxSearchDepth,
  defaultOperation: SEQUENCE_OPERATION.TERM_FIRST,
  operations: Object.freeze([SEQUENCE_OPERATION.TERM_FIRST, SEQUENCE_OPERATION.TERM_ALL]),
  async execute(request = {}) {
    const query = String(request.query ?? '').trim();
    if (!/^\d+$/.test(query)) return { status: 'error', error: 'QUERY_MUST_BE_NON_NEGATIVE_INTEGER', sequence_id: SOURCE.id };
    const target = BigInt(query);
    const operation = request.operation || SEQUENCE_OPERATION.TERM_FIRST;
    if (![SEQUENCE_OPERATION.TERM_FIRST, SEQUENCE_OPERATION.TERM_ALL].includes(operation)) {
      return { status: 'error', error: 'OPERATION_NOT_SUPPORTED', sequence_id: SOURCE.id, operation };
    }

    const searchDepth = request.budget?.maxSearchDepth || SOURCE.maxSearchDepth;
    const terms = fibonacciTerms(searchDepth);
    const occurrences = [];
    for (let i = 0; i < terms.length; i += 1) {
      if (terms[i] === target) {
        occurrences.push(i + 1);
        if (operation === SEQUENCE_OPERATION.TERM_FIRST) break;
        if (occurrences.length >= (request.budget?.maxOccurrences || 25)) break;
      }
      if (terms[i] > target && target > 1n) break;
    }
    const firstPosition = occurrences[0] ?? null;

    return {
      status: 'ok',
      sequence_id: SOURCE.id,
      sequence_version: SOURCE.version,
      representation_kind: SOURCE.representation,
      query,
      operation,
      position_convention: SOURCE.positionConvention,
      search_depth: searchDepth,
      result: {
        found: firstPosition !== null,
        first_position: firstPosition,
        occurrences: operation === SEQUENCE_OPERATION.TERM_ALL ? occurrences : undefined,
        surrounding_window: firstPosition ? termWindow(terms, firstPosition - 1, request.budget?.windowRadius || 12) : null,
      },
      verification: { state: 'deterministic_computation', algorithm: SOURCE.algorithm, verified: true },
      provenance: {
        request_source: request.provenance?.requestSource || null,
        input_ref: request.provenance?.inputRef || null,
        generated_at: request.provenance?.generatedAt || new Date().toISOString(),
        source: SOURCE,
      },
    };
  },
});
