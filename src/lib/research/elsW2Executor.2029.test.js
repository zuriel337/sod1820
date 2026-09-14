import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanonicalElsW2Executor } from './elsW2Executor.js';
import { CAPABILITY_STATUS, EVIDENCE_RELATION } from './researchResultBundle.js';
import { makeUniversalFinding } from './universalFinding.js';

function request(overrides = {}) {
  return {
    capability: 'els',
    subject_ref: 'repr:test:1',
    expression: 'משיח',
    language: 'he',
    canonical_engine_required: true,
    execution_authorized: true,
    access: { tier: 'public' },
    evidence_lineage: { root_input_ref: 'source:1', representation_ref: 'repr:test:1', source_lineage_refs: ['source:1'] },
    selection: { protocol: 'pre_registered_target', target_ref: 'repr:test:1', fixed_before_inspection: true },
    budget: { max_skip: 40, max_hits: 16 },
    ...overrides,
  };
}

function finding() {
  return makeUniversalFinding({
    id: 'uf:els:fixture',
    kind: 'els',
    subject: { type: 'phrase', key: 'משיח', label: 'משיח', lang: 'he' },
    source: { engine: 'els', adapter: 'fixture-core', corpus: 'torah', sourceRef: 'corpus:v1', lang: 'he' },
    identity: { sourceIdentity: { corpus: 'torah:v1', skip: 7, dir: 1, start: 100 }, occurrence: { skip: 7, dir: 1, start: 100 } },
    verification: { verification_state: 'not_tested', engine_method_tested: 'els' },
    provenance: { createdBy: 'ENGINE:els', inputRef: 'repr:test:1' },
  });
}

test('without one resolved callable core ELS stays MISSING_ADAPTER', async () => {
  const executor = createCanonicalElsW2Executor();
  const out = await executor({});
  assert.equal(out.status, CAPABILITY_STATUS.MISSING_ADAPTER);
  assert.match(out.reason, /one canonical callable ELS core/i);
});

test('a core cannot run without an authorized private-path subject request', async () => {
  const executor = createCanonicalElsW2Executor({ executeCanonicalEls: async () => ({ status: CAPABILITY_STATUS.EXECUTED }) });
  const out = await executor({});
  assert.equal(out.status, CAPABILITY_STATUS.CONTEXT_REQUIRED);
});

test('request envelope does not self-authorize ELS execution', async () => {
  let called = false;
  const executor = createCanonicalElsW2Executor({
    resolveRequest: async () => request({ execution_authorized: false }),
    executeCanonicalEls: async () => { called = true; return {}; },
  });
  const out = await executor({});
  assert.equal(out.status, CAPABILITY_STATUS.CONTEXT_REQUIRED);
  assert.equal(called, false);
});

test('one canonical callable core can serve the shared Result Bundle contract when injected', async () => {
  const f = finding();
  const executor = createCanonicalElsW2Executor({
    resolveRequest: async () => request(),
    executeCanonicalEls: async req => ({
      status: CAPABILITY_STATUS.EXECUTED,
      findings: [f],
      operatorRef: { type: 'research_operator', owner: 'els_research_layer_law', capability_key: 'els', operator_id: 'els-skip-search', version: 'core-v1' },
      researchEvaluation: {
        access: req.access,
        selection: req.selection,
        search_space: { declared: req.budget, effective: req.budget, multiplicity: { targets: 1, operators: 1, total_tests: 1, known_complete: true } },
        location: { native: { convention: 'fixture-zero-based', start: 100, end: 128 }, span: { start: 100, end: 128, unit: 'corpus_index' }, window_ref: 'els-window:1' },
        dependency: { ...req.evidence_lineage, occurrence_ref: 'els-occ:1', window_ref: 'els-window:1' },
        completion: { state: 'complete', complete: true, truncated: false },
        replay: { replayable: true, input_ref: req.subject_ref, source_ref: 'corpus:v1', engine_ref: 'els-skip-search', version_refs: ['core-v1'], parameters: req.budget },
      },
      findingOutcomes: [{ findingId: f.id, evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE, evidenceLineage: { ...req.evidence_lineage, occurrence_ref: 'els-occ:1', window_ref: 'els-window:1' }, reason: 'fixture core occurrence' }],
      sourceRefs: ['corpus:v1'],
      versionRefs: ['core-v1'],
    }),
  });
  const out = await executor({});
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.findings[0].id, f.id);
  assert.equal(out.operatorRef.owner, 'els_research_layer_law');
  assert.equal(out.researchEvaluation.dependency.root_input_ref, 'source:1');
});

test('parallel/foreign ELS authority is rejected by owner-qualified operator_ref', async () => {
  const executor = createCanonicalElsW2Executor({
    resolveRequest: async () => request(),
    executeCanonicalEls: async () => ({
      status: CAPABILITY_STATUS.NEGATIVE_RESULT,
      findings: [],
      operatorRef: { type: 'research_operator', owner: 'legacy_sql_scan', capability_key: 'els', operator_id: 'fn_els_search', version: 'legacy' },
    }),
  });
  const out = await executor({});
  assert.equal(out.status, CAPABILITY_STATUS.FAILED);
  assert.match(out.reason, /owner-qualified els operator_ref/i);
});
