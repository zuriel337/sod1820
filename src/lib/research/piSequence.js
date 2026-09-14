import { OPERATOR_EXECUTION_KIND, SEQUENCE_OPERATION, SEQUENCE_REPRESENTATION } from './sequenceLens.js';

const SOURCE = Object.freeze({
  id: 'pi',
  version: 'chudnovsky-bigint-v1',
  algorithm: 'Chudnovsky binary splitting + integer sqrt',
  representation: SEQUENCE_REPRESENTATION.DIGIT_STREAM,
  positionConvention: 'one_based_after_decimal_excludes_integer_part',
  maxSearchDepth: 25000,
});

const C3_OVER_24 = 10939058860032000n;
let cachedDigits = '';

function isqrt(n) {
  if (n < 0n) throw new Error('square root of negative');
  if (n < 2n) return n;
  let x0 = 1n << ((BigInt(n.toString(2).length) + 1n) >> 1n);
  let x1 = (x0 + n / x0) >> 1n;
  while (x1 < x0) { x0 = x1; x1 = (x0 + n / x0) >> 1n; }
  return x0;
}

function binarySplit(a, b) {
  if (b - a === 1) {
    let P = 1n, Q = 1n;
    if (a !== 0) {
      const A = BigInt(a);
      P = BigInt(6 * a - 5) * BigInt(2 * a - 1) * BigInt(6 * a - 1);
      Q = A * A * A * C3_OVER_24;
    }
    let T = P * BigInt(13591409 + 545140134 * a);
    if (a & 1) T = -T;
    return [P, Q, T];
  }
  const m = Math.floor((a + b) / 2);
  const [P1, Q1, T1] = binarySplit(a, m);
  const [P2, Q2, T2] = binarySplit(m, b);
  return [P1 * P2, Q1 * Q2, T1 * Q2 + P1 * T2];
}

export function piDigitsAfterDecimal(depth) {
  const n = Math.max(1, Math.min(Number(depth) || 1, SOURCE.maxSearchDepth));
  if (cachedDigits.length >= n) return cachedDigits.slice(0, n);
  const guard = 20;
  const precision = n + guard;
  const one = 10n ** BigInt(precision);
  const terms = Math.floor(precision / 14) + 2;
  const [, Q, T] = binarySplit(0, terms);
  const sqrtC = isqrt(10005n * one * one);
  const piScaled = (Q * 426880n * sqrtC) / T;
  cachedDigits = piScaled.toString().slice(1, 1 + n);
  return cachedDigits;
}

function windowAround(digits, zeroIndex, queryLength, radius) {
  if (zeroIndex < 0) return null;
  const start = Math.max(0, zeroIndex - radius);
  const end = Math.min(digits.length, zeroIndex + queryLength + radius);
  return { start_position: start + 1, end_position: end, digits: digits.slice(start, end) };
}

function uniformDigitExpectedness(query, depth) {
  const digits = String(query || '').length;
  const searchDepth = Number(depth);
  if (!Number.isSafeInteger(searchDepth) || searchDepth <= 0 || digits <= 0) {
    return {
      state: 'unknown',
      model: 'uniform_digit_stream_heuristic_v1',
      base_rate: null,
      assumptions: ['uniform independent digit-stream heuristic; not a proof of Pi normality'],
      unavailable_reason: 'invalid depth/query length for heuristic',
    };
  }
  const windows = Math.max(0, searchDepth - digits + 1);
  const singleWindowRate = 10 ** (-digits);
  const baseRate = windows === 0 ? 0 : 1 - Math.pow(1 - singleWindowRate, windows);
  const state = baseRate >= 0.95
    ? 'near_certain_under_uniform_digit_heuristic'
    : baseRate >= 0.5
      ? 'high_under_uniform_digit_heuristic'
      : baseRate >= 0.05
        ? 'moderate_under_uniform_digit_heuristic'
        : 'low_under_uniform_digit_heuristic';
  return {
    state,
    model: 'uniform_digit_stream_heuristic_v1',
    base_rate: baseRate,
    assumptions: ['uniform independent digit-stream heuristic; not a proof of Pi normality'],
    unavailable_reason: null,
  };
}

export const piSequenceAdapter = Object.freeze({
  sequenceId: SOURCE.id,
  sequenceVersion: SOURCE.version,
  owner: 'research_strategy_layer_law',
  operatorId: 'pi.exact_digit_sequence_search',
  operatorFamily: 'mathematical_constant_sequence',
  executionKind: OPERATOR_EXECUTION_KIND.DETERMINISTIC,
  outputType: 'sequence_occurrence',
  applicabilityBoundary: 'digits-only query against Pi fractional digit stream under the declared position convention',
  representationKind: SOURCE.representation,
  positionConvention: SOURCE.positionConvention,
  maxSearchDepth: SOURCE.maxSearchDepth,
  defaultOperation: SEQUENCE_OPERATION.FIRST,
  operations: Object.freeze([SEQUENCE_OPERATION.FIRST, SEQUENCE_OPERATION.ALL]),

  // Evaluation belongs to the operator adapter, never a central `if (pi)` branch. A future constant,
  // palindrome, modular or statistical operator can supply its own model through the same hook.
  async evaluate({ execution } = {}) {
    return {
      status: 'ok',
      expectedness: uniformDigitExpectedness(execution?.query, execution?.search_depth),
      controls: [],
      controls_state: {
        status: 'unknown',
        reason: 'no registered randomized/control run was executed by this deterministic Pi adapter',
      },
      robustness: null,
      competing_patterns: [],
    };
  },

  async execute(request = {}) {
    const query = String(request.query ?? '').trim();
    if (!/^\d+$/.test(query)) return { status: 'error', error: 'QUERY_MUST_BE_DIGITS', sequence_id: 'pi' };
    const operation = request.operation || SEQUENCE_OPERATION.FIRST;
    if (![SEQUENCE_OPERATION.FIRST, SEQUENCE_OPERATION.ALL].includes(operation)) return { status: 'error', error: 'OPERATION_NOT_SUPPORTED', sequence_id: 'pi', operation };
    const searchDepth = request.budget?.maxSearchDepth || SOURCE.maxSearchDepth;
    const digits = piDigitsAfterDecimal(searchDepth);
    const firstIndex = digits.indexOf(query);
    const occurrences = [];
    let occurrenceLimitReached = false;
    if (operation === SEQUENCE_OPERATION.ALL && firstIndex >= 0) {
      let from = 0;
      while (occurrences.length < request.budget.maxOccurrences) {
        const i = digits.indexOf(query, from);
        if (i < 0) break;
        occurrences.push(i + 1);
        from = i + 1;
      }
      // We can cheaply attest whether the cap hid another occurrence without materializing it.
      if (occurrences.length >= request.budget.maxOccurrences) {
        const nextFrom = (occurrences[occurrences.length - 1] || 1);
        occurrenceLimitReached = digits.indexOf(query, nextFrom) >= 0;
      }
    }
    const found = firstIndex >= 0;
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
        found,
        first_position: found ? firstIndex + 1 : null,
        occurrences: operation === SEQUENCE_OPERATION.ALL ? occurrences : undefined,
        occurrences_truncated: operation === SEQUENCE_OPERATION.ALL ? occurrenceLimitReached : false,
        surrounding_window: found ? windowAround(digits, firstIndex, query.length, request.budget?.windowRadius || 12) : null,
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
