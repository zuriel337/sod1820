import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeNumberMath, factorIntegerBounded, isPrimeSafeInteger } from './numberMathProfile.js';

const familyKeys = profile => profile.families.map(x => x.key);

test('496 is exactly factored, perfect, triangular and not promoted beyond deterministic math facts', () => {
  const p = analyzeNumberMath(496, { provenance: { generatedAt: '2026-09-17T00:00:00.000Z' } });
  assert.equal(p.arithmetic.factorization.complete, true);
  assert.deepEqual(p.arithmetic.factorization.factors, [{ prime: 2, exponent: 4 }, { prime: 31, exponent: 1 }]);
  assert.equal(p.arithmetic.proper_divisor_sum, 496);
  assert.equal(p.arithmetic.abundance_class, 'perfect');
  assert.equal(p.figurate.find(x => x.key === 'triangular')?.index, 31);
  assert.ok(familyKeys(p).includes('perfect'));
  assert.ok(familyKeys(p).includes('triangular'));
  assert.equal(p.coverage.external_reference_lookup, 'not_executed');
});

test('101 is a palindromic prime with exact deterministic classification', () => {
  const p = analyzeNumberMath(101);
  assert.equal(p.arithmetic.classification, 'prime');
  assert.equal(p.digit_structure.palindrome, true);
  assert.ok(familyKeys(p).includes('prime'));
  assert.ok(familyKeys(p).includes('palindrome_base10'));
  assert.ok(familyKeys(p).includes('palindromic_prime_base10'));
  assert.equal(p.families.find(x => x.key === 'prime').reference.source_ref, 'OEIS:A000040');
});

test('256 exposes power, square, factorization and divisor facts', () => {
  const p = analyzeNumberMath(256);
  assert.equal(p.powers.square_root, 16);
  assert.equal(p.powers.cube_root, null);
  assert.equal(p.powers.power_of_two, true);
  assert.equal(p.powers.power_of_two_exponent, 8);
  assert.deepEqual(p.arithmetic.factorization.factors, [{ prime: 2, exponent: 8 }]);
  assert.equal(p.arithmetic.totient, 128);
  assert.ok(familyKeys(p).includes('square'));
  assert.ok(familyKeys(p).includes('power_of_two'));
});

test('777 is a repdigit and Harshad number without treating digit properties as interpretation', () => {
  const p = analyzeNumberMath(777);
  assert.equal(p.digit_structure.repdigit, true);
  assert.equal(p.digit_structure.digit_sum, 21);
  assert.equal(p.digit_structure.harshad, true);
  assert.ok(familyKeys(p).includes('repdigit_base10'));
  assert.ok(familyKeys(p).includes('harshad_base10'));
});

test('153 is triangular, narcissistic and Harshad', () => {
  const p = analyzeNumberMath(153);
  assert.equal(p.figurate.find(x => x.key === 'triangular')?.index, 17);
  assert.equal(p.digit_structure.narcissistic, true);
  assert.equal(p.digit_structure.harshad, true);
  assert.ok(familyKeys(p).includes('narcissistic_base10'));
});

test('1237 primality is exact for safe integers', () => {
  assert.equal(isPrimeSafeInteger(1237), true);
  assert.equal(analyzeNumberMath(1237).arithmetic.classification, 'prime');
});

test('bounded factorization reports incomplete coverage rather than fabricating divisor families', () => {
  const value = 1000003 * 1000033;
  const factorization = factorIntegerBounded(value, { maxFactorChecks: 10 });
  assert.equal(factorization.complete, false);
  const p = analyzeNumberMath(value, { budget: { maxFactorChecks: 10 } });
  assert.equal(p.coverage.factorization_bounded, true);
  assert.equal(p.arithmetic.abundance_class, null);
  assert.equal(p.arithmetic.semiprime, null);
  assert.equal(familyKeys(p).includes('semiprime'), false);
});

test('zero and one preserve honest edge semantics', () => {
  const zero = analyzeNumberMath(0);
  const one = analyzeNumberMath(1);
  assert.equal(zero.arithmetic.classification, 'zero');
  assert.equal(zero.arithmetic.abundance_class, null);
  assert.equal(one.arithmetic.classification, 'unit');
  assert.equal(one.arithmetic.abundance_class, 'deficient');
  assert.equal(one.digit_structure.happy, true);
});
