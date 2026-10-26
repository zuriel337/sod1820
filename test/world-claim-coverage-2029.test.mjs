import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { verifyCandidate } from '../src/lib/triage.js';
import { readEvidence, validateEvidence, compareCoverage, replayPlan, collectReplayInputs,
  buildReplaySql, buildReview, summarizeReview } from '../scripts/audit-world-claim-coverage.mjs';

const evidence = readEvidence();
const results = buildReview(evidence);
const clone = () => structuredClone(evidence);
const byPrefix = prefix => results.find(r => r.id.startsWith(prefix));

test('exact 58 coverage gaps and 28 mixed inputs are reviewed once; no new corpus IDs', () => {
  const prior = JSON.parse(readFileSync(new URL('../docs/reviews/world-corpus-residual-evidence-20261026.json', import.meta.url)));
  const expected = prior.replays.filter(r => prior.integrationHold.ids.includes(r.id)
    || !/^[א-ת]+(?: [א-ת]+)*$/u.test(r.phrase));
  assert.deepEqual(results.map(r => r.id).sort(), expected.map(r => r.id).sort());
  assert.equal(results.filter(r => r.kind === 'coverage_gap').length, 58);
  assert.deepEqual(summarizeReview(results), { rows:86, sources:45,
    counts:{typed_calculation_ready:27,additional_operand_required:47,operand_covered_format_variant:11,requires_review:1},
    canonicalDuplicatePairs:0,livePromotions:0,hiddenRecords:0 });
});

test('public admitted source flags and exact source binding fail closed', () => {
  for (const mutate of [a => { a.rows[0].privacy_scope='private'; },
    a => { a.rows[0].status='candidate'; }, a => { a.sources[0].channel='or-geula'; },
    a => { a.sources[0].page_only=true; }, a => { a.sources[0].status='draft'; },
    a => { a.sources[0].contributor_id=a.sources[0].id; },
    a => { a.rows[0].source_ref='channel_updates:missing'; }]) {
    const changed=clone(); mutate(changed); assert.throws(() => validateEvidence(changed));
  }
});

test('fingerprints, exact source spans and reviewed operand extraction are preserved', () => {
  for (const mutate of [a => { a.sources[0].text += 'changed'; },
    a => { a.reviewPlan[0].sourceSpan.start++; },
    a => { a.reviewPlan.find(r => r.operand).operand='invented'; },
    a => { a.reviewPlan[0].kind='auto_approve'; },
    a => { a.original[0].value++; }, a => { a.reviewPlan.pop(); },
    a => { a.reviewPlan.push(a.reviewPlan[0]); }]) {
    const changed=clone(); mutate(changed); assert.throws(() => validateEvidence(changed));
  }
});

test('same source and value are not claim equality; different word order is preserved', () => {
  const first=byPrefix('0813'); // פתח תקוה absent from generic five-expression summary
  assert.equal(first.recommendation,'additional_operand_required');
  assert.equal(first.preferredDisplayId,first.id);
  const reordered=byPrefix('5c94'); // רחום וחנון is not חנון ורחום
  assert.equal(reordered.recommendation,'additional_operand_required');
  for (const r of results) assert.equal(r.canonicalDuplicateIds.length,0);
});

test('shared extractor detects 11 formatting overlaps without hiding either claim', () => {
  const r=byPrefix('56dd');
  assert.equal(r.recommendation,'operand_covered_format_variant');
  assert.equal(r.coverage.evidence[0].text,'בונה ירושלם י-ה-ו-ה');
  assert.equal(r.coverage.evidence[0].norm,'בונה ירושלם יהוה');
  assert.equal(r.suppress,false);
  assert.ok(r.retainedIds.includes(r.preferredDisplayId));
  assert.equal(byPrefix('6485').recommendation,'operand_covered_format_variant');
});

test('coverage comparison never crosses source or target boundaries', () => {
  const r=evidence.original.find(r => r.id.startsWith('56dd'));
  const rep=evidence.rows.find(s => s.id===r.same_source_value_ids[0]);
  assert.equal(compareCoverage(r,[rep]).coverage,'operand_covered_format_variant');
  assert.equal(compareCoverage(r,[{...rep,source_id:'other'}]).coverage,'additional_operand_required');
  assert.equal(compareCoverage(r,[{...rep,value:0}]).coverage,'additional_operand_required');
});

