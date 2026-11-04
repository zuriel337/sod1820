import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractCompoundClaims } from '../src/lib/triage.js';
import { readNumericResidualBatch, readNumericResidualBatch2, readNumericResidualReceipt2,
  selectNextNumericResidualIds, replayNumericResidualBatch, buildNumericResidualReview,
  buildNumericResidualReceiptSql, assertReadOnly } from '../scripts/audit-world-corpus-residual.mjs';

const evidence=readNumericResidualBatch2(), receipt=readNumericResidualReceipt2();
const report=buildNumericResidualReview(evidence,receipt,2);
const byPrefix=p=>report.rows.find(r=>r.id.startsWith(p));
const clone=structuredClone;

test('batch two is exactly the next 40 of 624, disjoint from 219 replays and the first 40',()=>{
  const previous=JSON.parse(readFileSync(new URL('../docs/reviews/world-corpus-residual-evidence-20261026.json',import.meta.url)));
  const done=new Set([...previous.replays,...readNumericResidualBatch().rows].map(r=>r.id));
  const remaining=previous.partitions.filter(p=>p.lane==='gematria').flatMap(p=>p.ids).filter(id=>!done.has(id)).sort();
  assert.equal(remaining.length,624);
  assert.deepEqual(report.rows.map(r=>r.id),remaining.slice(0,40));
  assert.deepEqual(selectNextNumericResidualIds(2),remaining.slice(0,40));
  assert.throws(()=>selectNextNumericResidualIds(3),/Unknown fixed/);
  assert.equal(report.counts.sourceMessages,37);
  assert.deepEqual(report.counts.byRecommendation,{'דורש בדיקה':29,'דורש מקור':3,'דורש OCR או תמלול':6,'מתאים לעץ':2});
});

test('only the explicit 888 equation and nine direct 888 values are recommended, without publishing',()=>{
  const ready=report.rows.filter(r=>r.target);
  assert.deepEqual(ready.map(r=>r.id),['16d70688-f981-4a51-b45b-6b15f6a2537a','17a79968-00d3-4088-87cf-bfb610eece7f']);
  for(const r of ready) {
    assert.equal(r.target.id,'b44b3787-6a16-49ea-82bd-a99e7f41e262');
    assert.equal(r.target.label,'888');
    assert.ok(r.calculations.every(c=>c.verification==='match' && !c.diagnosticOnly));
  }
  assert.equal(byPrefix('16d7').calculations[0].extractionIntegrity.fidelityStatus,'complete');
  assert.equal(byPrefix('17a7').calculations.length,9);
  for(const r of report.rows) {
    for(const k of ['strength','score','scoreTargetId','sourceCount']) assert.equal(r[k],null);
    for(const k of ['automaticPromotion','publicationChanged','execute','suppress','interpretationVerified','corpusCountVerified']) assert.equal(r[k],false);
    assert.equal(r.independentSourcesAdded,0); assert.ok(r.retainIds.includes(r.id));
    if(r.recommendation!=='מתאים לעץ')assert.equal(r.target,null);
  }
});

test('47 calculations include ten mismatches, with parity against 54 live canonical leaves',()=>{
  assert.equal(report.counts.withCalculationReplay,24);
  assert.equal(report.counts.calculations,47);
  assert.equal(report.counts.canonicalChecks,54);
  assert.equal(report.rows.flatMap(r=>r.calculations).filter(c=>c.verification==='mismatch').length,10);
  assert.ok(receipt.engine_replays.every(r=>r.computed===r.expected && r.method_in_engine));
  assert.deepEqual(receipt.methods.map(m=>m.method_key).sort(),['מילוי','רגיל'].sort());
});

test('source spelling and mixed families do not inherit truth from a correct neighbor',()=>{
  for(const [p,claimed,actual] of [['132b',675,731],['1386',580,585],['14bf',681,861],['180e',417,803]]) {
    const c=byPrefix(p).calculations[0];assert.equal(c.claimed,claimed);assert.equal(c.trace.computed,actual);
    assert.equal(c.verification,'mismatch');assert.equal(byPrefix(p).target,null);
  }
  assert.deepEqual(byPrefix('10ae').calculations.map(c=>c.trace.computed),[98,98,68]);
  assert.deepEqual(byPrefix('1790').calculations.map(c=>c.trace.computed),[489,485,489]);
  const spelling=byPrefix('152a').calculations;
  assert.deepEqual(spelling.map(c=>c.trace.computed),[720,714]);
  assert.deepEqual(spelling.map(c=>c.diagnosticOnly),[false,true]);
  assert.ok(spelling[0].expression.includes('יבואו'));assert.ok(spelling[1].expression.includes('יבאו'));
});

