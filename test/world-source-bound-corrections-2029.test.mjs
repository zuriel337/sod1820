import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readEvidence, readSourceBindingPlan, readSourceBindingReceipt,
  selectSourceBindings, collectSourceBindingChecks, buildSourceBindingReceiptSql,
  buildSourceBoundCorrectionReview, buildTypedClaimReview, composeTypedReviewBundle,
  selectPendingAtomicClaims } from '../scripts/audit-world-claim-coverage.mjs';

const evidence = readEvidence(), plan = readSourceBindingPlan(), receipt = readSourceBindingReceipt();
const report = buildSourceBoundCorrectionReview(evidence, receipt, plan);
const bound = id => report.sourceBindings.find(r => r.id.startsWith(id));

test('three reviewed source bindings explain 12 occurrences without claiming a generic parser fix', () => {
  assert.deepEqual(report.counts, {reviewedInputBindings:3, numericOccurrences:12,
    atomicCorrectionPlans:6, newFindings:0, liveCorrections:0, treePromotions:0});
  const oldTyped = buildTypedClaimReview(evidence, receipt.typed);
  for (const r of report.sourceBindings) {
    assert.equal(r.reviewedInputCoverage, 'complete');
    assert.equal(r.genericExtractionFidelity, 'partial');
    assert.equal(r.scope, 'reviewed_source_spans_only');
    assert.deepEqual(r.originalTrace, oldTyped.find(o => o.id === r.id).calculation.trace);
    assert.equal(r.bindings.length, new Set(r.bindings.map(b => b.occurrenceIndex)).size);
    assert.ok(r.proposedDerivation.outputs.every(o => o.calculation_match));
    assert.equal(r.independentSourcesAdded, 0);
    assert.equal(r.automaticPromotion, false);
    assert.equal(r.publicationChanged, false);
    assert.equal(r.interpretationVerified, false);
    assert.equal(r.mediaInspected, false);
  }
});

test('393 comes from the two exact adjacent phrase occurrences, not the earlier same-value phrase', () => {
  const r = bound('4ec5');
  assert.deepEqual(r.bindings.map(b => b.origin_statement), ['אור פניך י-ה-ו-ה', 'אור פניך י-ה-ו-ה']);
  assert.deepEqual(r.bindings.map(b => b.value), [393,393]);
  assert.deepEqual(r.bindings.map(b => b.origin_ref.sourceSpan.start), [285,305]);
  assert.deepEqual(r.bindings.map(b => b.expression_ref.ast_path), [['a'],['b']]);
  const changed = structuredClone(plan);
  const s = evidence.sources.find(s => s.id === 'fc4cad9c-645f-48bc-8fab-2ae1eda228df');
  const start = s.text.indexOf('ברחמים גדולים');
  changed.bindings[0].operandSpans[0] = {start, end:start+'ברחמים גדולים'.length, excerpt:'ברחמים גדולים'};
  assert.throws(() => selectSourceBindings(evidence,changed), /context/);
});

test('letter order, repeated letters, final mem, niqqud and spelling distinction survive', () => {
  const stars = bound('da0a'), delay = bound('cf60');
  assert.deepEqual(stars.bindings.map(b => b.origin_statement), ['כ','ו','כ','ב','י','ם']);
  assert.deepEqual(stars.bindings.map(b => b.value), [20,6,20,2,10,40]);
  assert.deepEqual(stars.bindings.map(b => b.origin_ref.letterIndex), [0,1,2,3,4,5]);
  assert.notEqual(stars.bindings[0].origin_ref.sourceSpan.start, stars.bindings[2].origin_ref.sourceSpan.start);
  assert.deepEqual(delay.bindings.map(b => b.origin_statement), ['ע','כ','ו','ב']);
  assert.equal(delay.bindings[0].origin_ref.wordSpan.excerpt, 'עִכּוּב');
  assert.equal(delay.canonicalChecks.find(c => c.role === 'prose_spelling_contrast').computed,108);
  assert.equal(stars.originalTrace.result,98);
  assert.equal(delay.originalTrace.result,98);
});

test('every origin has a reversible exact source locator and an existing canonical engine trace', () => {
  for (const r of report.sourceBindings) for (const b of r.bindings) {
    const row = evidence.rows.find(row => row.id === r.id);
    const source = evidence.sources.find(s => s.id === row.source_id);
    const span = b.origin_ref.sourceSpan;
    assert.equal(source.text.slice(span.start,span.end),b.origin_statement);
    assert.equal(b.origin_ref.sourceRef,row.source_ref);
    assert.equal(b.origin_ref.sourceMd5,source.md5);
    assert.equal(b.calculationTrace.computed,b.value);
    assert.equal(b.method,'רגיל');
    assert.equal(b.verification_state,'match');
  }
});

test('missing/duplicate bindings, changed spans, wrong kinds and switched phrase positions fail closed', () => {
  for (const alter of [p => p.bindings.pop(), p => p.bindings.push(p.bindings[0]),
    p => {p.bindings[0].contextSpan.end++;}, p => {p.bindings[1].operandSpans[0].excerpt='עיכוב';},
    p => {p.bindings[0].operandSpans.reverse();}, p => {p.bindings[1].kind='adjacent_phrase_sum';}]) {
    const changed = structuredClone(plan); alter(changed);
    assert.throws(() => selectSourceBindings(evidence,changed));
  }
});