test('all 20 composites use existing grammar and canonical per-operand engine checks', () => {
  const composites=results.filter(r => r.replay.type==='derivation');
  assert.equal(composites.length,20);
  assert.ok(composites.every(r => r.replay.calculation==='match' && r.databaseConfirmed));
  for (const r of composites) {
    assert.equal(r.replay.claim.skipUsed,0);
    assert.ok(r.replay.claim.linkValues.every(n => n===r.value));
    assert.ok(r.replay.claim.operands.every(o => o.method==='רגיל'));
  }
  assert.deepEqual(byPrefix('4ec5').replay.claim.linkValues,[786,786,786]);
});

test('incorrect arithmetic is not verified by the letters on the right', () => {
  const p={kind:'composite',sourceSpan:{excerpt:'393+392=תשפו=786'}};
  assert.notEqual(replayPlan(p,{value:786,method:'רגיל'}).calculation,'match');
  assert.notEqual(replayPlan({...p,sourceSpan:{excerpt:'חזק+חזק+חזק=346'}},
    {value:346,method:'רגיל'}).calculation,'match');
});

test('list indices are source annotations, not dropped multipliers or new identities', () => {
  const r=byPrefix('c33d');
  assert.equal(r.phrase,'3יאיר אור משיח');
  assert.equal(r.replay.operand,'יאיר אור משיח');
  assert.ok(r.sourceSpan.excerpt.startsWith('3-"'));
  assert.equal(r.replay.atomic.engine_detail.computed,786);
  assert.equal(r.publicationChanged,false);
});

test('letter decompositions retain spelling, positional values and arithmetic separately', () => {
  const checks=collectReplayInputs(evidence);
  const letters=checks.filter(r => r.id.startsWith('da0a') && r.role.startsWith('letter_'));
  assert.deepEqual(letters.map(r => r.phrase),['כ','ו','כ','ב','י','ם']);
  assert.deepEqual(letters.map(r => r.expected),[20,6,20,2,10,40]);
  const c=clone(); const p=c.reviewPlan.find(r=>r.id.startsWith('da0a'));
  p.letterValues=[6,20,20,2,10,40];
  assert.throws(()=>validateEvidence(c));
  assert.equal(evidence.integrationHold.sourceSpellings.proseVariantValue,108);
});

test('an unresolved degree mark stays unresolved despite a matching atomic word', () => {
  const r=byPrefix('9818');
  assert.equal(r.replay.atomic.engine_detail.computed,98);
  assert.equal(r.replay.calculation,'not_tested');
  assert.equal(r.recommendation,'requires_review');
  assert.ok(r.sourceSpan.excerpt.includes('כובע°'));
});

test('missing, altered or duplicate DB evidence never grants a ready recommendation', () => {
  const id=evidence.original[0].id;
  for (const mutate of [a=>{a.engineReplays=[];}, a=>{a.targets=[];},
    a=>{a.engineReplays.find(r=>r.id===id).computed=null;},
    a=>{a.engineReplays.find(r=>r.id===id).computed=NaN;},
    a=>{a.engineReplays.push(a.engineReplays.find(r=>r.id===id));},
    a=>{a.engineReplays.find(r=>r.id===id).method='unknown';},
    a=>{a.targets.push(a.targets.find(t=>t.value===evidence.original[0].value));}]) {
    const c=clone(); mutate(c);
    assert.equal(buildReview(c).find(r=>r.id===id).recommendation,'requires_review');
  }
});

test('retained-source contradiction is not overwritten or inherited by the correct sibling', () => {
  const hold=evidence.integrationHold.retainedClaimMismatch;
  const mismatch=verifyCandidate({type:'explicit-claim',text:hold.claimedPhrase,method:'רגיל',value:hold.claimedValue});
  assert.equal(mismatch.engine_verified,false);
  assert.equal(mismatch.engine_detail.computed,553);
  assert.equal(byPrefix('0d308').replay.atomic.engine_detail.computed,513);
  assert.equal(byPrefix('0d308').recommendation,'additional_operand_required');
});

test('replay SQL is read-only, bounded, and all 130 checks match canonical execution', () => {
  const sql=buildReplaySql(evidence), inputs=collectReplayInputs(evidence);
  assert.equal(inputs.length,130);
  assert.equal(evidence.engineReplays.length,130);
  assert.ok(evidence.engineReplays.every(r=>r.expected===r.computed));
  assert.match(sql,/public\.fn_method_value\(i\.method,i\.phrase\)/);
  assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|SET|DO)\b|;/iu);
});

test('no publication, interpretation, independence or strength is fabricated', () => {
  for (const r of results) {
    assert.equal(r.promoted,false); assert.equal(r.publicationChanged,false);
    assert.equal(r.suppress,false); assert.equal(r.keepAllRecords,true);
    assert.equal(r.independentSourcesAdded,0); assert.equal(r.strength,null);
    assert.equal(r.evidenceQuality,null); assert.equal(r.interpretationVerified,false);
  }
});