test('milui uses its actual operand and explicit source method, never method shopping or title-as-input',()=>{
  for(const [p,phrase,claimed,computed] of [['1819','אליו',170,227],['1882','משה קבל',1118,1127]]) {
    const c=byPrefix(p).calculations[0];
    assert.equal(c.expression,phrase);assert.equal(c.method,'מילוי');
    assert.equal(c.claimed,claimed);assert.equal(c.trace.computed,computed);
    assert.match(c.sourceSpan.excerpt,/מילוי/u);
    assert.equal(byPrefix(p).target,null);
  }
  for(const alter of [e=>{e.reviewPlan.find(p=>p.id.startsWith('1819')).calculations[0].method='גדול';},
    e=>{const c=e.reviewPlan.find(p=>p.id.startsWith('1819')).calculations[0];c.sourceSpan={start:0,end:4,excerpt:'אליו'};}]) {
    const changed=clone(evidence);alter(changed);assert.throws(()=>replayNumericResidualBatch(changed,2));
  }
});

test('legacy value-to-word association is a diagnostic, not a source quotation or correction',()=>{
  const r=byPrefix('18a0'), c=r.calculations[0];
  assert.equal(c.expression,'שמחה');assert.equal(c.claimed,102);assert.equal(c.trace.computed,353);
  assert.equal(c.diagnosticOnly,true);assert.ok(c.diagnosticReason.length>0);
  assert.equal(r.calculations[1].trace.result,455);assert.equal(r.target,null);
  assert.equal(byPrefix('19fb').calculations[0].expression,'צ');
  assert.equal(byPrefix('19fb').calculations[0].trace.computed,90);
  assert.equal(byPrefix('19fb').target,null);
  for(const key of ['diagnosticOnly','diagnosticReason']) {
    const changed=clone(evidence);delete changed.reviewPlan.find(p=>p.id.startsWith('18a0')).calculations[0][key];
    assert.throws(()=>replayNumericResidualBatch(changed,2));
  }
});

test('counts, history and interpretation remain separate from number calculations',()=>{
  const counts=report.rows.filter(r=>r.kind==='corpus_count');assert.equal(counts.length,4);
  for(const r of counts)assert.equal(r.calculations.length,0);
  assert.equal(report.rows.filter(r=>r.recommendation==='דורש מקור').length,3);
  assert.match(byPrefix('112e').reason,/3.*46/u);
  assert.equal(byPrefix('1701').calculations[0].verification,'match');
  assert.equal(byPrefix('1701').corpusCountVerified,false);assert.equal(byPrefix('1701').target,null);
  const local=byPrefix('1675');assert.equal(local.calculations.length,4);
  assert.equal(local.calculations.filter(c=>c.expression.includes('י-ה-ו-ה')).length,3);
  assert.equal(local.corpusCountVerified,false);
  for(const r of report.rows.filter(r=>r.kind==='interpretation'))assert.equal(r.target,null);
});

test('six uninspected media cases never use cached OCR as source evidence',()=>{
  const media=report.rows.filter(r=>r.kind==='media');assert.equal(media.length,6);
  for(const r of media) {
    assert.equal(r.recommendation,'דורש OCR או תמלול');assert.equal(r.calculations.length,0);
    assert.equal(r.media.inspected,false);assert.equal(r.target,null);assert.ok(r.sourceImage);
  }
  assert.equal(media.filter(r=>r.sourceImage.startsWith('storage-object:')).length,2);
  assert.deepEqual(byPrefix('14f4').media.markers,['[Image 918.jpg]']);
  assert.deepEqual(byPrefix('1b26').media.markers,['[Image 4090.jpg]']);
});

test('prose operations and unresolved numeric inputs are not rewritten into ready derivations',()=>{
  assert.deepEqual(extractCompoundClaims('הדר+יצחק בגימטריא: 417'),[]);
  assert.deepEqual(extractCompoundClaims('ענן בגימטריא 10 פעמים טו"ב'),[]);
  for(const p of ['12e2','14f4','1562','1b26']) {
    const c=byPrefix(p).calculations.find(c=>c.type==='compound');
    assert.equal(c.verification,'match');assert.equal(c.extractionIntegrity.fidelityStatus,'partial');
    assert.equal(byPrefix(p).target,null);
  }
  for(const p of ['10bc','1165','1242','12e2','1406','14f4','1562','1567','1675','1701','1758','1819','182c','1882','18a0','19fb']) {
    const changed=clone(evidence);changed.reviewPlan.find(r=>r.id.startsWith(p)).recommendation='מתאים לעץ';
    assert.throws(()=>replayNumericResidualBatch(changed,2),/Unready/);
  }
});

