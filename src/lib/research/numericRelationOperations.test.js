import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NUMERIC_RELATION_OPERATION,
  NUMERIC_RELATION_OPERATION_CATALOG,
  analyzeNumericRelations,
  numericRelationsToUniversalFindings,
} from './numericRelationOperations.js';
import { fibonacciSequenceAdapter, zeckendorfDecomposition } from './fibonacciSequence.js';
import { SEQUENCE_OPERATION } from './sequenceLens.js';
import { buildResearchPlanV2 } from './researchPlanV2.js';
import { createCanonicalW2Executors } from './researchW2Executors.js';
import { CAPABILITY_STATUS, EVIDENCE_RELATION, SEMANTIC_CLASS } from './researchResultBundle.js';

const find = (relations, operationKey, predicate = () => true) =>
  relations.find(relation => relation.operation_key === operationKey && predicate(relation));

const numberIdentity = (value, access = null) => ({
  type: 'number',
  value,
  key: String(value),
  ref: String(value),
  source: 'numeric_literal',
  confidence: 'exact',
  ...(access ? { access } : {}),
});

const supabaseStub = {
  rpc: async () => ({ data: null }),
};

test('numeric relation operation catalog is stable, typed and not a Gematria registry', () => {
  assert.deepEqual(
    NUMERIC_RELATION_OPERATION_CATALOG.map(row => row.operation_key),
    [
      'additive_identity_v1',
      'arithmetic_progression_v1',
      'common_factor_projection_v1',
      'pythagorean_triple_v1',
      'symmetric_pair_products_v1',
      'fibonacci_zeckendorf_v1',
    ],
  );
  assert.equal(NUMERIC_RELATION_OPERATION_CATALOG.every(row => row.owner === 'research_strategy_layer_law'), true);
  assert.equal(NUMERIC_RELATION_OPERATION_CATALOG.every(row => row.semantic_class === 'derivation'), true);
  assert.equal(NUMERIC_RELATION_OPERATION_CATALOG.every(row => row.deterministic === true), true);
  assert.equal(NUMERIC_RELATION_OPERATION_CATALOG.every(row => /never a Gematria method/.test(row.truth_boundary)), true);
});

test('normalization never invents zero from blank or trailing separators', () => {
  const out = analyzeNumericRelations('444, 888,');
  assert.deepEqual(out.input, [444, 888]);
  assert.equal(out.input.includes(0), false);
  assert.equal(out.relations.some(relation => JSON.stringify(relation).includes('[0,')), false);
});

test('1382-1404-1426 is an equal-step series and a common-factor projection', () => {
  const out = analyzeNumericRelations([1382, 1404, 1426]);
  const progression = find(out.relations, NUMERIC_RELATION_OPERATION.ARITHMETIC_PROGRESSION);
  assert.deepEqual(progression.values, [1382, 1404, 1426]);
  assert.equal(progression.step, 22);
  assert.equal(progression.midpoint, 1404);

  const common = find(out.relations, NUMERIC_RELATION_OPERATION.COMMON_FACTOR_PROJECTION);
  assert.equal(common.common_factor, 2);
  assert.deepEqual(common.coefficients, [691, 702, 713]);
});

test('691-702-713 exposes the inner equal-step series', () => {
  const out = analyzeNumericRelations([691, 702, 713]);
  const progression = find(out.relations, NUMERIC_RELATION_OPERATION.ARITHMETIC_PROGRESSION);
  assert.deepEqual(progression.values, [691, 702, 713]);
  assert.equal(progression.step, 11);
  assert.equal(progression.midpoint, 702);
});

test('additive identities expose the 1404 center without inventing operands', () => {
  const out = analyzeNumericRelations([691, 702, 713, 1382, 1404, 1426]);
  assert.ok(find(out.relations, NUMERIC_RELATION_OPERATION.ADDITIVE_IDENTITY,
    relation => relation.operands[0] === 691 && relation.operands[1] === 691 && relation.result === 1382));
  assert.ok(find(out.relations, NUMERIC_RELATION_OPERATION.ADDITIVE_IDENTITY,
    relation => relation.operands[0] === 691 && relation.operands[1] === 713 && relation.result === 1404));
  assert.ok(find(out.relations, NUMERIC_RELATION_OPERATION.ADDITIVE_IDENTITY,
    relation => relation.operands[0] === 702 && relation.operands[1] === 702 && relation.result === 1404));
  assert.ok(find(out.relations, NUMERIC_RELATION_OPERATION.ADDITIVE_IDENTITY,
    relation => relation.operands[0] === 713 && relation.operands[1] === 713 && relation.result === 1426));
});

test('Amit 888/1480/2368 common factor projects to Fibonacci coefficients 3/5/8', () => {
  const out = analyzeNumericRelations([888, 1480, 2368]);
  const relation = find(out.relations, NUMERIC_RELATION_OPERATION.COMMON_FACTOR_PROJECTION);
  assert.equal(relation.common_factor, 296);
  assert.deepEqual(relation.coefficients, [3, 5, 8]);
});

test('symmetric pair-product engine recognizes A=8 B=20 C=26 and e2=888', () => {
  const out = analyzeNumericRelations([8, 20, 26, 160, 208, 520, 888]);
  const relation = find(out.relations, NUMERIC_RELATION_OPERATION.SYMMETRIC_PAIR_PRODUCTS,
    item => item.bases.join(',') === '8,20,26');
  assert.ok(relation);
  assert.deepEqual(relation.pair_products, [160, 208, 520]);
  assert.equal(relation.e2, 888);
  assert.equal(relation.e2_present, true);
});

