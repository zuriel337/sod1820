import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGematriaMathFingerprint } from './gematriaMathFingerprint.js';

const row = (methodKey, computedValue, extra = {}) => ({
  methodKey,
  displayLabel: methodKey,
  computedValue,
  definitionVersion: 1,
  atomicOrComposite: 'atomic',
  ...extra,
});

test('cross-method fingerprint finds the structural relations in the צוריאל פולייס fixture', () => {
  const profile = [
    row('רגיל', 533),
    row('סופיות', 533),
    row('סדרי', 137),
    row('קטן', 47),
    row('קטן סופי', 47),
    row('מצומצמת', 11),
    row('סדרי הפוך', 139),
    row('אפס אחד', 65),
    row('אתבש', 742),
    row('אלבם', 1118),
    row('אבגד', 716),
    row('איק בכר', 3332),
    row('קדמי', 2368),
    row('פרטי', 60273),
    row('כולל', 534),
    row('מוספי', 545),
    row('אחור', 2172),
    row('מיקום', 1559),
    row('רצוא ושוב', 3811),
    row('תוספת ומגרעת', 3731),
    row('מילוי', 1160),
  ];

  const out = buildGematriaMathFingerprint({ expression: 'צוריאל פולייס', methodProfile: profile });
  const multiple = out.relations.find(x => x.type === 'exact_multiple' && x.from.value === 533 && x.to.value === 3731);
  assert.equal(multiple.multiplier, 7);
  assert.deepEqual(multiple.retained_prime_factors, [13, 41]);

  const factor13 = out.relations.find(x => x.type === 'shared_prime_factor' && x.prime_factor === 13);
  assert.deepEqual(factor13.members.map(x => x.value).sort((a, b) => a - b), [65, 533, 1118, 3731]);

  const factor37 = out.relations.find(x => x.type === 'shared_prime_factor' && x.prime_factor === 37);
  assert.deepEqual(factor37.members.map(x => x.value).sort((a, b) => a - b), [2368, 3811, 60273]);

  const factor181 = out.relations.find(x => x.type === 'shared_prime_factor' && x.prime_factor === 181);
  assert.deepEqual(factor181.members.map(x => x.value).sort((a, b) => a - b), [2172, 60273]);

  const twin = out.relations.find(x => x.type === 'twin_prime_pair');
  assert.deepEqual(twin.members.map(x => x.value), [137, 139]);

  const lucas = out.relations.find(x => x.type === 'shared_sequence_family' && x.sequence_id === 'lucas');
  assert.deepEqual(lucas.members.map(x => [x.value, x.notation]).sort((a, b) => a[0] - b[0]), [[11, 'L5'], [47, 'L8']]);

  const duplicate533 = out.relations.find(x => x.type === 'same_numeric_result_across_methods' && x.value === 533);
  assert.equal(duplicate533.methods.length, 2);
  assert.equal(duplicate533.counts_as_independent_evidence, false);
  assert.equal(out.truth_boundary.relation_is_not_research_convergence, true);
});

test('fingerprint collapses equal values before factor-frequency analysis', () => {
  const out = buildGematriaMathFingerprint({
    expression: 'x',
    methodProfile: [row('a', 533), row('b', 533), row('c', 65)],
  });
  const factor13 = out.relations.find(x => x.type === 'shared_prime_factor' && x.prime_factor === 13);
  assert.equal(factor13.member_count, 2);
  assert.deepEqual(factor13.members.map(x => x.value).sort((a, b) => a - b), [65, 533]);
});
