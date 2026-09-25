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

test('canonical live-shape fixture derives relations from current fn_method_profile outputs', () => {
  // Captured from canonical Supabase fn_method_profile('צוריאל פולייס','value') on 2026-09-25.
  // This fixture verifies adapter logic only; runtime truth still comes from the live RPC.
  const profile = [
    row('רגיל', 533),
    row('גדול', 533),
    row('סידורי', 137),
    row('מיקום האות', 137),
    row('אלבם', 1118),
    row('אותיות לפני', 777),
    row('קדמי', 2368),
    row('משולש גדול', 2368),
    row('הכפלה', 60273),
    row('הכפלה גדולה', 60273),
    row('ריבוע', 2172),
    row('ריבוע גדול', 2172),
    row('משולש מילה+משולש הפוך', 6929, { atomicOrComposite: 'composite' }),
  ];

  const out = buildGematriaMathFingerprint({ expression: 'צוריאל פולייס', methodProfile: profile });

  const multiple = out.relations.find(x => x.type === 'exact_multiple' && x.from.value === 533 && x.to.value === 6929);
  assert.equal(multiple.multiplier, 13);
  assert.deepEqual(multiple.retained_prime_factors, [13, 41]);

  const factor13 = out.relations.find(x => x.type === 'shared_prime_factor' && x.prime_factor === 13);
  assert.deepEqual(factor13.members.map(x => x.value).sort((a, b) => a - b), [533, 1118, 6929]);

  const factor37 = out.relations.find(x => x.type === 'shared_prime_factor' && x.prime_factor === 37);
  assert.deepEqual(factor37.members.map(x => x.value).sort((a, b) => a - b), [777, 2368, 60273]);

  const factor181 = out.relations.find(x => x.type === 'shared_prime_factor' && x.prime_factor === 181);
  assert.deepEqual(factor181.members.map(x => x.value).sort((a, b) => a - b), [2172, 60273]);

  for (const value of [533, 137, 2368, 60273, 2172]) {
    const duplicate = out.relations.find(x => x.type === 'same_numeric_result_across_methods' && x.value === value);
    assert.equal(duplicate.methods.length, 2);
    assert.equal(duplicate.counts_as_independent_evidence, false);
  }
  assert.equal(out.truth_boundary.relation_is_not_research_convergence, true);
});

test('external/raw payload compatibility still detects its math without claiming canonical Gematria truth', () => {
  // Compatibility fixture from a supplied external/raw report. Several values currently DRIFT
  // from canonical fn_method_profile and therefore must never be labeled engine-verified by this test.
  const profile = [
    row('raw:regular', 533),
    row('raw:final', 533),
    row('raw:ordinal', 137),
    row('raw:reduced', 47),
    row('raw:small-finals', 47),
    row('raw:word-reduced', 11),
    row('raw:reverse-ordinal', 139),
    row('raw:one-step-zero', 65),
    row('raw:albam', 1118),
    row('raw:kidmi', 2368),
    row('raw:perati', 60273),
    row('raw:achorayim', 2172),
    row('raw:running-returning', 3811),
    row('raw:add-subtract', 3731),
  ];

  const out = buildGematriaMathFingerprint({ expression: 'צוריאל פולייס', methodProfile: profile });
  const multiple = out.relations.find(x => x.type === 'exact_multiple' && x.from.value === 533 && x.to.value === 3731);
  assert.equal(multiple.multiplier, 7);

  const twin = out.relations.find(x => x.type === 'twin_prime_pair');
  assert.deepEqual(twin.members.map(x => x.value), [137, 139]);

  const lucas = out.relations.find(x => x.type === 'shared_sequence_family' && x.sequence_id === 'lucas');
  assert.deepEqual(lucas.members.map(x => [x.value, x.notation]).sort((a, b) => a[0] - b[0]), [[11, 'L5'], [47, 'L8']]);

  assert.equal(out.source.expected_profile_source, 'fn_method_profile');
  assert.equal(out.truth_boundary.numeric_results_must_arrive_from_canonical_gematria_engine, true);
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