test('identical 888 source texts are occurrences, while different claims remain preserved',()=>{
  assert.equal(report.repeatedSourceTexts.length,1);
  const group=report.repeatedSourceTexts[0];
  assert.deepEqual(group.sourceIds,['75116953-d22b-4ba2-8aa8-5c5633b49a21','d0d58a89-6c6f-4888-aab7-2d92875e0d23']);
  assert.equal(group.merge,false);assert.equal(group.independentSourcesAdded,0);
  const sources=group.sourceIds.map(id=>evidence.sources.find(s=>s.id===id));
  assert.equal(sources[0].text,sources[1].text);assert.equal(sources[0].text.length,sources[1].text.length);
  assert.notEqual(byPrefix('16d7').title,byPrefix('17a7').title);
  assert.ok(report.rows.every(r=>r.identityOverlapIds.length===0));
});

test('910 overlaps an earlier reviewed equation but does not become an automatic identity merge',()=>{
  const old=readNumericResidualBatch(), current=byPrefix('1165');
  const prior=old.rows.find(r=>r.id==='01e5230c-8eba-410a-ba96-bc83dc240e35');
  const row=evidence.rows.find(r=>r.id===current.id);
  assert.equal(row.source_uid,prior.source_uid);assert.equal(row.value,prior.value);
  assert.notEqual(row.claim_uid,prior.claim_uid);
  assert.equal(current.calculations[0].expression,old.reviewPlan.find(p=>p.id===prior.id).calculations[0].expression);
  assert.equal(evidence.sources.find(s=>s.id===row.source_id).md5,old.sources.find(s=>s.id===prior.source_id).md5);
  assert.equal(current.target,null);assert.equal(current.suppress,false);
  assert.equal(current.recommendedFullestIdentityVersion,null);
});

test('read-only receipt is bounded to selected IDs and only the methods actually checked',()=>{
  const sql=buildNumericResidualReceiptSql(evidence,2);assert.equal(assertReadOnly(sql),sql);
  assert.match(sql,/WHERE m.method_key IN \(SELECT DISTINCT method FROM leaves\)/u);
  assert.match(sql,/public\.fn_research_source_uid\(other.source_ref\)=s.source_uid/u);
  assert.match(sql,/public\.fn_research_claim_uid\(other.statement\)=public\.fn_research_claim_uid\(ro.statement\)/u);
  assert.doesNotMatch(sql,/;|\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|DO|SET)\b/iu);
  const script=readFileSync(new URL('../scripts/audit-world-corpus-residual.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(script,/fetch\s*\(|createClient\s*\(|\.rpc\s*\(/u);
  assert.equal(report.execute,false);assert.equal(report.counts.promoted,0);assert.equal(report.counts.deleted,0);
});

test('missing IDs, source spans, access changes and invented scores fail closed',()=>{
  for(const alter of [e=>e.rows.pop(),e=>e.rows.push(e.rows[0]),e=>e.reviewPlan.pop(),
    e=>{e.rows[0].status='candidate';},e=>{e.rows[0].privacy_scope='private';},
    e=>{e.sources[0].channel='or-geula';},e=>{e.sources[0].page_only=true;},
    e=>{e.sources[0].text+='drift';},e=>{e.rows[0].revision={};},
    e=>{e.reviewPlan[4].calculations[0].sourceSpan.end++;},
    e=>{e.reviewPlan[0].score=100;},e=>{e.reviewPlan[0].sourceCount=2;},
    e=>{e.reviewPlan[0].automaticPromotion=true;},e=>{e.reviewPlan[0].strength='חזק';}]) {
    const changed=clone(evidence);alter(changed);assert.throws(()=>replayNumericResidualBatch(changed,2));
  }
});

test('canonical receipt rejects scope, identity, target, replay and method drift',()=>{
  for(const alter of [r=>r.claims.pop(),r=>r.claims.push(r.claims[0]),
    ...['admitted','general_scope','exact_claim','exact_source'].map(k=>r=>{r.claims[0][k]=false;}),
    r=>{r.claims[0].source_ref='other';},r=>{r.claims[0].targets=[];},
    r=>r.engine_replays.pop(),r=>r.engine_replays.push(r.engine_replays[0]),
    r=>{r.engine_replays[0].computed++;},r=>{r.engine_replays[0].method='רגיל אחר';},
    r=>{r.engine_replays[0].method_in_engine=false;},r=>r.methods.pop(),
    r=>r.methods.push(r.methods[0]),r=>{r.methods[0].in_engine=false;}]) {
    const changed=clone(receipt);alter(changed);assert.throws(()=>buildNumericResidualReview(evidence,changed,2));
  }
});
