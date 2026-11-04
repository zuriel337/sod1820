import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectCompactSourceRows,buildCompactSourceReadSql,readCompactSourceReview,readCompactSourceReceipt,
  replaySourceFamilyReview,buildSourceFamilyReceiptSql,buildSourceFamilyReport,sourceTextReviewFingerprint,
  readSourceTextReview,readSourceFamilyReview,readContinuationEvidence,assertReadOnly} from '../scripts/audit-world-corpus-residual.mjs';

const evidence=readCompactSourceReview(),receipt=readCompactSourceReceipt();
const report=buildSourceFamilyReport(evidence,receipt);
const row=prefix=>report.rows.find(r=>r.id.startsWith(prefix));
const plan=(e,prefix)=>e.reviews.find(r=>r.id.startsWith(prefix));
const atom=(prefix,text)=>row(prefix).calculations.find(c=>c.expression===text);

test('119 new records cover all remaining claims of the selected 40 full text sources, not only matching claims',()=>{
  assert.equal(report.rows.length,119);assert.equal(evidence.sources.length,40);
  assert.equal(new Set(report.rows.map(r=>r.id)).size,119);
  assert.deepEqual(report.rows.map(r=>r.id),selectCompactSourceRows().map(r=>r.id));
  const previous=readContinuationEvidence();
  const done=new Set([...previous.manualReviews,...readSourceTextReview().rows,...readSourceFamilyReview().rows].map(r=>r.id));
  assert.equal(done.size,211);assert.ok(report.rows.every(r=>!done.has(r.id)));
  const sourceIds=new Set(evidence.sources.map(s=>s.id));
  assert.deepEqual(report.rows.map(r=>r.id),previous.rows.filter(r=>!done.has(r.id) && sourceIds.has(r.finding.source_id)).map(r=>r.id));
  assert.deepEqual(evidence.pages.map(p=>p.ids.length),[40,40,39]);
  assert.ok(evidence.sources.every(s=>!s.image_url && !/\[Image |OCR מהמדיה|📷/u.test(s.text)));
  assert.deepEqual(evidence.sources.map(s=>s.id),[...evidence.sources].sort((a,b)=>a.text.length-b.text.length || a.id.localeCompare(b.id)).map(s=>s.id));
  assert.equal(done.size+report.rows.length,330);assert.equal(previous.rows.length-330,2561);
});

test('all source and receipt queries are bounded read-only and reuse exact public admission gates',()=>{
  for(const sql of [buildSourceFamilyReceiptSql(evidence),...Array.from({length:3},(_,i)=>buildCompactSourceReadSql(i))]) {
    assert.equal(assertReadOnly(sql),sql);
    for(const token of ["ro.status='approved'","ro.privacy_scope='public'","ro.promoted_node_id IS NULL",
      "ro.meta#>'{ext,revision}' IS NULL","person_only","old_chat","or-geula","cu.status='live'",
      "cu.page_only IS FALSE","torat-haremez","c66f0464-0928-490e-be9b-66d8a87e7fc8"])assert.ok(sql.includes(token));
    assert.doesNotMatch(sql,/SELECT\s+\*|\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/iu);
  }
  assert.match(buildSourceFamilyReceiptSql(evidence),/ro\.value IS NOT DISTINCT FROM s\.value/u);
  for(const page of [-1,0.5,3,NaN])assert.throws(()=>buildCompactSourceReadSql(page));
});

test('64 atomic and 22 compound replays retain 90 exact canonical leaf checks and both explicit methods',()=>{
  assert.equal(report.counts.atomicChecks,64);assert.equal(report.counts.compoundChecks,22);
  assert.equal(report.counts.canonicalChecks,90);assert.equal(receipt.engine_replays.length,90);
  assert.ok(receipt.engine_replays.every(c=>c.expected===c.computed && c.method_in_engine));
  assert.deepEqual(new Set(receipt.methods.map(m=>m.method_key)),new Set(['רגיל','מילוי']));
  assert.equal(receipt.evidenceFingerprint,sourceTextReviewFingerprint(evidence));
  const counts=report.rows.flatMap(r=>r.calculations).reduce((a,c)=>(a[c.verification]=(a[c.verification]||0)+1,a),{});
  assert.deepEqual(counts,{match:52,system_calculation:27,mismatch:7});
  assert.equal(report.rows.flatMap(r=>r.calculations).filter(c=>c.extractionIntegrity?.fidelityStatus==='partial').length,17);
});

test('six numeric scopes use four existing targets, without ratings, publication or whole-source approval',()=>{
  assert.deepEqual(report.counts.byRecommendation,{'דורש בדיקה':86,'כפילות':8,'דורש מקור':14,'לא מתאים':5,'מתאים לעץ':6});
  const ready=report.rows.filter(r=>r.target);
  assert.equal(ready.length,6);assert.equal(new Set(ready.map(r=>r.sourceId)).size,4);
  assert.deepEqual(new Set(ready.map(r=>r.target.label)),new Set(['444','204','1365','760']));
  for(const r of ready)assert.ok(r.numericScopeComplete && r.calculations.every(c=>c.verification==='match'
    && (!c.extractionIntegrity || c.extractionIntegrity.fidelityStatus==='complete')));
  for(const r of report.rows) {
    for(const key of ['strength','score','scoreTargetId','sourceCount'])assert.equal(r[key],null);
    for(const key of ['wholeSourceVerified','interpretationVerified','corpusCountsVerified','automaticPromotion','publicationChanged','suppress','execute'])assert.equal(r[key],false);
    assert.equal(r.independentSourcesAdded,0);assert.equal(r.requiresGovernedRepresentation,true);
  }
  assert.equal(report.counts.promoted,0);assert.equal(report.counts.deleted,0);
});

test('the complete 444/204 scopes retain repeated operands and distinguish nested scope from independent evidence',()=>{
  for(const prefix of ['85b21a53','daeaa82e']) {
    const c=row(prefix).calculations[0];assert.equal(c.expression,'נצח+נצח+נצח=444');
    assert.deepEqual(c.trace.operands.map(o=>o.value),[148,148,148]);
    assert.equal(c.extractionIntegrity.fidelityStatus,'complete');
  }
  assert.equal(atom('dc8accba','צדיק').computed,204);
  assert.equal(row('dc8accba').calculations.length,2);assert.equal(row('774d2f5c').calculations.length,1);
  assert.equal(row('774d2f5c').sourceId,row('dc8accba').sourceId);
});

test('495 is not 494, and exact verse spellings are not silently repaired to hit a target',()=>{
  assert.equal(atom('c3a84c2a','מתנה').computed,495);
  assert.equal(atom('cc96c607','כי ברך אברכך').computed,495);
  assert.equal(atom('792a2164','גדול י-ה-ו-ה ומהלל מאד ולגדולתו אין חקר').computed,1079);
  assert.equal(atom('9a06aabc','למען יחלצון ידידיך הודיעה ימינך וענני').computed,858);
  for(const p of ['b8a7fdbf','c3a84c2a','cc96c607','792a2164','9a06aabc','e0dfcdf2']) {
    assert.equal(row(p).target,null);assert.ok(row(p).calculations.some(c=>c.verification==='mismatch'));
  }
});

test('lost multiplication is an extraction problem, not an invented source assertion or canonical 444 word value',()=>{
  const c=atom('a6e80bc9','ועד');assert.equal(c.computed,80);assert.equal(c.claimed,null);
  assert.equal(c.verification,'system_calculation');assert.equal(row('a6e80bc9').category,'lost_operator');
  assert.equal(row('66e5cc98').calculations[0].expression,'ו ×עד=6×74=444');
  assert.equal(row('66e5cc98').calculations[0].computed,444);assert.equal(row('66e5cc98').target,null);
  assert.equal(atom('6bc60dc4','ברחמים גדולים').computed,393);
  assert.equal(atom('6bc60dc4','ברחמים גדולים').claimed,null);assert.equal(row('6bc60dc4').target,null);
});

test('milui is explicitly source-named, canonical 553 stays distinct from source 32x17 and existing correction 859',()=>{
  for(const p of ['5a9d3224','d9907546','a77cd33c']) {
    const c=atom(p,'בינה');assert.equal(c.method,'מילוי');assert.equal(c.computed,553);
    assert.equal(c.claimed,null);assert.equal(c.verification,'system_calculation');assert.equal(row(p).target,null);
  }
  assert.equal(atom('5a9d3224','אשה').computed,306);
  assert.equal(row('a77cd33c').category,'existing_correction');
  assert.match(row('a77cd33c').reason,/אינה מקור נוסף|אין להוסיף מקור/u);
});

test('partial origins, malformed source equations and matched leaves never inherit readiness',()=>{
  for(const p of ['2b24f4be','32fb8a1d','1ebe1970','80c9599e','16cd1e37','45c60cc9','3ffa0114','66e5cc98','5b43f839','8c0d66b8']) {
    assert.ok(row(p).calculations.some(c=>c.extractionIntegrity?.fidelityStatus==='partial'));
    assert.equal(row(p).target,null);assert.equal(row(p).numericScopeComplete,false);
  }
  for(const p of ['962d509f','71e779c4','f31dd8ea','3bc6febf','6133bc93']) {
    assert.equal(row(p).target,null);assert.ok(row(p).calculations.every(c=>c.type==='atomic'));
  }
  assert.equal(atom('f31dd8ea','שמע ישראל י-הוה  אלהינו י-הוה אחד').computed,1118);
  assert.equal(atom('c333212d','כי גדול י-ה-ו-ה ומהלל מאד נורא הוא על כל אלהים').computed,760);
});

test('eight source representations preserve six full texts and two longer originals without deletion',()=>{
  const copies=report.rows.filter(r=>r.category==='source_representation');assert.equal(copies.length,8);
  assert.equal(copies.filter(r=>r.fullSourceCopy).length,6);
  assert.equal(copies.filter(r=>r.fullSourceCopy===false).length,2);
  for(const r of copies) {
    const source=evidence.sources.find(s=>s.id===r.sourceId);
    assert.ok(source.text.startsWith(r.title));assert.equal(r.fullerSource,`channel_updates:${source.id}`);
    assert.ok(r.retainIds.includes(r.id));assert.equal(r.target,null);
  }
  assert.deepEqual(report.repeatedSourceTexts,[]);
  const near=evidence.sources.filter(s=>['f45d749f-9153-4bfb-afb6-2b83eedf0ea0','31e50e11-a9d1-49ac-a357-a7b245ec5613'].includes(s.id));
  assert.equal(near.length,2);assert.notEqual(near[0].text,near[1].text);
});

test('one 3060 canonical identity collision retains both differing representations and exact fragment locators',()=>{
  const first=row('1ebe1970'),second=row('80c9599e');
  assert.deepEqual(first.identityOverlapIds,[second.id]);assert.deepEqual(second.identityOverlapIds,[first.id]);
  assert.ok(first.sourceRef.endsWith('#batch0'));assert.equal(second.sourceRef,first.sourceRef.split('#')[0]);
  assert.deepEqual(first.retainIds,[first.id,second.id]);assert.deepEqual(second.retainIds,[second.id,first.id]);
  assert.notEqual(evidence.rows.find(r=>r.id===first.id).finding.kind,evidence.rows.find(r=>r.id===second.id).finding.kind);
  assert.equal(first.target,null);assert.equal(second.target,null);assert.equal(first.duplicateOf,null);
  assert.equal(report.rows.filter(r=>r.identityOverlapIds.length).length,2);
});

test('corpus counts, lexical assumptions, questions and interpretation stay separate from numeric verification',()=>{
  assert.equal(report.counts.byCategory.research_question,5);assert.equal(report.counts.byCategory.corpus_count,11);
  assert.equal(report.counts.byCategory.interpretation,32);assert.equal(report.counts.byCategory.corpus_interpretation,1);
  for(const r of report.rows.filter(r=>['research_question','corpus_count','interpretation','corpus_interpretation'].includes(r.category))) {
    assert.equal(r.target,null);assert.equal(r.numericScopeComplete,false);assert.equal(r.calculations.length,0);
  }
  assert.equal(atom('24013608','מתחתם').computed,888);assert.equal(row('24013608').category,'lexical_claim');
  assert.equal(row('24013608').target,null);assert.match(row('24013608').reason,/מ\/ם/u);
  assert.match(row('58fba85b').reason,/אין לנחש/u);
});

test('scope, source, public admission, bounds, method and unsupported recommendations fail closed',()=>{
  for(const mutate of [e=>e.rows.pop(),e=>e.reviews.pop(),e=>e.pages.pop(),e=>{e.pages[0].ids.reverse();},
    e=>{e.scope='unknown';},e=>{e.rows[0].finding.privacy_scope='private';},e=>{e.rows[0].finding.status='candidate';},
    e=>{e.rows[0].finding.revision={};},e=>{e.sources[0].text+='x';},e=>{e.sources[0].channel='or-geula';},
    e=>{e.sources[0].page_only=true;},e=>{e.families[0].priorReviewIds=['invented'];},
    e=>{plan(e,'dc8accba').checks[0].operandSpan.start++;},e=>{plan(e,'dc8accba').checks[0].method='מילוי';},
    e=>{plan(e,'dc8accba').checks[0].claimed=999;},e=>{plan(e,'774d2f5c').compoundSlices[0].sourceSpan.start++;},
    e=>{plan(e,'1ebe1970').recommendation='מתאים לעץ';plan(e,'1ebe1970').numericScopeComplete=true;},
    e=>{plan(e,'792a2164').recommendation='מתאים לעץ';plan(e,'792a2164').numericScopeComplete=true;},
    e=>{plan(e,'a77cd33c').recommendation='מתאים לעץ';plan(e,'a77cd33c').numericScopeComplete=true;},
    e=>{e.rows.find(r=>r.id.startsWith('0db59b5f')).finding.statement='not a source copy';},
    e=>{plan(e,'dc8accba').overlapPriorId='invented';},e=>{e.reviews[0].wholeSourceVerified=true;}]) {
    const changed=structuredClone(evidence);mutate(changed);assert.throws(()=>replaySourceFamilyReview(changed));
  }
  const changed=structuredClone(evidence);changed.reviews[0].reason+=' changed';
  assert.throws(()=>buildSourceFamilyReport(changed,receipt));
});

test('receipt rejects source, exact identity, canonical method, target and public access drift',()=>{
  for(const mutate of [r=>r.claims.pop(),r=>{r.claims[0].admitted=false;},r=>{r.claims[0].general_scope=false;},
    r=>{r.claims[0].exact_claim=false;},r=>{r.claims[0].exact_source=false;},r=>{r.claims[0].claim_uid+='x';},
    r=>{r.claims.find(c=>c.id===row('dc8accba').id).targets=[];},r=>r.engine_replays.pop(),
    r=>{r.engine_replays[0].computed++;},r=>{r.methods[0].in_engine=false;},r=>{r.evidenceFingerprint='wrong';},
    r=>{r.claims.find(c=>c.id===row('1ebe1970').id).identity_overlaps[0].claim_uid='wrong';}]) {
    const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>buildSourceFamilyReport(evidence,changed));
  }
});

test('handoff contains every locator and unsent source questions; acceptance is not live application',()=>{
  const doc=readFileSync(new URL('../docs/reviews/world-compact-source-review-20261026.md',import.meta.url),'utf8');
  for(const r of report.rows){assert.ok(doc.includes(r.id));assert.ok(doc.includes(r.sourceRef));}
  for(const text of ['2,561','330','ההודעה לא נשלחה','אין שינוי DB מוצר','495','1079','858','553','35 רשומות הצפנים'])assert.ok(doc.includes(text));
  assert.equal(evidence.userAcceptanceScope,'numeric_recommendations_only_no_live_application');
  assert.deepEqual(evidence.userAcceptedPriorRecommendationIds,['34274703-9996-4656-8298-8f58020db319','9a3e5ac4-31b0-4e42-af34-786d4d7a64f4','dc91dc8f-aa82-45ea-9d52-59cdb8068bb7']);
  const script=readFileSync(new URL('../scripts/audit-world-corpus-residual.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(script,/fetch\s*\(|createClient\s*\(|\.rpc\s*\(/u);
});
