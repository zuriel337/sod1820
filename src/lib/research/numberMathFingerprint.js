import { analyzeNumberMath } from './numberMathProfile.js';
import { lucasIndexForValue } from './lucasSequence.js';

export const NUMBER_MATH_FINGERPRINT_VERSION = 'number-math-fingerprint-v1';
export const DEFAULT_NUMBER_MATH_FINGERPRINT_BUDGET = Object.freeze({
  maxPrimeOrdinalValue: 1000000,
  maxLucasDepth: 10000,
  centeredPolygonSidesMin: 3,
  centeredPolygonSidesMax: 12,
});

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

function jsonInteger(value) {
  if (value == null) return null;
  const n = typeof value === 'bigint' ? value : BigInt(value);
  return n <= MAX_SAFE_BIGINT ? Number(n) : n.toString();
}

function gcdBigInt(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

function lcmBigInt(a, b) {
  if (a === 0n || b === 0n) return 0n;
  return (a / gcdBigInt(a, b)) * b;
}

function bigIntSqrt(value) {
  const n = BigInt(value);
  if (n < 0n) return null;
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  while (true) {
    const y = (x + n / x) >> 1n;
    if (y >= x) return x;
    x = y;
  }
}

function radicalFromFactors(n, factorization) {
  if (n === 0 || !factorization?.complete) return null;
  if (n === 1) return 1;
  return jsonInteger((factorization.factors || []).reduce((acc, item) => acc * BigInt(item.prime), 1n));
}

function carmichaelPrimePower(prime, exponent) {
  const p = BigInt(prime);
  const e = BigInt(exponent);
  if (p === 2n && exponent >= 3) return 2n ** BigInt(exponent - 2);
  return (p - 1n) * (p ** (e - 1n));
}

function carmichaelFromFactors(n, factorization) {
  if (n === 0 || !factorization?.complete) return null;
  if (n === 1) return 1;
  let lambda = 1n;
  for (const { prime, exponent } of factorization.factors || []) {
    lambda = lcmBigInt(lambda, carmichaelPrimePower(prime, exponent));
  }
  return jsonInteger(lambda);
}

function primeCountUpTo(n) {
  if (n < 2) return 0;
  const composite = new Uint8Array(n + 1);
  let count = 0;
  for (let i = 2; i <= n; i += 1) {
    if (composite[i]) continue;
    count += 1;
    if (i * i <= n) {
      for (let j = i * i; j <= n; j += i) composite[j] = 1;
    }
  }
  return count;
}

function ordinalPosition(n, classification, budget) {
  if (classification !== 'prime' && classification !== 'composite') {
    return { kind: null, index: null, complete: true, bounded: false };
  }
  if (n > budget.maxPrimeOrdinalValue) {
    return {
      kind: classification,
      index: null,
      complete: false,
      bounded: true,
      max_value: budget.maxPrimeOrdinalValue,
    };
  }
  const pi = primeCountUpTo(n);
  return {
    kind: classification,
    index: classification === 'prime' ? pi : n - 1 - pi,
    complete: true,
    bounded: false,
    prime_count_through_n: pi,
  };
}

function centeredPolygonalIndex(n, sides) {
  if (!Number.isSafeInteger(n) || n < 1 || !Number.isInteger(sides) || sides < 3) return null;
  if (n === 1) return 1;
  const s = BigInt(sides);
  const N = BigInt(n);
  const discriminant = s * s + 8n * s * (N - 1n);
  const root = bigIntSqrt(discriminant);
  if (root == null || root * root !== discriminant) return null;
  const numerator = s + root;
  const denominator = 2n * s;
  if (numerator % denominator !== 0n) return null;
  const k = numerator / denominator;
  if (k < 1n) return null;
  const check = 1n + (s * k * (k - 1n)) / 2n;
  return check === N ? jsonInteger(k) : null;
}

function normalizeBudget(input = {}) {
  const maxPrimeOrdinalValue = Number.isSafeInteger(Number(input.maxPrimeOrdinalValue)) && Number(input.maxPrimeOrdinalValue) > 1
    ? Math.min(Number(input.maxPrimeOrdinalValue), 5000000)
    : DEFAULT_NUMBER_MATH_FINGERPRINT_BUDGET.maxPrimeOrdinalValue;
  const maxLucasDepth = Number.isSafeInteger(Number(input.maxLucasDepth)) && Number(input.maxLucasDepth) > 0
    ? Math.min(Number(input.maxLucasDepth), 10000)
    : DEFAULT_NUMBER_MATH_FINGERPRINT_BUDGET.maxLucasDepth;
  const centeredPolygonSidesMin = Math.max(3, Number(input.centeredPolygonSidesMin) || DEFAULT_NUMBER_MATH_FINGERPRINT_BUDGET.centeredPolygonSidesMin);
  const centeredPolygonSidesMax = Math.min(24, Math.max(centeredPolygonSidesMin, Number(input.centeredPolygonSidesMax) || DEFAULT_NUMBER_MATH_FINGERPRINT_BUDGET.centeredPolygonSidesMax));
  return { maxPrimeOrdinalValue, maxLucasDepth, centeredPolygonSidesMin, centeredPolygonSidesMax };
}

export function buildNumberMathFingerprint(numberInput, options = {}) {
  const number = Number(numberInput);
  if (!Number.isSafeInteger(number) || number < 0) throw new TypeError('number must be a non-negative safe integer');
  const budget = normalizeBudget(options.budget || {});
  const profile = options.profile || analyzeNumberMath(number, options);
  const factorization = profile?.arithmetic?.factorization || null;
  const radical = radicalFromFactors(number, factorization);
  const carmichael = carmichaelFromFactors(number, factorization);
  const ordinal = ordinalPosition(number, profile?.arithmetic?.classification, budget);
  const centered = [];
  if (number > 1) {
    for (let sides = budget.centeredPolygonSidesMin; sides <= budget.centeredPolygonSidesMax; sides += 1) {
      const index = centeredPolygonalIndex(number, sides);
      if (index != null) centered.push({ sides, index, notation: 'C' + sides + '(' + index + ')' });
    }
  }
  const lucasIndex = lucasIndexForValue(number, budget.maxLucasDepth);

  return {
    status: 'ok',
    capability: 'number_math_profile',
    fingerprint_version: NUMBER_MATH_FINGERPRINT_VERSION,
    input: { type: 'number', value: number },
    profile,
    symbols: {
      phi: profile?.arithmetic?.totient ?? null,
      tau: profile?.arithmetic?.divisor_count ?? null,
      sigma: profile?.arithmetic?.divisor_sum ?? null,
      lambda: carmichael,
      radical,
    },
    ordinal,
    forms: {
      centered_polygonal: centered,
      lucas: lucasIndex == null ? null : {
        sequence_id: 'lucas',
        index: lucasIndex,
        notation: 'L' + lucasIndex,
        position_convention: 'zero_based_terms_L0_2_L1_1',
      },
    },
    coverage: {
      deterministic: true,
      factorization_complete: profile?.coverage?.factorization_complete ?? null,
      prime_ordinal_complete: ordinal.complete,
      prime_ordinal_bound: budget.maxPrimeOrdinalValue,
      lucas_search_depth: budget.maxLucasDepth,
      centered_polygon_sides: [budget.centeredPolygonSidesMin, budget.centeredPolygonSidesMax],
    },
    truth_boundary: {
      mathematical_fact: true,
      research_convergence: false,
      interpretation: false,
      canonical: false,
      published: false,
    },
    provenance: {
      engine: 'number-math-profile',
      adapter: NUMBER_MATH_FINGERPRINT_VERSION,
      profile_version: profile?.profile_version || null,
      generated_at: options.provenance?.generatedAt || profile?.provenance?.generated_at || new Date().toISOString(),
    },
  };
}
