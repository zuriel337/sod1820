import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectSourceFamilyRows,buildSourceFamilyReadSql,readSourceFamilyReview,readSourceFamilyReceipt,
  replaySourceFamilyReview,buildSourceFamilyReceiptSql,buildSourceFamilyReport,sourceTextReviewFingerprint,
  readSourceTextReview,readContinuationEvidence,assertReadOnly} from '../scripts/audit-world-corpus-residual.mjs';

const evidence=readSourceFamilyReview(),receipt=readSourceFamilyReceipt(),report=buildSourceFamilyReport();
const row=n=>report.rows[n-1],atom=(n,text)=>row(n).calculations.find(c=>c.expression===text);

test('162 new IDs close the remaining claims of 39 sources, without recounting previous manual records',()=>{
  assert.equal(report.rows.length,162);assert.equal(evidence.sources.length,39);
  assert.equal(new Set(report.rows.map(r=>r.id)).size,162);
  assert.deepEqual(report.rows.map(r=>r.id),selectSourceFamilyRows().map(r=>r.id));
  const done=new Set([...readSourceTextReview().rows,...readContinuationEvidence().manualReviews].map(r=>r.id));
  assert.ok(report.rows.every(r=>!done.has(r.id)));
  assert.deepEqual(evidence.pages.map(p=>p.ids.length),[40,40,40,40,2]);
});

test('bounded SQL reuses public source, identity and method gates; null does not become zero',()=>{
  for(const sql of [buildSourceFamilyReceiptSql(),...Array.from({length:5},(_,i)=>buildSourceFamilyReadSql(i))]) {
    assert.equal(assertReadOnly(sql),sql);
    for(const t of ["ro.status='approved'","ro.privacy_scope='public'","ro.promoted_node_id IS NULL",
      "ro.meta#>'{ext,revision}' IS NULL","person_only","old_chat","or-geula",
      "cu.status='live'","cu.page_only IS FALSE","torat-haremez","c66f0464-0928-490e-be9b-66d8a87e7fc8"])assert.ok(sql.includes(t));
    assert.doesNotMatch(sql,/SELECT\s+\*|\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/iu);
  }
  assert.match(buildSourceFamilyReceiptSql(),/ro\.value IS NOT DISTINCT FROM s\.value/u);
  assert.throws(()=>buildSourceFamilyReadSql(-1));assert.throws(()=>buildSourceFamilyReadSql(5));
  assert.throws(()=>buildSourceFamilyReadSql(0.5));
});

test('21 atomic and nine compound checks have 37 live canonical leaf matches',()=>{
  assert.equal(report.counts.atomicChecks,21);assert.equal(report.counts.compoundChecks,9);
  assert.equal(report.counts.canonicalChecks,37);assert.equal(receipt.engine_replays.length,37);
  assert.ok(receipt.engine_replays.every(c=>c.computed===c.expected && c.method==='רגיל' && c.method_in_engine));
  assert.equal(receipt.evidenceFingerprint,sourceTextReviewFingerprint(evidence));
  const counts=report.rows.flatMap(r=>r.calculations).reduce((a,c)=>(a[c.verification]=(a[c.verification]||0)+1,a),{});
  assert.deepEqual(counts,{system_calculation:7,match:15,mismatch:8});
  assert.equal(report.rows.flatMap(r=>r.calculations).filter(c=>c.extractionIntegrity?.fidelityStatus==='partial').length,5);
});

test('only three exact numeric scopes are recommended; no whole-source or publication approval',()=>{
  assert.deepEqual(report.counts.byRecommendation,{'דורש בדיקה':108,'דורש מקור':8,'כפילות':26,'לא מתאים':14,'דורש OCR או תמלול':3,'מתאים לעץ':3});
  const ready=report.rows.filter(r=>r.target);
  assert.deepEqual(ready.map(r=>r.target.label),['374','802','585']);
  assert.deepEqual(ready.map(r=>r.id),[row(30).id,row(80).id,row(133).id]);
  for(const r of ready)assert.ok(r.calculations.every(c=>c.verification==='match' && (!c.extractionIntegrity || c.extractionIntegrity.fidelityStatus==='complete')));
  for(const r of report.rows) {
    for(const k of ['strength','score','scoreTargetId','sourceCount'])assert.equal(r[k],null);
    for(const k of ['wholeSourceVerified','interpretationVerified','corpusCountsVerified','automaticPromotion','publicationChanged','suppress','execute'])assert.equal(r[k],false);
    assert.equal(r.independentSourcesAdded,0);assert.equal(r.requiresGovernedRepresentation,true);
  }
});

