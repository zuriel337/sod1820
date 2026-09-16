export const NUMBER_MATH_PROFILE_VERSION = 'number-math-profile-v1';

export const DEFAULT_NUMBER_MATH_BUDGET = Object.freeze({
  maxFactorChecks: 200000,
});

const OEIS = Object.freeze({
  prime: 'A000040',
  triangular: 'A000217',
  square: 'A000290',
  pentagonal: 'A000326',
  hexagonal: 'A000384',
  heptagonal: 'A000566',
  octagonal: 'A000567',
  cube: 'A000578',
  power_of_two: 'A000079',
  palindrome_base10: 'A002113',
  perfect: 'A000396',
  abundant: 'A005101',
  deficient: 'A005100',
  semiprime: 'A001358',
  harshad_base10: 'A005349',
  happy_base10: 'A007770',
  narcissistic_base10: 'A005188',
});

const FIGURATE = Object.freeze([
  { sides: 3, key: 'triangular', label: 'Triangular', oeis: OEIS.triangular },
  { sides: 4, key: 'square', label: 'Square', oeis: OEIS.square },
  { sides: 5, key: 'pentagonal', label: 'Pentagonal', oeis: OEIS.pentagonal },
  { sides: 6, key: 'hexagonal', label: 'Hexagonal', oeis: OEIS.hexagonal },
  { sides: 7, key: 'heptagonal', label: 'Heptagonal', oeis: OEIS.heptagonal },
  { sides: 8, key: 'octagonal', label: 'Octagonal', oeis: OEIS.octagonal },
]);

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

function boundedPositiveInteger(value, fallback, max = 1000000) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function jsonInteger(value) {
  const n = typeof value === 'bigint' ? value : BigInt(value);
  return n <= MAX_SAFE_BIGINT ? Number(n) : n.toString();
}

function bigIntSqrt(value) {
  const n = BigInt(value);
  if (n < 0n) throw new RangeError('square root of negative integer');
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  while (true) {
    const y = (x + n / x) >> 1n;
    if (y >= x) return x;
    x = y;
  }
}

function perfectSquareRoot(value) {
  const n = BigInt(value);
  if (n < 0n) return null;
  const root = bigIntSqrt(n);
  return root * root === n ? root : null;
}

function modPow(base, exponent, modulus) {
  let b = BigInt(base) % modulus;
  let e = BigInt(exponent);
  let result = 1n;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus;
    e >>= 1n;
    b = (b * b) % modulus;
  }
  return result;
}

export function isPrimeSafeInteger(input) {
  const nNumber = Number(input);
  if (!Number.isSafeInteger(nNumber) || nNumber < 2) return false;
  const n = BigInt(nNumber);
  const small = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  if (small.includes(n)) return true;
  for (const p of small) if (n % p === 0n) return false;

  let d = n - 1n;
  let s = 0;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s += 1;
  }

  // Deterministic for unsigned 64-bit integers, therefore also for JS safe integers (< 2^53).
  const bases = [2n, 325n, 9375n, 28178n, 450775n, 9780504n, 1795265022n];
  for (const raw of bases) {
    const a = raw % n;
    if (a === 0n) continue;
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let witness = true;
    for (let r = 1; r < s; r += 1) {
      x = (x * x) % n;
      if (x === n - 1n) {
        witness = false;
        break;
      }
    }
    if (witness) return false;
  }
  return true;
}

export function factorIntegerBounded(input, options = {}) {
  const n = Number(input);
  if (!Number.isSafeInteger(n) || n < 0) throw new TypeError('number must be a non-negative safe integer');
  const maxFactorChecks = boundedPositiveInteger(options.maxFactorChecks, DEFAULT_NUMBER_MATH_BUDGET.maxFactorChecks);
  if (n < 2) return { complete: true, factors: [], residual: null, checks: 0, max_factor_checks: maxFactorChecks };
  if (isPrimeSafeInteger(n)) {
    return { complete: true, factors: [{ prime: n, exponent: 1 }], residual: null, checks: 0, max_factor_checks: maxFactorChecks };
  }

  let m = n;
  let checks = 0;
  const factors = [];
  const add = (prime) => {
    let exponent = 0;
    while (m % prime === 0) {
      m /= prime;
      exponent += 1;
    }
    if (exponent) factors.push({ prime, exponent });
  };

  add(2);
  let d = 3;
  while (d * d <= m && checks < maxFactorChecks) {
    checks += 1;
    if (m % d === 0) add(d);
    d += 2;
  }

  if (m === 1) return { complete: true, factors, residual: null, checks, max_factor_checks: maxFactorChecks };
  if (isPrimeSafeInteger(m)) {
    factors.push({ prime: m, exponent: 1 });
    return { complete: true, factors, residual: null, checks, max_factor_checks: maxFactorChecks };
  }
  return { complete: false, factors, residual: m, checks, max_factor_checks: maxFactorChecks };
}

