import assert from 'node:assert/strict';
import test from 'node:test';
import { makeUniversalFinding } from './universalFinding.js';
import { capabilityResult, composeResearchResultBundle, EVIDENCE_RELATION } from './researchResultBundle.js';

function finding(id, label = id) {
  return makeUniversalFinding({
    id,
    kind: 'fixture',
    subject: { type: 'entity', key: id, label },
    source: { adapter: 'dependency-2029-test', sourceRef: id },
    identity: { sourceIdentity: id },
    provenance: { createdBy: 'TEST', inputRef: 'fixture' },
  });
}

function outcome(f, lineage, span = null) {
  return {
    findingId: f.id,
    evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE,
    evidenceLineage: lineage,
    lineageSpan: span,
    reason: 'fixture lineage',
  };
}

test('Result Bundle groups same artifact before ranking annotation and keeps precomputed ranking context-only', () => {
  const media = finding('uf:media:42');
  const graph = finding('uf:graph:42');
  const source = finding('uf:source:independent');
  const bundle = composeResearchResultBundle({
    query: { subject: 'dependency-fixture' },
    capabilities: [
      capabilityResult({
        key: 'media', owner: 'reality_graph_law', findings: [media],
        findingOutcomes: [outcome(media, { artifact_refs: ['artifact:42'], source_lineage_refs: ['source:a'] })],
      }),
      capabilityResult({
        key: 'graph', owner: 'reality_graph_law', findings: [graph],
        findingOutcomes: [outcome(graph, { artifact_refs: ['artifact:42'], source_lineage_refs: ['source:a'] })],
      }),
      capabilityResult({
        key: 'sources', owner: 'research_intake_foundation_contract_law', findings: [source],
        findingOutcomes: [outcome(source, { artifact_refs: ['artifact:99'], source_lineage_refs: ['source:b'] })],
      }),
    ],
    ranking: [
      { findingId: media.id, rank: 1, score: 100 },
      { findingId: graph.id, rank: 2, score: 99 },
      { findingId: source.id, rank: 3, score: 80 },
    ],
  });

  assert.equal(bundle.dependency_groups.length, 2);
  const dependent = bundle.dependency_groups.find(x => x.finding_ids.includes(media.id));
  assert.deepEqual(new Set(dependent.finding_ids), new Set([media.id, graph.id]));
  assert.equal(dependent.dependency_state, 'dependent');
  assert.equal(bundle.dependency_edges[0].relation, 'same_artifact');
  assert.equal(bundle.finding_outcomes.find(x => x.finding_id === media.id).dependency_group,
    bundle.finding_outcomes.find(x => x.finding_id === graph.id).dependency_group);
  assert.equal(bundle.finding_outcomes.find(x => x.finding_id === media.id).independence_conflict, true);
  assert.equal(bundle.ranking.find(x => x.finding_id === media.id).dependency_state, 'dependent');
  assert.equal(bundle.ranking.find(x => x.finding_id === media.id).independence_conflict, true);
  assert.equal(bundle.ranking.find(x => x.finding_id === media.id).dependency_safe, false);
  assert.equal(bundle.ranking.find(x => x.finding_id === media.id).research_strength_eligible, false);
  assert.equal(bundle.ranking.find(x => x.finding_id === media.id).ranking_semantic, 'precomputed_context_only');
  assert.equal(bundle.ranking_semantics.dependency_safe, false);
  assert.equal(bundle.ranking_semantics.research_strength_eligible, false);
  assert.equal(bundle.dependency_summary.independence_conflicts, 2);
  assert.equal(bundle.invariants.dependency_grouping_precedes_ranking_annotation, true);
  assert.equal(bundle.invariants.precomputed_ranking_is_context_only, true);
  assert.equal(bundle.invariants.independent_evidence_conflict_is_explicit, true);
});

test('ELS nested terms from one window collapse to one evidence lineage group', () => {
  const outer = finding('uf:els:1111');
  const inner = finding('uf:els:111');
  const bundle = composeResearchResultBundle({
    query: { subject: 'els-window' },
    capabilities: [capabilityResult({
      key: 'els', owner: 'els_single_engine_law', findings: [outer, inner],
      findingOutcomes: [
        outcome(outer, { window_ref: 'window:els:1', occurrence_ref: 'occ:outer' }, { start: 100, end: 103, unit: 'corpus_index' }),
        outcome(inner, { window_ref: 'window:els:1', occurrence_ref: 'occ:inner' }, { start: 101, end: 103, unit: 'corpus_index' }),
      ],
    })],
  });
  assert.equal(bundle.dependency_groups.length, 1);
  assert.equal(bundle.dependency_edges[0].relation, 'contains');
  assert.equal(bundle.dependency_summary.dependent_groups, 1);
});

test('unknown lineage never upgrades to independent dependency status', () => {
  const a = finding('uf:a'), b = finding('uf:b');
  const bundle = composeResearchResultBundle({
    query: { subject: 'unknown-lineage' },
    capabilities: [capabilityResult({
      key: 'future', owner: 'future_owner', findings: [a, b],
      findingOutcomes: [
        { findingId: a.id, evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE, reason: 'engine says lineage independent but no cross-capability lineage supplied' },
        { findingId: b.id, evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE, reason: 'same' },
      ],
    })],
  });
  assert.equal(bundle.dependency_groups.length, 2);
  assert.equal(bundle.dependency_groups.every(x => x.dependency_state === 'unknown'), true);
  assert.equal(bundle.dependency_edges.length, 0);
  assert.equal(bundle.dependency_summary.unknown_singletons, 2);
  assert.equal(bundle.invariants.unknown_dependency_is_not_independence, true);
});

test('finding without findingOutcome still receives explicit UNKNOWN group and unsafe contextual ranking', () => {
  const noOutcome = finding('uf:no-outcome');
  const bundle = composeResearchResultBundle({
    query: { subject: 'missing-outcome-lineage' },
    capabilities: [capabilityResult({
      key: 'legacy-adapter', owner: 'legacy_owner', findings: [noOutcome], findingOutcomes: [],
    })],
    ranking: [{ findingId: noOutcome.id, rank: 1, score: 100 }],
  });

  assert.equal(bundle.dependency_groups.length, 1);
  assert.deepEqual(bundle.dependency_groups[0].finding_ids, [noOutcome.id]);
  assert.equal(bundle.dependency_groups[0].dependency_state, 'unknown');
  assert.equal(bundle.ranking[0].dependency_state, 'unknown');
  assert.ok(bundle.ranking[0].dependency_group);
  assert.equal(bundle.ranking[0].dependency_safe, false);
  assert.equal(bundle.ranking[0].research_strength_eligible, false);
  assert.equal(bundle.dependency_summary.unknown_singletons, 1);
});