test('25 source representations preserve the full source and are not canonical finding-identity merges',()=>{
  const copies=report.rows.filter(r=>r.category==='source_representation');assert.equal(copies.length,25);
  assert.equal(copies.filter(r=>r.fullSourceCopy).length,10);
  assert.equal(copies.filter(r=>r.fullSourceCopy===false).length,15);
  for(const r of copies) {
    const s=evidence.sources.find(s=>s.id===r.sourceId);
    assert.ok(s.text.startsWith(r.title));assert.equal(r.fullerSource,`channel_updates:${s.id}`);
    assert.ok(r.retainIds.includes(r.id));assert.equal(r.target,null);
  }
  assert.equal(report.repeatedSourceTexts.length,2);
  assert.deepEqual(report.repeatedSourceTexts.map(g=>g.sourceIds.length),[3,2]);
  assert.ok(report.repeatedSourceTexts.every(g=>!g.merge && !g.suppress && g.fullerTextVersion===null));
  assert.ok(report.rows.every(r=>r.identityOverlapIds.length===0));
});

test('517 is only overlapping calculation scope; prior source and both finding IDs survive',()=>{
  assert.equal(row(141).recommendation,'כפילות');assert.equal(row(141).category,'numeric_scope_overlap');
  assert.equal(row(141).duplicateOf,'31c9d826-871d-448b-8a2d-e974941e45b1');
  assert.equal(row(141).target,null);assert.equal(row(141).suppress,false);
  assert.equal(row(141).calculations[0].expression,'אמונה+ מעשה=517');
});

test('questions, interpretation and occurrence counts are not verified gematria or new number targets',()=>{
  assert.equal(report.counts.byCategory.research_question,14);assert.equal(report.counts.byCategory.interpretation,67);
  assert.equal(report.counts.byCategory.corpus_count,15);
  for(const r of report.rows.filter(r=>['research_question','interpretation','corpus_count','corpus_interpretation'].includes(r.category))) {
    assert.equal(r.target,null);assert.equal(r.numericScopeComplete,false);assert.equal(r.calculations.length,0);
  }
  assert.match(row(139).reason,/עמכם/u);assert.match(row(159).reason,/משמאל לימין/u);
  assert.match(row(117).reason,/לא את השמות אסתר ורות/u);assert.match(row(5).reason,/אין לייחס לרש״י/u);
});

test('salvaging the 802 verse never salvages the mismatched phrase, and abbreviations are not engine operands',()=>{
  const verse=row(80).calculations[0];assert.equal(verse.computed,802);assert.match(verse.expression,/יְ֭הֹוָה/u);
  assert.doesNotMatch(verse.expression,/ה׳/u);
  assert.equal(atom(82,'אב הרחמן').computed,306);assert.equal(row(82).target,null);
  for(const n of [36,99,111])assert.equal(atom(n,'וענו כל העם אמן ואמן').computed,485);
  for(const n of [40,154])assert.equal(atom(n,'הללויה אל בקדשו הללוהו ברקיע עזו').computed,1076);
  assert.equal(atom(160,'כי חפץ חסד').computed,280);
});

