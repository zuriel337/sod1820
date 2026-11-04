import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectContinuationRows, buildContinuationReadSql, readContinuationEvidence,
  readContinuationReceipt, screenContinuation, buildContinuationReplaySql,
  validateContinuationReceipt, continuationFingerprint, assertReadOnly } from '../scripts/audit-world-corpus-residual.mjs';

const evidence=readContinuationEvidence(), receipt=readContinuationReceipt();
const report=validateContinuationReceipt(evidence,receipt);
const byId=id=>report.rows.find(r=>r.id===id);

test('73 bounded pages cover the exact 2891 remaining IDs once, without claiming full manual review',()=>{
  const selection=selectContinuationRows();
  assert.equal(selection.length,2891);assert.equal(new Set(selection.map(r=>r.id)).size,2891);
  assert.equal(evidence.pages.length,73);assert.equal(evidence.pages.at(-1).ids.length,11);
  assert.ok(evidence.pages.every(p=>p.ids.length<=40));
  assert.deepEqual(evidence.pages.flatMap(p=>p.ids),selection.map(r=>r.id));
  assert.equal(report.screeningOnly,true);assert.equal(report.manualReviewCompleted,false);
  assert.deepEqual(report.counts.byLane,{formula:278,text_insight:1908,els:35,spatial:71,language:8,gematria:584,constants:5,media_ocr:2});
  assert.equal(report.counts.sources,763);assert.equal(report.counts.accessHeld,0);
});

test('read SQL is bounded, public-only, source-bound, and never reads private content on failed admission',()=>{
  for(const page of [0,20,72]) {
    const sql=buildContinuationReadSql(page);assert.equal(assertReadOnly(sql),sql);
    for(const gate of ["ro.status='approved'","ro.privacy_scope='public'","ro.promoted_node_id IS NULL",
      "ro.meta#>'{ext,revision}' IS NULL","'person_only'","'old_chat'","'or-geula'",
      "cu.status='live'","cu.page_only IS FALSE","cu.channel='torat-haremez'",
      "cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'"]) assert.ok(sql.includes(gate));
    assert.match(sql,/WHERE cu.id IN \(SELECT source_id FROM admitted\)/u);
    assert.match(sql,/LEFT JOIN admitted/u);
    assert.doesNotMatch(sql,/SELECT\s+\*|\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/iu);
  }
  for(const p of [-1,0.5,73,NaN])assert.throws(()=>buildContinuationReadSql(p));
});

test('source-line candidates are engine diagnostics, not approved author claims',()=>{
  assert.equal(report.checks.length,630);assert.equal(report.inputs.length,394);
  assert.equal(report.counts.matchingCandidates,509);assert.equal(report.counts.mismatchingCandidates,121);
  for(const c of report.checks) {
    const source=evidence.sources.find(s=>s.id===c.sourceId);
    assert.equal(source.text.slice(c.sourceSpan.start,c.sourceSpan.end),c.sourceSpan.excerpt);
    assert.ok(c.sourceSpan.excerpt.includes(c.expression));assert.equal(c.sourceMd5,source.md5);
    assert.equal(c.extractionVerified,false);assert.equal(c.sourceClaimVerified,false);
    assert.ok(['רגיל','מילוי'].includes(c.method));
  }
  // A known extraction pitfall must never be attributed as an author math error.
  const c=report.checks.find(c=>c.sourceSpan.excerpt==='שבת בגימטריא 27 הוויות.');
  assert.equal(c.expression,'שבת');assert.equal(c.claimed,27);assert.equal(c.computed,702);
  assert.equal(c.sourceClaimVerified,false);
  assert.equal(byId('3ffa0114-29c7-4777-a0d9-4ee4528e2c31').target,null);
});