test('Pythagorean engine reports primitive triple exactly', () => {
  const out = analyzeNumericRelations([3, 4, 5]);
  const relation = find(out.relations, NUMERIC_RELATION_OPERATION.PYTHAGOREAN_TRIPLE);
  assert.deepEqual(relation.values, [3, 4, 5]);
  assert.equal(relation.scale, 1);
  assert.deepEqual(relation.primitive, [3, 4, 5]);
});

test('Zeckendorf decomposition of 888 is deterministic and complete', async () => {
  const direct = zeckendorfDecomposition(888, 100);
  assert.equal(direct.complete, true);
  assert.equal(direct.sum, '888');
  assert.deepEqual(direct.terms.map(part => Number(part.term)), [610, 233, 34, 8, 3]);

  const viaAdapter = await fibonacciSequenceAdapter.execute({
    query: '888',
    operation: SEQUENCE_OPERATION.ZECKENDORF,
    budget: { maxSearchDepth: 100, maxOccurrences: 10, windowRadius: 8 },
  });
  assert.equal(viaAdapter.status, 'ok');
  assert.equal(viaAdapter.result.decomposition.complete, true);
  assert.deepEqual(viaAdapter.result.decomposition.terms.map(part => Number(part.term)), [610, 233, 34, 8, 3]);
});

test('numeric relation findings remain typed derivations with operation provenance', () => {
  const analysis = analyzeNumericRelations([691, 702, 713]);
  const findings = numericRelationsToUniversalFindings(analysis);
  assert.equal(findings.length > 0, true);
  const progression = findings.find(finding => finding.source.method === 'arithmetic_progression_v1');
  assert.ok(progression);
  assert.equal(progression.kind, 'numeric-relation');
  assert.equal(progression.stage, null);
  assert.equal(progression.status, null);
  assert.equal(progression.verification.verification_state, 'not_tested');
  assert.equal(progression.evidence.facts[0].operation_key, 'arithmetic_progression_v1');
  assert.match(progression.evidence.facts[0].boundary, /never a Gematria method/);
});

test('Research Plan requests numeric_relations for multiple number identities', () => {
  const plan = buildResearchPlanV2({
    question: 'בדוק את הקשר',
    identityResolution: {
      identities: [numberIdentity(1382), numberIdentity(1404), numberIdentity(1426)],
      text_calculation_allowed: true,
    },
  });
  assert.equal(plan.requested_capabilities.includes('numeric_relations'), true);
  assert.equal(plan.check_order.includes('numeric_relations'), true);
});

test('Research Plan routes explicit Zeckendorf intent to the sequence operation capability', () => {
  const plan = buildResearchPlanV2({
    question: 'תעשה פירוק זקנדורף ל-888',
    identityResolution: {
      identities: [numberIdentity(888)],
      text_calculation_allowed: true,
    },
  });
  assert.equal(plan.requested_capabilities.includes('sequence:fibonacci:zeckendorf'), true);
  assert.equal(plan.check_order.includes('sequence:fibonacci:zeckendorf'), true);
});

test('canonical W2 numeric_relations emits DERIVATION findings for the 1382/1404/1426 axis', async () => {
  const executors = createCanonicalW2Executors({ supabase: supabaseStub });
  const out = await executors.numeric_relations({
    identityResolution: {
      identities: [numberIdentity(1382), numberIdentity(1404), numberIdentity(1426)],
    },
  });
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.semanticClass, SEMANTIC_CLASS.DERIVATION);
  assert.equal(out.findings.length > 0, true);
  assert.equal(out.findingOutcomes.every(item => item.evidenceRelation === EVIDENCE_RELATION.DERIVATION), true);
  assert.equal(out.trace.operation_keys.includes('arithmetic_progression_v1'), true);
  assert.equal(out.trace.operation_keys.includes('common_factor_projection_v1'), true);
});

test('canonical W2 numeric_relations fails closed for restricted inputs', async () => {
  const executors = createCanonicalW2Executors({ supabase: supabaseStub });
  const out = await executors.numeric_relations({
    identityResolution: {
      identities: [numberIdentity(1382), numberIdentity(1404, { tier: 'private' })],
    },
  });
  assert.equal(out.status, CAPABILITY_STATUS.CONTEXT_REQUIRED);
  assert.deepEqual(out.findings, []);
  assert.equal(out.trace.restricted_inputs, true);
  assert.equal(JSON.stringify(out.trace).includes('1404'), false, 'restricted numeric value must not leak through trace');
});

test('canonical W2 numeric_relations skips a single number', async () => {
  const executors = createCanonicalW2Executors({ supabase: supabaseStub });
  const out = await executors.numeric_relations({
    identityResolution: { identities: [numberIdentity(1404)] },
  });
  assert.equal(out.status, CAPABILITY_STATUS.SKIPPED);
  assert.deepEqual(out.findings, []);
});

test('canonical W2 Zeckendorf is a typed DERIVATION capability', async () => {
  const executors = createCanonicalW2Executors({ supabase: supabaseStub });
  const out = await executors['sequence:fibonacci:zeckendorf']({
    identityResolution: { identities: [numberIdentity(888)] },
  });
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.semanticClass, SEMANTIC_CLASS.DERIVATION);
  assert.equal(out.findings.length, 1);
  assert.equal(out.findings[0].source.method, 'fibonacci_zeckendorf_v1');
  assert.deepEqual(
    out.findings[0].verification.engine_result.terms.map(part => Number(part.term)),
    [610, 233, 34, 8, 3],
  );
  assert.equal(out.findingOutcomes[0].evidenceRelation, EVIDENCE_RELATION.DERIVATION);
});