function arithmeticFromFactors(n, factorization) {
  if (n === 0) {
    return { divisor_count: null, divisor_sum: null, proper_divisor_sum: null, totient: null, abundance_class: null, semiprime: null };
  }
  if (!factorization.complete) {
    return { divisor_count: null, divisor_sum: null, proper_divisor_sum: null, totient: null, abundance_class: null, semiprime: null };
  }

  let divisorCount = 1n;
  let divisorSum = 1n;
  let totient = BigInt(n);
  let factorMultiplicity = 0;
  for (const { prime, exponent } of factorization.factors) {
    const p = BigInt(prime);
    const e = BigInt(exponent);
    divisorCount *= e + 1n;
    divisorSum *= (p ** (e + 1n) - 1n) / (p - 1n);
    totient = (totient / p) * (p - 1n);
    factorMultiplicity += exponent;
  }
  const proper = divisorSum - BigInt(n);
  const abundanceClass = proper === BigInt(n) ? 'perfect' : proper > BigInt(n) ? 'abundant' : 'deficient';
  return {
    divisor_count: jsonInteger(divisorCount),
    divisor_sum: jsonInteger(divisorSum),
    proper_divisor_sum: jsonInteger(proper),
    totient: jsonInteger(totient),
    abundance_class: abundanceClass,
    semiprime: n >= 4 && factorMultiplicity === 2,
  };
}

function polygonalIndex(n, sides) {
  if (!Number.isSafeInteger(n) || n < 0 || sides < 3) return null;
  // The OEIS polygonal families referenced by this adapter use a(0)=0. The quadratic
  // inverse has two roots at zero for sides > 4, so handle the shared zero term explicitly.
  if (n === 0) return 0;
  const s = BigInt(sides);
  const N = BigInt(n);
  const d = (s - 4n) ** 2n + 8n * (s - 2n) * N;
  const root = perfectSquareRoot(d);
  if (root == null) return null;
  const numerator = (s - 4n) + root;
  const denominator = 2n * (s - 2n);
  if (numerator < 0n || numerator % denominator !== 0n) return null;
  const k = numerator / denominator;
  const check = ((s - 2n) * k * k - (s - 4n) * k) / 2n;
  return check === N ? jsonInteger(k) : null;
}

function cubeIndex(n) {
  if (n < 0) return null;
  const N = BigInt(n);
  let lo = 0n;
  let hi = 1n;
  while (hi ** 3n < N) hi <<= 1n;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1n;
    const cube = mid ** 3n;
    if (cube === N) return jsonInteger(mid);
    if (cube < N) lo = mid + 1n;
    else hi = mid - 1n;
  }
  return null;
}

function digitInfo(n) {
  const text = String(n);
  const digits = [...text].map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  const product = digits.reduce((a, b) => a * b, 1);
  const reversedText = [...text].reverse().join('');
  const reversed = Number(reversedText);
  let digitalRoot = n === 0 ? 0 : 1 + ((n - 1) % 9);
  if (!Number.isSafeInteger(digitalRoot)) digitalRoot = null;
  const palindrome = text === reversedText;
  // We expose the useful multi-digit visual family only. Single decimal digits trivially have
  // equal digits, but labeling every 0..9 as a repdigit would add no research information.
  const repdigit = text.length > 1 && digits.every(d => d === digits[0]);
  const harshad = n > 0 && sum > 0 ? n % sum === 0 : null;
  const narcissisticSum = digits.reduce((acc, d) => acc + BigInt(d) ** BigInt(digits.length), 0n);
  const narcissistic = narcissisticSum === BigInt(n);

  let happyValue = n;
  const seen = new Set();
  while (happyValue !== 1 && !seen.has(happyValue)) {
    seen.add(happyValue);
    happyValue = String(happyValue).split('').reduce((acc, d) => acc + Number(d) ** 2, 0);
  }

  return {
    base: 10,
    digits: text.length,
    digit_sum: sum,
    digit_product: product,
    digital_root: digitalRoot,
    reversed: Number.isSafeInteger(reversed) ? reversed : reversedText,
    palindrome,
    repdigit,
    repdigit_min_digits: 2,
    harshad,
    narcissistic,
    happy: happyValue === 1,
  };
}