test('all 394 unique engine inputs have bounded live canonical parity without method fallback',()=>{
  assert.equal(receipt.pages.length,10);assert.equal(receipt.pages.at(-1).checks.length,34);
  assert.ok(receipt.pages.every(p=>p.checks.length<=40));
  const checks=receipt.pages.flatMap(p=>p.checks);
  assert.equal(checks.length,394);assert.equal(new Set(checks.map(c=>c.key)).size,394);
  assert.ok(checks.every(c=>c.expected===c.computed && c.in_engine));
  const sql=buildContinuationReplaySql(0,evidence);assert.equal(assertReadOnly(sql),sql);
  assert.match(sql,/public\.fn_method_value\(i.method,i.phrase\)/u);
  assert.throws(()=>buildContinuationReplaySql(10,evidence));
});

test('nine manual numeric recommendations cover all stated operands and do not verify geometry or interpretation',()=>{
  const ready=report.rows.filter(r=>r.manualReview);assert.equal(ready.length,9);
  assert.equal(new Set(ready.map(r=>r.target.id)).size,7);
  for(const r of ready) {
    assert.equal(r.recommendation,'מתאים לעץ');assert.equal(r.manualReview.scope,'literal_numeric_claim_only');
    assert.equal(r.manualReview.geometryVerified,false);assert.equal(r.manualReview.interpretationVerified,false);
    assert.equal(r.manualReview.publicationChanged,false);assert.equal(r.manualReview.calculationScopeVerified,true);
    assert.equal(r.mediaInspected,false);assert.equal(r.automaticPromotion,false);
  }
  assert.deepEqual(byId('2674b117-5b22-4876-b502-9ae0fbe082ec').manualReview.expressions,['אחות קטנה','אליך ישברו','תפלטני']);
  for(const r of report.rows) {
    assert.equal(r.strength,null);assert.equal(r.score,null);assert.equal(r.sourceCount,null);
    assert.equal(r.independentSourcesAdded,0);assert.equal(r.sourceClaimVerified,false);
    assert.equal(r.execute,false);assert.equal(r.suppress,false);assert.equal(r.publicationChanged,false);
  }
});

test('matched keywords cannot approve mixed families, historical counts, hypotheses, or substituted operands',()=>{
  for(const mutate of [e=>{e.manualReviews[0].expressions=['כתר'];},
    e=>{e.manualReviews[0].scope='whole_story';},e=>{e.manualReviews[0].geometryVerified=true;},
    e=>{e.manualReviews[0].interpretationVerified=true;},e=>{e.manualReviews[0].publicationChanged=true;},
    e=>e.manualReviews.push(e.manualReviews[0]),
    e=>{e.manualReviews[0]={...e.manualReviews[0],id:'75804bde-5918-4151-ab4d-b7d6b62923fd',expressions:['מי']};},
    e=>{e.manualReviews[0]={...e.manualReviews[0],id:'c84dad0c-e760-4a7e-b7d2-9ece8fa4eee1',expressions:['יום תבר מגל','ושפט בצדק דלים','בונה ירושלם י-ה-ו-ה']};}]) {
    const changed=structuredClone(evidence);mutate(changed);assert.throws(()=>screenContinuation(changed));
  }
});

test('57 identical-text groups and six canonical identity collisions preserve every occurrence',()=>{
  assert.equal(report.repeatedSourceTexts.length,57);
  assert.equal(report.repeatedSourceTexts.reduce((n,g)=>n+g.sourceIds.length,0),124);
  for(const g of report.repeatedSourceTexts) {
    const sources=g.sourceIds.map(id=>evidence.sources.find(s=>s.id===id));
    assert.ok(sources.every(s=>s.text===sources[0].text && s.text.trim()!=='📷 עדכון'));
    assert.equal(g.fullerVersion,null);assert.equal(g.independentSourcesAdded,0);assert.equal(g.merge,false);
  }
  assert.equal(report.identityGroups.length,6);
  for(const g of report.identityGroups) {
    assert.equal(g.findingIds.length,2);assert.ok(g.findingIds.includes(g.longestStatementId));
    assert.equal(g.fullContentInterchangeable,false);assert.equal(g.merge,false);assert.equal(g.suppress,false);
    const rows=g.findingIds.map(byId);assert.equal(rows[0].sourceUid,rows[1].sourceUid);assert.equal(rows[0].claimUid,rows[1].claimUid);
  }
});

