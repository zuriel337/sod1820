import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNumberMathFingerprint } from './numberMathFingerprint.js';

test('533 reproduces the mathematical passport used by the Gematria interpretation', () => {
  const f = buildNumberMathFingerprint(533);
  assert.equal(f.symbols.phi, 480);
  assert.equal(f.symbols.tau, 4);
  assert.equal(f.symbols.sigma, 588);
  assert.equal(f.symbols.lambda, 120);
  assert.equal(f.symbols.radical, 533);
  assert.equal(f.ordinal.kind, 'composite');
  assert.equal(f.ordinal.index, 433);
  assert.deepEqual(f.profile.arithmetic.factorization.factors, [{ prime: 13, exponent: 1 }, { prime: 41, exponent: 1 }]);
});

test('prime ordinal and Lucas forms are deterministic', () => {
  const p137 = buildNumberMathFingerprint(137);
  const p47 = buildNumberMathFingerprint(47);
  const p11 = buildNumberMathFingerprint(11);
  assert.equal(p137.ordinal.kind, 'prime');
  assert.equal(p137.ordinal.index, 33);
  assert.equal(p47.ordinal.index, 15);
  assert.equal(p47.forms.lucas.notation, 'L8');
  assert.equal(p11.forms.lucas.notation, 'L5');
});

test('radical collapses repeated prime powers and centered polygon forms are exact', () => {
  assert.equal(buildNumberMathFingerprint(716).symbols.radical, 358);
  assert.equal(buildNumberMathFingerprint(3332).symbols.radical, 238);
  assert.ok(buildNumberMathFingerprint(545).forms.centered_polygonal.some(x => x.notation === 'C4(17)'));
  assert.ok(buildNumberMathFingerprint(11).forms.centered_polygonal.some(x => x.notation === 'C10(2)'));
});

test('prime/composite ordinal fails bounded instead of pretending coverage', () => {
  const f = buildNumberMathFingerprint(1000003, { budget: { maxPrimeOrdinalValue: 1000 } });
  assert.equal(f.ordinal.kind, 'prime');
  assert.equal(f.ordinal.index, null);
  assert.equal(f.ordinal.complete, false);
  assert.equal(f.coverage.prime_ordinal_complete, false);
});