test('source internal conflicts stay held: shin/letter shin and naot/binaot are not silent repairs',()=>{
  assert.equal(atom(95,'שין').computed,360);assert.equal(atom(95,'ש').computed,300);
  assert.equal(row(95).calculations.find(c=>c.type==='compound').verification,'match');assert.equal(row(95).target,null);
  assert.equal(atom(116,'נאות דשא').computed,762);assert.equal(atom(116,'בנאות דשא').computed,764);
  assert.equal(atom(116,'נאות דשא').verification,'mismatch');
  assert.equal(atom(26,'זכות אבות').computed,842);assert.equal(atom(152,'ורפא ירפא').computed,578);
  for(const n of [55,81])assert.equal(atom(n,'א').computed,1);
});

test('missing media, different OCR and partial origins cannot inherit text-only readiness',()=>{
  for(const n of [16,51,152])assert.equal(row(n).recommendation,'דורש OCR או תמלול');
  assert.notEqual(row(16).title,row(51).title);assert.equal(row(16).duplicateOf,null);assert.equal(row(51).duplicateOf,null);
  for(const n of [53,62,96,120,158]) {
    assert.equal(row(n).calculations[0].extractionIntegrity.fidelityStatus,'partial');assert.equal(row(n).target,null);
  }
  assert.ok(report.rows.every(r=>!r.media.inspected));
});

test('source, scope, access, coverage, copy and numeric recommendation tampering fail closed',()=>{
  for(const mutate of [e=>e.rows.pop(),e=>e.reviews.pop(),e=>e.pages.pop(),e=>{e.pages[0].ids.reverse();},
    e=>{e.rows[0].finding.privacy_scope='private';},e=>{e.rows[0].finding.status='candidate';},
    e=>{e.rows[0].finding.revision={};},e=>{e.sources[0].text+='x';},e=>{e.sources[0].channel='or-geula';},
    e=>{e.sources[0].page_only=true;},e=>{e.families[0].priorReviewIds=[];},
    e=>{e.reviews[79].checks[0].operandSpan.start++;},e=>{e.reviews[79].checks[0].method='מילוי';},
    e=>{e.reviews[0].recommendation='מתאים לעץ';},e=>{e.reviews[94].recommendation='מתאים לעץ';},
    e=>{e.reviews[95].recommendation='מתאים לעץ';e.reviews[95].numericScopeComplete=true;},
    e=>{e.rows[5].finding.statement='not the source';},e=>{e.reviews[140].overlapPriorId=e.rows[0].id;},
    e=>{e.reviews[0].wholeSourceVerified=true;}]) {
    const changed=structuredClone(evidence);mutate(changed);assert.throws(()=>replaySourceFamilyReview(changed));
  }
  const changed=structuredClone(evidence);changed.reviews[0].reason+=' changed';
  assert.throws(()=>buildSourceFamilyReport(changed,receipt));
});

test('fresh receipt rejects source/identity/target/method drift and inaccessible public scopes',()=>{
  for(const mutate of [r=>r.claims.pop(),r=>{r.claims[0].admitted=false;},r=>{r.claims[0].general_scope=false;},
    r=>{r.claims[0].exact_claim=false;},r=>{r.claims[0].exact_source=false;},r=>{r.claims[0].claim_uid+='x';},
    r=>{r.claims.find(c=>c.id===row(30).id).targets=[];},r=>r.engine_replays.pop(),
    r=>{r.engine_replays[0].computed++;},r=>{r.methods[0].in_engine=false;},r=>{r.evidenceFingerprint='wrong';}]) {
    const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>buildSourceFamilyReport(evidence,changed));
  }
});

test('handoff preserves every ID/locator, typed counters and unsent Zvi questions, without a runtime executor',()=>{
  const doc=readFileSync(new URL('../docs/reviews/world-source-family-review-20261026.md',import.meta.url),'utf8');
  for(const r of report.rows){assert.ok(doc.includes(r.id));assert.ok(doc.includes(r.sourceRef));}
  for(const text of ['2,680','211','ההודעה לא נשלחה','762','360','אין שינוי DB מוצר'])assert.ok(doc.includes(text));
  const script=readFileSync(new URL('../scripts/audit-world-corpus-residual.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(script,/fetch\s*\(|createClient\s*\(|\.rpc\s*\(/u);
  assert.equal(report.counts.promoted,0);assert.equal(report.counts.deleted,0);
});
