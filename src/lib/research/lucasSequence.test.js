import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequenceRegistry, runSequenceLens } from './sequenceLens.js';
import { lucasIndexForValue, lucasSequenceAdapter, lucasTerms } from './lucasSequence.js';

test('Lucas helper uses canonical L0=2, L1=1 zero-based indexing', () => {
  assert.deepEqual(lucasTerms(9).map(Number), [2, 1, 3, 4, 7, 11, 18, 29, 47]);
  assert.equal(lucasIndexForValue(11), 5);
  assert.equal(lucasIndexForValue(47), 8);
  assert.equal(lucasIndexForValue(48), null);
});

test('Lucas sequence adapter exposes deterministic term positions', async () => {
  const registry = createSequenceRegistry([lucasSequenceAdapter]);
  const out = await runSequenceLens(registry, { sequenceId: 'lucas', query: '47' });
  assert.equal(out.status, 'ok');
  assert.equal(out.result.found, true);
  assert.equal(out.result.first_position, 8);
  assert.equal(out.position_convention, 'zero_based_terms_L0_2_L1_1');
  assert.equal(out.verification.state, 'deterministic_computation');
});