test('431 media-only rows and 35 cipher rows stay unresolved without using keyword gematria as evidence',()=>{
  assert.equal(report.rows.filter(r=>r.reason==='uninspected_media_source').length,431);
  const els=report.rows.filter(r=>r.lane==='els');assert.equal(els.length,35);
  assert.ok(els.every(r=>r.target===null && r.sourceClaimVerified===false));
  for(const r of report.rows.filter(r=>r.reason==='uninspected_media_source')) {
    assert.equal(r.recommendation,'דורש OCR או תמלול');assert.equal(r.target,null);assert.equal(r.mediaInspected,false);
  }
  assert.equal(receipt.storageChecks.length,3);
  assert.ok(receipt.storageChecks.every(c=>c.public===false && c.downloadAttempted===false));
});

test('constant replay keeps rounded values separate from exact equality and missing-image source verification',()=>{
  assert.equal(report.constantDiagnostics.length,5);
  const matched=report.constantDiagnostics.filter(c=>c.diagnostic.state==='rounded_match');
  assert.equal(matched.length,3);assert.deepEqual(matched.map(c=>c.diagnostic.roundedComputed),[15.15,23.14,36.46]);
  for(const c of report.constantDiagnostics) {
    assert.equal(c.sourceVerified,false);assert.equal(c.mediaInspected,false);assert.equal(c.scope,'imported_statement_only');
    assert.equal(c.automaticPromotion,false);assert.equal(byId(c.id).target,null);
    if(c.diagnostic.state==='rounded_match') {
      assert.equal(c.diagnostic.isApproximation,true);assert.notEqual(c.diagnostic.computed,c.diagnostic.claimed);
    } else assert.equal(c.diagnostic.computed,null);
  }
});

test('snapshot checksum, public admission, page coverage and source text fail closed on drift',()=>{
  assert.equal(receipt.inventoryFingerprint,continuationFingerprint(evidence));
  for(const mutate of [e=>e.rows.pop(),e=>e.pages.pop(),e=>{e.pages[0].ids.reverse();},
    e=>{e.rows[0].finding.statement+='drift';},e=>{e.rows[0].finding.privacy_scope='private';},
    e=>{e.rows[0].finding.status='candidate';},e=>{e.rows[0].finding.revision={};},
    e=>{e.rows.find(r=>r.id===e.manualReviews[0].id).finding.targets=[];},e=>{e.sources[0].text+='drift';},
    e=>{e.sources[0].channel='or-geula';},e=>{e.sources[0].page_only=true;}]) {
    const changed=structuredClone(evidence);mutate(changed);assert.throws(()=>validateContinuationReceipt(changed,receipt));
  }
});

test('missing, duplicated, unavailable or mismatching canonical receipts never pass',()=>{
  for(const mutate of [r=>r.pages.pop(),r=>r.pages[0].checks.pop(),
    r=>r.pages[0].checks.push(r.pages[0].checks[0]),r=>{r.pages[0].checks[0].computed++;},
    r=>{r.pages[0].checks.push(r.pages[1].checks.shift());},
    r=>{r.pages[0].checks[0].in_engine=false;},r=>{r.pages[0].checks[0].method='other';},
    r=>{r.pages[0].engine_definition_md5='different';},r=>{r.inventoryFingerprint='different';}]) {
    const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>validateContinuationReceipt(evidence,changed));
  }
});

test('clarification draft has precise source locators, no automatic send, and no attribution of extraction errors to Zvi',()=>{
  const draft=readFileSync(new URL('../docs/reviews/world-zvi-clarification-request-20261026.md',import.meta.url),'utf8');
  for(const token of ['4121','4107','3949','וישבתם בטח','474+85+1','ולדבקה בו','לא נשלחה הודעה אוטומטית'])assert.ok(draft.includes(token));
  assert.ok(draft.includes('אין לשלוח את 121 אי־ההתאמות'));
  const script=readFileSync(new URL('../scripts/audit-world-corpus-residual.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(script,/fetch\s*\(|createClient\s*\(|\.rpc\s*\(/u);
  assert.equal(report.counts.promoted,0);assert.equal(report.counts.deleted,0);
});
