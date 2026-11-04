import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { assertReadOnly, extractCohortSelect, buildResidualAuditSql, assessReplay } from '../scripts/audit-world-corpus-residual.mjs';

test('audit extraction excludes both migration writes and trailing SQL', () => {
  const migration = 'CREATE TEMP TABLE cohort\n  ON COMMIT DROP\n  AS\nSELECT id FROM public.research_objects; DELETE FROM public.nodes;';
  assert.equal(extractCohortSelect(migration, 'cohort'), 'SELECT id FROM public.research_objects');
  assert.throws(() => extractCohortSelect(migration, 'absent'));
  assert.throws(() => extractCohortSelect(migration + migration, 'cohort'));
  for (const sql of ["WITH gone AS (DELETE FROM public.nodes RETURNING id) SELECT * FROM gone",
    "SELECT public.admin_research_review('x')", "SELECT set_config('x','y',true)", 'SELECT 1; DROP TABLE x']) {
    assert.throws(() => assertReadOnly(sql));
  }
});

test('all audit modes produce read-only SQL from the staged cohort selectors', () => {
  for (const mode of ['summary','evidence','rows','replay']) {
    const sql = buildResidualAuditSql(mode);
    assert.equal(assertReadOnly(sql), sql);
    for (const v of [2,3,4,5,6,7]) assert.ok(sql.includes(`cohort_v${v} AS (`));
    assert.match(sql, /NOT already_reviewed/u);
  }
  assert.throws(() => buildResidualAuditSql('apply'));
});

const replay = { id: 'example', phrase: 'סוד', method: 'רגיל', value: 70, computed: 70, claimed: '70',
  phrase_letters_in_source: true, value_in_source: true, same_source_value_ids: [], same_exact_term_ids: [] };

test('engine equality cannot silently verify ignored digits or arithmetic operators', () => {
  assert.equal(assessReplay(replay).inputScope, 'plain_hebrew');
  for (const phrase of ['393+393=תשפו','1משיח בן דוד','רחל+קול','כובע°']) {
    const result = assessReplay({ ...replay, phrase });
    assert.equal(result.calculation, 'match');
    assert.equal(result.inputScope, 'requires_expression_parse');
    assert.equal(result.automaticPromotion, false);
  }
  assert.equal(assessReplay({ ...replay, computed: null }).calculation, 'unavailable');
  assert.equal(assessReplay({ ...replay, computed: 71 }).calculation, 'mismatch');
});

test('same number in one source never establishes exact duplication', () => {
  assert.equal(assessReplay({ ...replay, same_source_value_ids: ['a'] }).overlap, 'same_source_value_only');
  assert.equal(assessReplay({ ...replay, same_source_value_ids: ['a'], same_exact_term_ids: ['a'] }).overlap, 'same_source_value_and_term');
  assert.equal(assessReplay({ ...replay, value_in_source: false }).sourceTokensPresent, false);
});

test('captured residual partitions cover each ID exactly once and all replays belong to the residual', () => {
  const evidence = JSON.parse(readFileSync(new URL('../docs/reviews/world-corpus-residual-evidence-20261026.json', import.meta.url)));
  const ids = evidence.partitions.flatMap(p => p.ids);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, evidence.summary.residual_rows);
  for (const p of evidence.partitions) assert.equal(p.rows, p.ids.length);
  const eligible = new Set(ids);
  for (const r of evidence.replays) {
    assert.ok(eligible.has(r.id));
    assert.equal(assessReplay(r).automaticPromotion, false);
  }
  assert.equal(evidence.summary.reviewed_memberships, evidence.summary.reviewed_unique_ids);
  assert.equal(evidence.summary.reviewed_unique_ids + ids.length, evidence.summary.source_bound_statuses.approved);
  const plain = evidence.replays.filter(row => assessReplay(row).inputScope === 'plain_hebrew');
  const unresolved = plain.filter(row => row.same_source_value_ids.length
    && !row.same_exact_term_ids.length && !row.phrase_in_representative_text_ids.length);
  assert.deepEqual(evidence.integrationHold.ids, unresolved.map(row => row.id));
  for (const proposal of evidence.reviewedNewTargets) {
    assert.ok(eligible.has(proposal.id));
    assert.ok(proposal.targetId);
    assert.equal(proposal.promoted, false);
  }
  assert.equal(new Set(evidence.otherWriters.stagedIds).size, evidence.otherWriters.stagedIds.length);
  for (const row of evidence.otherWriters.remaining) assert.ok(!evidence.otherWriters.stagedIds.includes(row.id));
});
