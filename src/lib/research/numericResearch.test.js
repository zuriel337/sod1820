import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequenceRegistry, runSequenceLens, SEQUENCE_OPERATION } from './sequenceLens.js';
import { piSequenceAdapter, piDigitsAfterDecimal } from './piSequence.js';
import { fibonacciSequenceAdapter } from './fibonacciSequence.js';
import { researchNumber } from './numericResearch.js';

const sequenceBudget = { maxSearchDepth: 25000, windowRadius: 12, maxOccurrences: 10 };
const fakeRpc = async (name, args) => ({ data: name === 'fn_number_dossier' ? { facts: { convergences: [{ method: 'fixture' }] }, evidence: [] } : { value: args.p_value } });

test('pi uses one-based positions after decimal and matches a known prefix', () => {
  assert.equal(piDigitsAfterDecimal(50), '14159265358979323846264338327950288419716939937510');
});

test('golden 337 occurs first at pi position 230 and remains a traversable noncanonical candidate', async () => {
  const registry = createSequenceRegistry([piSequenceAdapter]);
  const finding = await runSequenceLens(registry, { sequenceId: 'pi', query: '337', budget: sequenceBudget, provenance: { generatedAt: '2026-08-26T20:00:00.000Z' } });
  assert.equal(finding.result.first_position, 230);
  const routed = await researchNumber(337, { rpc: fakeRpc, fetchResearchObjects: async () => ({ status: 'ok', data: [] }), lenses: ['number_lookup', 'number_dossier', 'research_objects', 'sequence:pi'], provenance: { requestSource: 'golden-test', generatedAt: '2026-08-26T20:00:00.000Z' } });
  assert.equal(routed.relation_candidates[0].to.value, 230);
  assert.equal(routed.relation_candidates[0].canonical, false);
  assert.equal(routed.universal_findings[0].stage, 'candidate');
  assert.equal(routed.derived_numeric_roots[0].root.value, 230);
  assert.equal(routed.derived_numeric_roots[0].traversable, true);
  assert.equal(routed.derived_numeric_roots[0].context.data.value, 230);
  assert.equal(routed.derived_numeric_roots[0].canonical, false);
  assert.equal(routed.truth_lifecycle.automatic_canonical_promotion, false);
});

test('1820 pi result is additive, bounded, and exposes position 24653 as a derived numeric root', async () => {
  const routed = await researchNumber(1820, { rpc: fakeRpc, lenses: ['sequence:pi'], budget: { sequence: sequenceBudget } });
  assert.equal(routed.per_lens['sequence:pi'].result.first_position, 24653);
  assert.equal(routed.per_lens['sequence:pi'].search_depth, 25000);
  assert.equal(routed.derived_numeric_roots[0].root.value, 24653);
  assert.equal(routed.derived_numeric_roots[0].derivation.from.value, 1820);
  assert.equal(routed.derived_numeric_roots[0].derivation.lens, 'sequence:pi');
});

test('3060 pi result does not replace existing Zvi convergence findings', async () => {
  const existing = [
    { statement: 'השגחה פרטית ×3=3060', value: 3060, engine_verified: true, source: 'zvi_full_corpus_pass' },
    { statement: '5 פעמים ברית(612)=3060', value: 3060, engine_verified: true, source: 'zvi_full_corpus_pass' },
    { statement: "180 פעמים טוב(17)=3060", value: 3060, engine_verified: true, source: 'zvi_full_corpus_pass' },
  ];
  const routed = await researchNumber(3060, { rpc: fakeRpc, fetchResearchObjects: async () => ({ status: 'ok', data: existing }), lenses: ['number_dossier', 'research_objects', 'sequence:pi'], budget: { sequence: sequenceBudget } });
  assert.equal(routed.per_lens['sequence:pi'].result.first_position, 5679);
  assert.deepEqual(routed.per_lens.research_objects.data, existing);
  assert.equal(routed.relation_candidates.length, 1);
  assert.equal(routed.derived_numeric_roots[0].root.value, 5679);
  assert.equal(routed.truth_lifecycle.automatic_publication, false);
});

