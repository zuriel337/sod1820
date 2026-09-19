import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeNumericRelations, runNumericPatternWorkbench } from './numericPatternWorkbench.js';
import { fibonacciSequenceAdapter } from './fibonacciSequence.js';
import { SEQUENCE_OPERATION } from './sequenceLens.js';

const find = (relations, kind, predicate = () => true) => relations.find(r => r.kind === kind && predicate(r));

test('detects Amit 768 -> 888 -> 1008 equal-step symmetry', () => {
  const out = analyzeNumericRelations([768, 888, 1008, 120]);
  const rel = find(out.relations, 'arithmetic_progression', r => r.values.join(',') === '768,888,1008');
  assert.ok(rel);
  assert.equal(rel.step, 120);
  assert.equal(rel.midpoint, 888);
});

test('detects balanced 1744 / 2116 / 2488 and 4232 additive closure', () => {
  const out = analyzeNumericRelations([1744, 2116, 2488, 4232]);
  assert.ok(find(out.relations, 'arithmetic_progression', r => r.values.join(',') === '1744,2116,2488' && r.step === 372));
  assert.ok(find(out.relations, 'additive_identity', r => r.operands.join(',') === '1744,2488' && r.result === 4232));
  assert.ok(find(out.relations, 'additive_identity', r => r.operands.join(',') === '2116,2116' && r.result === 4232));
});

test('detects 141 + 610 = 751 and 137 + 751 = 888', () => {
  const out = analyzeNumericRelations([137, 141, 610, 751, 888]);
  assert.ok(find(out.relations, 'additive_identity', r => r.operands.join(',') === '141,610' && r.result === 751));
  assert.ok(find(out.relations, 'additive_identity', r => r.operands.join(',') === '137,751' && r.result === 888));
});

test('detects scaled Pythagorean triple 666/888/1110', () => {
  const out = analyzeNumericRelations([666, 888, 1110]);
  const rel = find(out.relations, 'pythagorean_triple');
  assert.deepEqual(rel.values, [666, 888, 1110]);
  assert.equal(rel.scale, 222);
  assert.deepEqual(rel.primitive, [3, 4, 5]);
});

test('detects elementary symmetric pair-products 8/20/26 -> 160/208/520 -> 888', () => {
  const out = analyzeNumericRelations([8, 20, 26, 160, 208, 520, 888]);
  const rel = find(out.relations, 'symmetric_pair_products', r => r.e2 === 888);
  assert.deepEqual(rel.bases, [8, 20, 26]);
  assert.deepEqual(rel.pair_products, [160, 208, 520]);
  assert.equal(rel.e2_present, true);
});

test('detects common factor 296 and Fibonacci coefficient pattern input', () => {
  const out = analyzeNumericRelations([888, 1480, 2368]);
  const rel = find(out.relations, 'common_factor_projection');
  assert.equal(rel.common_factor, 296);
  assert.deepEqual(rel.coefficients, [3, 5, 8]);
});

test('Fibonacci adapter owns Zeckendorf decomposition instead of a duplicate engine', async () => {
  const out = await fibonacciSequenceAdapter.execute({
    query: '888',
    operation: SEQUENCE_OPERATION.ZECKENDORF,
    budget: { maxSearchDepth: 100, windowRadius: 3, maxOccurrences: 10 },
  });
  assert.equal(out.status, 'ok');
  assert.equal(out.result.decomposition.complete, true);
  assert.deepEqual(out.result.decomposition.terms.map(x => Number(x.term)), [610, 233, 34, 8, 3]);
});

test('workbench reuses Pi/Fibonacci adapters and detects the 535/58 overlap', async () => {
  const out = await runNumericPatternWorkbench([535, 58], { piSearchDepth: 100 });
  const a = out.sequences.pi.find(x => x.value === 535);
  const b = out.sequences.pi.find(x => x.value === 58);
  assert.equal(a.first_position, 8);
  assert.equal(b.first_position, 10);
  assert.ok(out.sequences.pi_overlaps.some(x => x.values.includes(535) && x.values.includes(58) && x.overlap_start === 10));
});

test('workbench detects consecutive Fibonacci indices without duplicating the Fibonacci adapter', async () => {
  const out = await runNumericPatternWorkbench([233, 377, 610], { piSearchDepth: 100 });
  assert.ok(out.sequences.fibonacci_consecutive_groups.some(g =>
    g.values.join(',') === '233,377,610' && g.positions.join(',') === '13,14,15'
  ));
});
