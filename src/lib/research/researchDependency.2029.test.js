import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyEvidenceDependency, composeDependencyGroups, DEPENDENCY_RELATION } from './researchDependency.js';
import { expandResearchTextRepresentations } from './researchRepresentations.js';
import { prepareElsSubjectRequests } from './researchElsRequests.js';
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
});

test('nested ELS observations in one window are explicitly dependent', () => {
  const a = outcome('uf:els:1111', { window_ref: 'els-window:1' }, { start: 100, end: 103, unit: 'corpus_index' });
  const b = outcome('uf:els:111', { window_ref: 'els-window:1' }, { start: 101, end: 103, unit: 'corpus_index' });
  assert.equal(classifyEvidenceDependency(a, b).relation, DEPENDENCY_RELATION.CONTAINS);
});

test('full name and component research are derivations when the component points to the full representation', () => {
  const full = outcome('uf:els:full', { root_input_ref: 'person-input:1', representation_ref: 'repr:full' });
  const part = outcome('uf:gematria:part', { root_input_ref: 'person-input:1', representation_ref: 'repr:part', parent_refs: ['repr:full'] });
  assert.equal(classifyEvidenceDependency(full, part).relation, DEPENDENCY_RELATION.DERIVATION);
});

test('same subject input alone is contextual provenance, not proof of dependent evidence', () => {
  const sourceA = outcome('uf:source:a', {
    root_input_ref: 'name:moshe', representation_ref: 'repr:name:moshe', source_lineage_refs: ['source:a'],
  });
  const sourceB = outcome('uf:source:b', {
    root_input_ref: 'name:moshe', representation_ref: 'repr:name:moshe:other-source', source_lineage_refs: ['source:b'],
  });
  assert.equal(classifyEvidenceDependency(sourceA, sourceB).relation, DEPENDENCY_RELATION.SHARED_INPUT);
  const grouped = composeDependencyGroups([sourceA, sourceB]);
  assert.equal(grouped.groups.length, 2, 'same queried name must not collapse independent source lineages');
  assert.equal(grouped.contextual_relations[0].relation, DEPENDENCY_RELATION.SHARED_INPUT);
});

test('same exact representation across methods is a derivation, not independent evidence', () => {
  const a = outcome('uf:gematria:ragil', { representation_ref: 'repr:358-expression' });
  const b = outcome('uf:gematria:katan', { representation_ref: 'repr:358-expression' });
  assert.equal(classifyEvidenceDependency(a, b).relation, DEPENDENCY_RELATION.DERIVATION);
});

test('no shared lineage stays UNKNOWN; dependency classifier never invents independence', () => {
  const a = outcome('a', { source_lineage_refs: ['source:a'] });
  const b = outcome('b', { source_lineage_refs: ['source:b'] });
  assert.equal(classifyEvidenceDependency(a, b).relation, DEPENDENCY_RELATION.UNKNOWN);
});

test('canonical name representations preserve full name and ordered parts without fabricating family role', () => {
  const reps = expandResearchTextRepresentations({ identities: [{ type: 'name', key: 'name:moshe-david', label: 'משה דוד', access: { tier: 'public' } }] });
  assert.equal(reps.some(x => x.kind === 'full_name' && x.text === 'משה דוד'), true);
  assert.deepEqual(reps.filter(x => x.kind === 'name_part').map(x => [x.text, x.role, x.role_source]), [
    ['משה', 'word_1', 'whitespace_position_only'],
    ['דוד', 'word_2', 'whitespace_position_only'],
  ]);
  assert.equal(reps.some(x => x.role === 'family_name'), false);
});

test('source-declared given/family roles survive in the same canonical representation set', () => {
  const reps = expandResearchTextRepresentations({ identities: [{
    type: 'person', key: 'person:1', label: 'משה כהן', access: { tier: 'personal' },
    metadata: { given_name: 'משה', family_name: 'כהן' },
  }] });
  assert.equal(reps.some(x => x.role === 'given_name' && x.text === 'משה'), true);
  assert.equal(reps.some(x => x.role === 'family_name' && x.text === 'כהן'), true);
  assert.equal(reps.every(x => x.parent_identity_key.startsWith('anon:')), true);
});

test('ELS request preparation consumes the SAME canonical representations, stays bounded and never self-authorizes', () => {
  const reps = expandResearchTextRepresentations({ identities: [{
    type: 'person', key: 'person:1', label: 'משה כהן', access: { tier: 'personal' },
    metadata: { given_name: 'משה', family_name: 'כהן' },
  }] });
  const plan = prepareElsSubjectRequests(reps, {
    rootInputRef: 'anon:person-input:1', maxSubjects: 3,
    selectionProtocol: SELECTION_PROTOCOL.HYPOTHESIS_DRIVEN_FOLLOWUP,
    reason: 'life-journey research plan',
  });
  assert.ok(plan.requests.length <= 3);
  assert.equal(plan.canonical_owner, 'els_research_layer_law');
  assert.equal(plan.requests.every(x => x.canonical_engine_required === true && x.execution_authorized === false), true);
  assert.equal(plan.requests.every(x => x.evidence_lineage.root_input_ref === 'anon:person-input:1'), true);
  const full = plan.requests.find(x => x.subject_ref.endsWith(':full'));
  const part = plan.requests.find(x => !x.subject_ref.endsWith(':full'));
  assert.ok(full && part);
  assert.deepEqual(part.evidence_lineage.parent_refs, [full.subject_ref]);
});

test('news/source expressions enter ELS only after typed source extraction; no news-specific ELS engine', () => {
  const reps = expandResearchTextRepresentations({ identities: [
    { type: 'phrase', key: 'source:a#p2', label: 'משיח', access: { tier: 'public' } },
    { type: 'phrase', key: 'source:a#p3', label: 'ירושלים', access: { tier: 'public' } },
    { type: 'word', key: 'source:a#p4', label: 'אב', access: { tier: 'public' } },
  ] });
  const plan = prepareElsSubjectRequests(reps, {
    rootInputRef: 'source-observation:1',
    sourceLineageRefs: ['news:https://example.invalid/a'],
    maxSubjects: 2,
    selectionProtocol: SELECTION_PROTOCOL.SOURCE_CLAIM_REPLAY,
  });
  assert.equal(plan.requests.length, 2);
  assert.equal(plan.requests[0].evidence_lineage.source_lineage_refs[0], 'news:https://example.invalid/a');
  assert.equal(plan.skipped.some(x => x.reason === 'too_short_high_base_rate'), true);
});