function family(key, label, category, details = {}, oeis = null) {
  return {
    key,
    label,
    category,
    details,
    // This is a static definition/catalog pointer. The adapter never claims that the external
    // page was fetched or used as evidence for this individual execution.
    reference: oeis ? { provider: 'OEIS', id: oeis, source_ref: `OEIS:${oeis}`, role: 'definition_pointer_unfetched' } : null,
  };
}

function normalizeBudget(input = {}) {
  return {
    maxFactorChecks: boundedPositiveInteger(input.maxFactorChecks, DEFAULT_NUMBER_MATH_BUDGET.maxFactorChecks),
  };
}

export function analyzeNumberMath(numberInput, options = {}) {
  const number = Number(numberInput);
  if (!Number.isSafeInteger(number) || number < 0) throw new TypeError('number must be a non-negative safe integer');
  const budget = normalizeBudget(options.budget || {});
  const prime = isPrimeSafeInteger(number);
  const classification = number === 0 ? 'zero' : number === 1 ? 'unit' : prime ? 'prime' : 'composite';
  const factorization = factorIntegerBounded(number, budget);
  const arithmetic = arithmeticFromFactors(number, factorization);
  const digits = digitInfo(number);
  const figurate = FIGURATE.map(shape => ({ ...shape, index: polygonalIndex(number, shape.sides) })).filter(x => x.index !== null);
  const cube = cubeIndex(number);
  const powerOfTwo = number >= 1 && (BigInt(number) & (BigInt(number) - 1n)) === 0n;
  const powerOfTwoExponent = powerOfTwo ? BigInt(number).toString(2).length - 1 : null;

  const families = [];
  if (prime) families.push(family('prime', 'Prime', 'arithmetic', {}, OEIS.prime));
  for (const shape of figurate) families.push(family(shape.key, shape.label, 'figurate', { sides: shape.sides, index: shape.index }, shape.oeis));
  if (cube !== null) families.push(family('cube', 'Cube', 'figurate', { index: cube }, OEIS.cube));
  if (powerOfTwo) families.push(family('power_of_two', 'Power of two', 'power', { exponent: powerOfTwoExponent }, OEIS.power_of_two));
  if (arithmetic.abundance_class) families.push(family(arithmetic.abundance_class, arithmetic.abundance_class[0].toUpperCase() + arithmetic.abundance_class.slice(1), 'divisor', {}, OEIS[arithmetic.abundance_class]));
  if (arithmetic.semiprime === true) families.push(family('semiprime', 'Semiprime', 'factorization', {}, OEIS.semiprime));
  if (digits.palindrome) families.push(family('palindrome_base10', 'Palindrome (base 10)', 'digit', {}, OEIS.palindrome_base10));
  if (digits.repdigit) families.push(family('repdigit_base10_multi_digit', 'Repdigit (base 10, 2+ digits)', 'digit', { minimum_digits: 2 }));
  if (digits.harshad === true) families.push(family('harshad_base10', 'Harshad / Niven (base 10)', 'digit', { digit_sum: digits.digit_sum }, OEIS.harshad_base10));
  if (digits.happy) families.push(family('happy_base10', 'Happy (base 10)', 'digit', {}, OEIS.happy_base10));
  if (digits.narcissistic) families.push(family('narcissistic_base10', 'Narcissistic / Armstrong (base 10)', 'digit', {}, OEIS.narcissistic_base10));
  if (prime && digits.palindrome) families.push(family('palindromic_prime_base10', 'Palindromic prime (base 10)', 'derived_composite_family', { depends_on: ['prime', 'palindrome_base10'] }));

  return {
    status: 'ok',
    capability: 'number_math_profile',
    profile_version: NUMBER_MATH_PROFILE_VERSION,
    input: { type: 'number', value: number },
    arithmetic: {
      classification,
      prime,
      factorization,
      ...arithmetic,
    },
    digit_structure: digits,
    figurate,
    powers: {
      square_root: figurate.find(x => x.key === 'square')?.index ?? null,
      cube_root: cube,
      power_of_two: powerOfTwo,
      power_of_two_exponent: powerOfTwoExponent,
    },
    families,
    coverage: {
      deterministic: true,
      factorization_complete: factorization.complete,
      factorization_bounded: !factorization.complete,
      search_budget: budget,
      sequence_membership: 'delegated_to_sequence_adapters',
      external_reference_lookup: 'not_executed',
    },
    provenance: {
      engine: 'number-math-profile',
      engine_version: NUMBER_MATH_PROFILE_VERSION,
      algorithm: 'deterministic-local-integer-classification',
      input_ref: options.provenance?.inputRef || null,
      request_source: options.provenance?.requestSource || null,
      generated_at: options.provenance?.generatedAt || new Date().toISOString(),
    },
  };
}
