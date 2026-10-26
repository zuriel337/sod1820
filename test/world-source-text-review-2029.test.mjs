import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectSourceTextReviewRows,buildSourceTextReviewReadSql,readSourceTextReview,
  readSourceTextReceipt,replaySourceTextReview,buildSourceTextReceiptSql,buildSourceTextReport,
  sourceTextReviewFingerprint,assertReadOnly,validateContinuationReceipt} from '../scripts/audit-world-corpus-residual.mjs';

const evidence=readSourceTextReview(),receipt=readSourceTextReceipt(),report=buildSourceTextReport();
const row=n=>report.rows[n-1];
const atom=(n,expression)=>row(n).calculations.find(c=>c.expression===expression);

test('the next 40 are source-bound candidates, disjoint from the nine previous manual recommendations',()=>{
  const prior=validateContinuationReceipt(),ids=selectSourceTextReviewRows().map(r=>r.id);
  assert.equal(ids.length,40);assert.equal(new Set(ids).size,40);
  assert.deepEqual(report.rows.map(r=>r.id),ids);
  assert.equal(prior.rows.filter(r=>r.reason==='matched_operand_is_not_full_claim_verification').length,42);
  assert.ok(prior.rows.filter(r=>r.manualReview).every(r=>!ids.includes(r.id)));
  assert.equal(evidence.sources.length,39);
});

test('the source refresh and live receipt reuse bounded public-only SELECT gates',()=>{
  for(const sql of [buildSourceTextReviewReadSql(),buildSourceTextReceiptSql()]) {
    assert.equal(assertReadOnly(sql),sql);
    for(const token of ["ro.status='approved'","ro.privacy_scope='public'","ro.promoted_node_id IS NULL",
      "ro.meta#>'{ext,revision}' IS NULL","person_only","old_chat","or-geula",
      "cu.status='live'","cu.page_only IS FALSE","torat-haremez","c66f0464-0928-490e-be9b-66d8a87e7fc8"])assert.ok(sql.includes(token));
    assert.doesNotMatch(sql,/SELECT\s+\*|\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/iu);
  }
});

test('136 atomic checks and 13 source equations have 161 exact live canonical leaf replays',()=>{
  assert.equal(report.counts.atomicChecks,136);assert.equal(report.counts.compoundChecks,13);
  assert.equal(report.counts.canonicalChecks,161);assert.equal(receipt.engine_replays.length,161);
  assert.ok(receipt.engine_replays.every(c=>c.computed===c.expected && c.method_in_engine && c.method==='רגיל'));
  assert.equal(receipt.evidenceFingerprint,sourceTextReviewFingerprint(evidence));
  for(const r of report.rows)for(const c of r.calculations) {
    const s=evidence.sources.find(s=>s.id===r.sourceId);
    const p=c.type==='atomic'?c.operandSpan:c.sourceSpan;
    assert.equal(s.text.slice(p.start,p.end),c.expression);
  }
});

test('ten scoped numeric recommendations use eight existing targets and never approve surrounding stories',()=>{
  assert.deepEqual(report.counts.byRecommendation,{'דורש בדיקה':24,'מתאים לעץ':10,'דורש מקור':3,'דורש OCR או תמלול':2,'כפילות':1});
  const ready=report.rows.filter(r=>r.target);assert.equal(ready.length,10);
  assert.equal(new Set(ready.map(r=>r.target.id)).size,8);
  assert.deepEqual(ready.map(r=>r.target.label),['517','580','940','552','466','580','466','170','190','345']);
  for(const r of report.rows) {
    assert.equal(r.wholeSourceVerified,false);assert.equal(r.interpretationVerified,false);assert.equal(r.corpusCountsVerified,false);
    assert.equal(r.strength,null);assert.equal(r.score,null);assert.equal(r.scoreTargetId,null);assert.equal(r.sourceCount,null);
    assert.equal(r.independentSourcesAdded,0);assert.equal(r.automaticPromotion,false);assert.equal(r.execute,false);
    assert.equal(r.suppress,false);assert.equal(r.publicationChanged,false);assert.equal(r.requiresGovernedRepresentation,true);
  }
});

test('an operation is not direct gematria and implicit operand values are not invented source assertions',()=>{
  const sum=row(2).calculations.find(c=>c.type==='compound');
  assert.equal(sum.expression,'אמונה+ מעשה=517');assert.equal(sum.verification,'match');
  assert.equal(sum.extractionIntegrity.fidelityStatus,'complete');
  assert.equal(atom(2,'אמונה').computed,102);assert.equal(atom(2,'אמונה').claimed,null);
  assert.equal(atom(10,'י-ה-ו-ה').verification,'system_calculation');
  assert.equal(atom(18,'טו"ב').verification,'system_calculation');
  assert.equal(atom(11,'ורפא ירפא').computed,578);assert.equal(atom(11,'ורפא ירפא').claimed,null);
  assert.match(row(11).reason,/שני הכוללים/u);assert.equal(row(11).target,null);
});

