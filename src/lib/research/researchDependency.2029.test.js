import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyEvidenceDependency, composeDependencyGroups, DEPENDENCY_RELATION } from './researchDependency.js';
import { buildNameResearchRepresentations, buildSourceExpressionRepresentations, prepareElsSubjectRequests, REPRESENTATION_ROLE } from './researchSubjectRepresentations.js';
import { SELECTION_PROTOCOL } from './researchEvaluation.js';

function outcome(id, lineage, span = null) {
  return { finding_id: id, evidence_lineage: lineage, lineage_span: span };
}

test('same artifact across capabilities is one dependency group, not independent evidence inflation', () => {
  const a = outcome('uf:media:1', { artifact_refs: ['artifact:img:42'] });
  const b = outcome('uf:graph:1', { artifact_refs: ['artifact:img:42'] });
  assert.equal(classifyEvidenceDependency(a, b).relation, DEPENDENCY_RELATION.SAME_ARTIFACT);
  const grouped = composeDependencyGroups([a, b]);
  assert.equal(grouped.groups.length, 1);
  assert.equal(grouped.groups[0].finding_ids.length, 2);
  assert.equal(grouped.edges[0].relation, DEPENDENCY_RELATION.SAME_ARTIFACT);
});

test('nested ELS observations in one window are explicitly dependent', () => {
  const a = outcome('uf:els:1111', { window_ref: 'els-window:pi-like:1' }, { start: 100, end: 103, unit: 'corpus_index' });
  const b = outcome('uf:els:111', { window_ref: 'els-window:pi-like:1' }, { start: 101, end: 103, unit: 'corpus_index' });
  assert.equal(classifyEvidenceDependency(a, b).relation, DEPENDENCY_RELATION.CONTAINS);
});

test('full name and component research share root input and cannot masquerade as independent sources', () => {
  const full = outcome('uf:els:full', { root_input_ref: 'person-input:1', representation_ref: 'repr:full' });
  const part = outcome('uf:gematria:part', { root_input_ref: 'person-input:1', representation_ref: 'repr:part', parent_refs: ['repr:full'] });
  const relation = classifyEvidenceDependency(full, part).relation;
  assert.ok([DEPENDENCY_RELATION.SHARED_INPUT, DEPENDENCY_RELATION.DERIVATION].includes(relation));
});

test('no shared lineage stays UNKNOWN; dependency classifier never invents independence', () => {
  const a = outcome('a', { source_lineage_refs: ['source:a'] });
  const b = outcome('b', { source_lineage_refs: ['source:b'] });
  assert.equal(classifyEvidenceDependency(a, b).relation, DEPENDENCY_RELATION.UNKNOWN);
});

test('name normalization preserves exact full name and ordered parts without fabricating family role', () => {
  const reps = buildNameResearchRepresentations({ name: 'משה דוד', rootInputRef: 'person-input:moshe' });
  assert.equal(reps.some(x => x.role === REPRESENTATION_ROLE.FULL_NAME && x.exact_text === 'משה דוד'), true);
  assert.deepEqual(reps.filter(x => x.role === REPRESENTATION_ROLE.NAME_PART).map(x => x.exact_text), ['משה', 'דוד']);
  assert.equal(reps.some(x => x.role === REPRESENTATION_ROLE.FAMILY_NAME), false);
});

test('explicit surname is typed as family_name and shares the same root lineage', () => {
  const reps = buildNameResearchRepresentations({ name: 'משה', surname: 'כהן', rootInputRef: 'person-input:1', personRef: 'person:1' });
  const family = reps.find(x => x.role === REPRESENTATION_ROLE.FAMILY_NAME);
  const full = reps.find(x => x.role === REPRESENTATION_ROLE.FULL_NAME);
  assert.equal(family.exact_text, 'כהן');
  assert.equal(full.exact_text, 'משה כהן');
  assert.equal(family.evidence_lineage.root_input_ref, full.evidence_lineage.root_input_ref);
});

test('ELS request preparation is bounded, provenance-bearing and never self-authorizes execution', () => {
  const reps = buildNameResearchRepresentations({ name: 'משה', surname: 'כהן', rootInputRef: 'person-input:1' });
  const plan = prepareElsSubjectRequests(reps, { maxSubjects: 3, selectionProtocol: SELECTION_PROTOCOL.HYPOTHESIS_DRIVEN_FOLLOWUP, reason: 'life-journey research plan' });
  assert.ok(plan.requests.length <= 3);
  assert.equal(plan.canonical_owner, 'els_research_layer_law');
  assert.equal(plan.requests.every(x => x.canonical_engine_required === true && x.execution_authorized === false), true);
  assert.equal(plan.requests.every(x => x.evidence_lineage.root_input_ref === 'person-input:1'), true);
});

test('news/source expressions become bounded ELS candidates only after typed extraction, not from a news-specific engine', () => {
  const reps = buildSourceExpressionRepresentations({
    sourceRef: 'news:https://example.invalid/a',
    rootInputRef: 'source-observation:1',
    maxExpressions: 4,
    expressions: [
      { text: 'משיח', locator: { paragraph: 2 } },
      { text: 'ירושלים', locator: { paragraph: 3 } },
      { text: 'אב', locator: { paragraph: 4 } },
    ],
  });
  const plan = prepareElsSubjectRequests(reps, { maxSubjects: 2, selectionProtocol: SELECTION_PROTOCOL.SOURCE_CLAIM_REPLAY });
  assert.equal(plan.requests.length, 2);
  assert.equal(plan.requests[0].evidence_lineage.source_lineage_refs[0], 'news:https://example.invalid/a');
  assert.equal(plan.skipped.some(x => x.reason === 'too_short_high_base_rate'), true);
});
