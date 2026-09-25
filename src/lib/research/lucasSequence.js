import { SEQUENCE_OPERATION, SEQUENCE_REPRESENTATION } from './sequenceLens.js';

const SOURCE = Object.freeze({
  id: 'lucas',
  version: 'iterative-bigint-l0-l1-v1',
  algorithm: 'Iterative BigInt Lucas generation',
  representation: SEQUENCE_REPRESENTATION.TERM_SEQUENCE,
  positionConvention: 'zero_based_terms_L0_2_L1_1',
  maxSearchDepth: 10000,
});

export function lucasTerms(depth) {
  const n = Math.max(1, Math.min(Number(depth) || 1, SOURCE.maxSearchDepth));
  const out = [];
  let a = 2n;
  let b = 1n;
  for (let i = 0; i < n; i += 1) {
    out.push(a);
    [a, b] = [b, a + b];
  }
  return out;
}

export function lucasIndexForValue(input, maxSearchDepth = SOURCE.maxSearchDepth) {
  const query = String(input ?? '').trim();
  if (!/^\d+$/.test(query)) return null;
  const target = BigInt(query);
  const terms = lucasTerms(maxSearchDepth);
  for (let i = 0; i < terms.length; i += 1) {
    if (terms[i] === target) return i;
    if (i >= 2 && terms[i] > target) return null;
  }
  return null;
}

function termWindow(terms, zeroIndex, radius) {
  if (zeroIndex < 0) return null;
  const start = Math.max(0, zeroIndex - radius);
  const end = Math.min(terms.length, zeroIndex + radius + 1);
  return {
    start_position: start,
    end_position: Math.max(start, end - 1),
    terms: terms.slice(start, end).map(String),
  };
}

export const lucasSequenceAdapter = Object.freeze({
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
    const terms = lucasTerms(searchDepth);
    const occurrences = [];
    for (let i = 0; i < terms.length; i += 1) {
      if (terms[i] === target) {
        occurrences.push(i);
        if (operation === SEQUENCE_OPERATION.TERM_FIRST) break;
        if (occurrences.length >= (request.budget?.maxOccurrences || 25)) break;
      }
      if (i >= 2 && terms[i] > target) break;
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
        surrounding_window: firstPosition !== null ? termWindow(terms, firstPosition, request.budget?.windowRadius || 12) : null,
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