test('literal spelling mismatches survive matched neighbors, repeated sources and corrected imported summaries',()=>{
  for(const n of [1,3,21,33])assert.equal(atom(n,'וענו כל העם אמן ואמן').computed,485);
  for(const n of [9,28])assert.equal(atom(n,'הללויה אל בקדשו הללוהו ברקיע עזו').computed,1076);
  assert.equal(atom(12,'כי חפץ חסד').computed,280);assert.equal(atom(30,'אב הרחמן').computed,306);
  assert.equal(atom(40,'ראש השנה').computed,861);
  assert.equal(report.rows.flatMap(r=>r.calculations).filter(c=>c.verification==='mismatch').length,9);
  for(const n of [1,3,9,12,21,28,30,40])assert.equal(row(n).target,null);
});

test('missing origins, prose average/multipliers, corpus counts and interpretation stay unresolved',()=>{
  for(const n of [4,8,10,16,17,18,19,22,23,24,25,27,29,34,35,36,37,38])assert.equal(row(n).target,null);
  assert.equal(row(18).calculations.find(c=>c.type==='compound').extractionIntegrity.fidelityStatus,'partial');
  assert.equal(row(38).calculations.find(c=>c.type==='compound').expression,'421+421=842');
  assert.match(row(38).reason,/פער חילוץ/u);
  assert.equal(atom(35,'ומום איך בך').computed,145); // No silent איך→אין repair.
  assert.ok(row(23).calculations.every(c=>!c.expression.includes('ובוטח'))); // Preserve embedded + ambiguity.
  assert.equal(row(25).calculations.filter(c=>c.type==='compound').length,0); // No new average parser.
});

test('text-only readiness never erases missing original media or declares the whole source complete',()=>{
  for(const n of [11,26,31]) {assert.equal(row(n).media.markers.length,1);assert.equal(row(n).media.imageUrl,null);}
  assert.equal(row(36).media.imageUrl,evidence.sources.find(s=>s.id===row(36).sourceId).image_url);
  assert.ok(report.rows.every(r=>r.media.inspected===false));
  assert.equal(row(31).recommendation,'מתאים לעץ');assert.equal(row(31).wholeSourceVerified,false);
});

test('duplicate numeric family keeps both locators, while same text and semantic overlap do not merge identities',()=>{
  assert.equal(row(13).recommendation,'כפילות');assert.equal(row(13).duplicateOf,row(5).id);
  assert.equal(row(13).target,null);assert.notEqual(row(13).sourceRef,row(5).sourceRef);
  assert.equal(report.repeatedSourceTexts.length,2);
  assert.deepEqual(report.repeatedSourceTexts.map(g=>g.sourceIds.length),[3,2]);
  assert.ok(report.repeatedSourceTexts.every(g=>!g.merge && !g.suppress && g.fullerTextVersion===null));
  assert.ok(report.rows.every(r=>r.identityOverlapIds.length===0));
  assert.notEqual(row(14).sourceMd5,row(20).sourceMd5);assert.equal(row(14).target.id,row(20).target.id);
});

test('snapshot, source spans, access, method and unready scope changes fail closed',()=>{
  for(const mutate of [e=>e.rows.pop(),e=>e.reviews.pop(),e=>{e.rows[0].finding.privacy_scope='private';},
    e=>{e.rows[0].finding.status='candidate';},e=>{e.rows[0].finding.revision={};},
    e=>{e.sources[0].text+='x';},e=>{e.sources[0].page_only=true;},e=>{e.sources[0].channel='or-geula';},
    e=>{e.reviews[1].checks[0].method='מילוי';},e=>{e.reviews[1].checks[0].operandSpan.start++;},
    e=>{e.reviews[1].checks[0].claimed=999;},e=>{e.reviews[0].recommendation='מתאים לעץ';},
    e=>{e.reviews[24].recommendation='מתאים לעץ';},e=>{e.reviews[0].wholeSourceVerified=true;},
    e=>{e.reviews[12].duplicateOf=e.rows[0].id;}]) {
    const changed=structuredClone(evidence);mutate(changed);
    assert.throws(()=>replaySourceTextReview(changed));assert.throws(()=>buildSourceTextReport(changed,receipt));
  }
});

test('live receipt rejects source, identity, target, privacy and engine drift',()=>{
  for(const mutate of [r=>r.claims.pop(),r=>{r.claims[0].general_scope=false;},r=>{r.claims[0].admitted=false;},
    r=>{r.claims[0].exact_source=false;},r=>{r.claims[0].source_ref+='drift';},r=>{r.claims[1].targets=[];},
    r=>r.engine_replays.pop(),r=>{r.engine_replays[0].computed++;},r=>{r.engine_replays[0].method='מילוי';},
    r=>{r.methods[0].in_engine=false;},r=>{r.evidenceFingerprint='drift';}]) {
    const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>buildSourceTextReport(evidence,changed));
  }
});

test('report preserves all 40 IDs and the offline audit has no DB or HTTP executor',()=>{
  const doc=readFileSync(new URL('../docs/reviews/world-source-text-review-20261026.md',import.meta.url),'utf8');
  for(const r of report.rows)assert.ok(doc.includes(r.id));
  for(const phrase of ['1076','280','306','161','אין שינוי','שני הכוללים'])assert.ok(doc.includes(phrase));
  const script=readFileSync(new URL('../scripts/audit-world-corpus-residual.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(script,/fetch\s*\(|createClient\s*\(|\.rpc\s*\(/u);
  assert.equal(report.counts.promoted,0);assert.equal(report.counts.deleted,0);
});