test('Fibonacci adapter owns its term operation and position convention', async () => {
  const registry = createSequenceRegistry([fibonacciSequenceAdapter]);
  const finding = await runSequenceLens(registry, { sequenceId: 'fibonacci', query: '233', budget: { maxSearchDepth: 50, maxOccurrences: 10, windowRadius: 3 } });
  assert.equal(finding.operation, SEQUENCE_OPERATION.TERM_FIRST);
  assert.equal(finding.position_convention, 'one_based_terms_F1_1_F2_1');
  assert.equal(finding.result.first_position, 13);
  assert.deepEqual(finding.result.surrounding_window.terms, ['55', '89', '144', '233', '377', '610', '987']);
});

test('Fibonacci preserves duplicate term identity for 1 under all-occurrences operation', async () => {
  const registry = createSequenceRegistry([fibonacciSequenceAdapter]);
  const finding = await runSequenceLens(registry, { sequenceId: 'fibonacci', query: '1', operation: SEQUENCE_OPERATION.TERM_ALL, budget: { maxSearchDepth: 20, maxOccurrences: 10, windowRadius: 2 } });
  assert.deepEqual(finding.result.occurrences, [1, 2]);
});

test('Fibonacci routes through the same Router and exposes index 13 as a derived numeric root', async () => {
  const routed = await researchNumber(233, { rpc: fakeRpc, lenses: ['sequence:fibonacci'], budget: { sequence: { maxSearchDepth: 50, windowRadius: 3, maxOccurrences: 10 } } });
  assert.equal(routed.per_lens['sequence:fibonacci'].operation, SEQUENCE_OPERATION.TERM_FIRST);
  assert.equal(routed.per_lens['sequence:fibonacci'].result.first_position, 13);
  assert.equal(routed.per_lens['sequence:fibonacci:position_context'].data.value, 13);
  assert.equal(routed.relation_candidates[0].sequence_id, 'fibonacci');
  assert.equal(routed.relation_candidates[0].to.value, 13);
  assert.equal(routed.relation_candidates[0].canonical, false);
  assert.equal(routed.derived_numeric_roots[0].root.value, 13);
  assert.equal(routed.derived_numeric_roots[0].derivation.lens, 'sequence:fibonacci');
  assert.equal(routed.derived_numeric_roots[0].context.data.value, 13);
});

test('non-Fibonacci numeric roots remain verified not-found, not fabricated relations or derived roots', async () => {
  const routed = await researchNumber(337, { rpc: fakeRpc, lenses: ['sequence:fibonacci'], budget: { sequence: { maxSearchDepth: 50 } } });
  assert.equal(routed.per_lens['sequence:fibonacci'].result.found, false);
  assert.equal(routed.relation_candidates.length, 0);
  assert.equal(routed.derived_numeric_roots.length, 0);
  assert.equal(routed.truth_lifecycle.automatic_canonical_promotion, false);
});

test('a future term sequence can still be injected without Router source edits', async () => {
  const fixture = {
    sequenceId: 'term-fixture', representationKind: 'term_sequence', maxSearchDepth: 100,
    defaultOperation: SEQUENCE_OPERATION.TERM_FIRST,
    async execute(request) { return { status: 'ok', sequence_id: 'term-fixture', sequence_version: 'fixture-v1', representation_kind: 'term_sequence', query: request.query, operation: request.operation, search_depth: 100, result: { found: false, first_position: null }, verification: { verified: true }, provenance: { generated_at: 'fixture' } }; },
  };
  const routed = await researchNumber(337, { rpc: fakeRpc, lenses: ['sequence:term-fixture'], sequenceAdapters: [fixture] });
  assert.equal(routed.per_lens['sequence:term-fixture'].operation, SEQUENCE_OPERATION.TERM_FIRST);
  assert.equal(routed.per_lens['sequence:term-fixture'].representation_kind, 'term_sequence');
  assert.equal(routed.derived_numeric_roots.length, 0);
});