test('fresh receipt contains 71 old and 13 new canonical checks; SQL is bounded read-only', () => {
  assert.equal(receipt.typed.engine_replays.length,71);
  assert.equal(receipt.origin_checks.length,13);
  assert.equal(collectSourceBindingChecks(evidence).length,13);
  const sql = buildSourceBindingReceiptSql(evidence);
  assert.match(sql,/public\.fn_method_value\(i.method,i.phrase\)/);
  assert.match(sql,/t\.tgrelid='public\.research_objects'::regclass/);
  assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|DO|SET)\b|;/iu);
  assert.doesNotMatch(sql,/SELECT\s+\*/iu);
});

test('missing, duplicate, mismatched or relabeled canonical source-origin checks fail closed', () => {
  for (const alter of [r => r.origin_checks.pop(), r => r.origin_checks.push(r.origin_checks[0]),
    r => {r.origin_checks[0].computed++;}, r => {r.origin_checks[0].method='סידורי';},
    r => {r.origin_checks[0].role='wrong_position';}, r => {r.origin_checks[0].method_in_engine=false;},
    r => {r.origin_checks[0].phrase='ברחמים גדולים';}]) {
    const changed = structuredClone(receipt); alter(changed);
    assert.throws(() => buildSourceBoundCorrectionReview(evidence,changed), /receipt/);
  }
});

test('source, privacy, identity and existing-revision drift are still blocked by the existing receipt gate', () => {
  for (const alter of [r => {r.typed.claims[0].exact_public_source=false;},
    r => {r.typed.claims[0].general_world_scope=false;}, r => {r.typed.claims[0].public_unattached=false;},
    r => {r.typed.claims[0].no_existing_revision=false;}, r => {r.typed.claims[0].source_md5='drift';}]) {
    const changed = structuredClone(receipt); alter(changed);
    assert.throws(() => buildSourceBoundCorrectionReview(evidence,changed));
  }
});

test('six successor plans retain exact source identity and original rows; none execute or promise candidate status', () => {
  const expected = ['משיח בן דוד בא על החמור = 786','ויהי יהוה משען = 517', 'בינוני = 128',
    'רחל = 238','יאיר אור משיח = 786','עכוב = 98'];
  assert.deepEqual(report.corrections.map(r => r.parameters.p_new_statement),expected);
  for (const r of report.corrections) {
    assert.equal(r.canonicalWriter,'fn_research_object_correct');
    assert.equal(r.parameters.p_id,r.id);
    assert.deepEqual(r.parameters.p_new_terms,[r.calculation.operand]);
    assert.equal(r.parameters.p_new_value,r.original.value);
    assert.equal(r.parameters.p_new_relates,null);
    assert.notEqual(r.proposedClaimUid,r.original.claimUid);
    assert.equal(r.identityConflicts,0);
    assert.ok(r.retainIds.includes(r.id));
    assert.ok(r.parameters.p_reason.includes(r.sourceMd5));
    assert.equal(r.execute,false);
    assert.equal(r.readiness,'blocked_standing_approval_side_effect');
    assert.equal(r.writerEffect.rpcReportedStatus,'candidate');
    assert.equal(r.writerEffect.storedStatusFromReviewedDefinitions,'approved');
    assert.equal(r.writerEffect.engineVerifiedAfterCorrection,false);
    assert.equal(r.writerEffect.engineDetailAfterCorrection,null);
    assert.match(r.writerEffect.successorMeta,/predecessor metadata retained on predecessor/);
  }
  assert.equal(report.execute,false);
  assert.equal(report.automaticPromotion,false);
});

test('identity collisions remain on hold; no invented statement or alternate source reference', () => {
  const changed = structuredClone(receipt), id=report.corrections[0].id;
  changed.typed.claims.find(r => r.id === id).proposed_identity_conflicts = 1;
  const row=buildSourceBoundCorrectionReview(evidence,changed).corrections.find(r => r.id===id);
  assert.equal(row.readiness,'existing_identity_requires_review');
  assert.deepEqual(row.parameters,report.corrections[0].parameters);
  assert.equal(row.execute,false);
});

test('RPC or trigger drift invalidates the reviewed side-effect conclusion', () => {
  for (const alter of [r => r.writers.pop(), r => r.writers.push(r.writers[0]),
    r => {r.writers[0].definition+=' ';}, r => {r.writers[0].definition_md5='00000000000000000000000000000000';},
    r => r.approval_triggers.pop(), r => {r.approval_triggers[0].tgenabled='D';},
    r => {r.approval_triggers[0].tgtype=7;}, r => {r.approval_triggers[0].definition+=' ';},
    r => {r.typed.correction_definition_md5='00000000000000000000000000000000';}]) {
    const changed = structuredClone(receipt); alter(changed);
    assert.throws(() => buildSourceBoundCorrectionReview(evidence,changed), /drift|mismatch/);
  }
});

test('existing public boundary is unchanged; these cases do not inflate the separate 47-case replacement batch', () => {
  const typed=buildTypedClaimReview(evidence,receipt.typed);
  assert.equal(typed.length,27);
  assert.equal(selectPendingAtomicClaims(evidence).length,47);
  const ids=new Set([...report.sourceBindings,...report.corrections].map(r=>r.id));
  assert.ok(selectPendingAtomicClaims(evidence).every(r=>!ids.has(r.id)));
  for (const descriptor of [null,{authenticated:true,admin:true}]) {
    assert.equal(composeTypedReviewBundle(typed,descriptor).findings.length,0);
  }
  const source=readFileSync(new URL('../scripts/audit-world-claim-coverage.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/fetch\s*\(|createClient\s*\(|\.rpc\s*\(/u);
});
