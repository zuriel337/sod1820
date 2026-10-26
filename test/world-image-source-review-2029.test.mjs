import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readNumericResidualBatch, readImageSourceReview, readImageSourceReceipt,
  replayImageSourceReview, buildImageSourceReport, buildImageSourceReceiptSql,
  assertReadOnly } from '../scripts/audit-world-corpus-residual.mjs';

const evidence=readImageSourceReview(), receipt=readImageSourceReceipt();
const report=buildImageSourceReport(evidence,receipt);
const row=prefix=>report.rows.find(r=>r.id.startsWith(prefix));
const calculation=(prefix,key)=>row(prefix).calculations.find(c=>c.key===key);

test('seven follow-ups are exactly the old OCR queue, not seven additional findings',()=>{
  const prior=readNumericResidualBatch();
  assert.deepEqual(report.rows.map(r=>r.id),prior.reviewPlan.filter(p=>p.kind==='media').map(p=>p.id));
  for(const r of evidence.rows) assert.deepEqual(r,prior.rows.find(old=>old.id===r.id));
  assert.deepEqual(report.counts,{reviewed:7,newCorpusRecords:0,imagesInspected:6,imageAccessHeld:1,
    calculations:26,canonicalChecks:30,byRecommendation:{'דורש בדיקה':4,'דורש OCR או תמלול':1,'מתאים לעץ':2},
    newFindings:0,promoted:0,deleted:0});
});

test('six exact public image URLs carry byte fingerprints and bounded candidate transcriptions',()=>{
  const inspected=report.rows.filter(r=>r.media.inspected);
  assert.equal(new Set(inspected.map(r=>r.media.sha256)).size,6);
  for(const r of inspected){
    assert.equal(r.sourceImage,evidence.sources.find(s=>s.id===r.sourceId).image_url);
    assert.match(r.media.sha256,/^[a-f0-9]{64}$/u);
    assert.ok(r.media.bytes>0 && r.regions.length>0);
    assert.equal(r.transcription.fullImage,false); assert.equal(r.transcription.humanApproved,false);
    assert.equal(r.transcription.status,'candidate_region_transcription');
  }
});

test('nonpublic storage object is never fetched or treated as inspected, even with a public parent',()=>{
  const r=row('0b289');
  assert.equal(r.sourceImage,null); assert.equal(r.media.inspected,false);
  assert.equal(r.media.downloadAttempted,false); assert.equal(r.media.sha256,null);
  assert.equal(r.regions.length,0); assert.equal(r.target,null);
  assert.equal(r.recommendation,'דורש OCR או תמלול');
  assert.equal(calculation('0b289','old_beah').trace.computed,77);
  assert.equal(calculation('0b289','old_beah').diagnosticOnly,true);
  assert.equal(evidence.storageChecks[0].public,false);
});

test('98 uses exact visual spelling and never silently repairs the stored identity',()=>{
  assert.equal(calculation('052c','ikuv').expression,'עכוב');
  assert.equal(calculation('052c','ikuv').verification,'match');
  assert.equal(calculation('052c','old_aqov').trace.computed,178);
  assert.equal(calculation('052c','old_lekulam').trace.computed,126);
  assert.match(row('052c').originalStatement,/עקוב/);
  assert.equal(row('052c').recommendation,'דורש בדיקה');
  assert.equal(row('052c').target,null);
});

test('a supported interpretation is not geometry and does not inherit another numeric target',()=>{
  const r=row('0923');
  assert.equal(calculation('0923','verse').trace.computed,3060);
  assert.equal(calculation('0923','six_directions').trace.computedTotal,3060);
  assert.equal(r.interpretationVerified,false); assert.equal(r.geometry.type,null);
  assert.equal(r.target,null); assert.equal(evidence.rows.find(x=>x.id===r.id).value,6);
});

test('pentagon labels remain separate; a correct derivation cannot repair the wrong old claim',()=>{
  assert.equal(calculation('0b5e','good').verification,'engine_result');
  assert.equal(calculation('0b5e','good').claimed,null);
  assert.equal(calculation('0b5e','side').trace.computedTotal,612);
  assert.equal(calculation('0b5e','perimeter').trace.computedTotal,3060);
  assert.equal(calculation('0b5e','old_join').trace.computedTotal,22644);
  assert.equal(calculation('0b5e','old_join').verification,'mismatch');
  assert.equal(row('0b5e').geometry.visibleSides,5); assert.equal(row('0b5e').geometry.verified,false);
  assert.equal(row('0b5e').target,null);
});

test('1254 and 1486 recommendations keep derivation, excerpt and illustration distinct',()=>{
  assert.equal(row('0bc3').target.label,'1254'); assert.equal(row('0d94').target.label,'1486');
  assert.equal(calculation('0bc3','tastes').trace.computed,209);
  assert.equal(calculation('0bc3','six_tastes').trace.computedTotal,1254);
  assert.equal(calculation('0bc3','six_tastes').constructed,true);
  assert.equal(calculation('0bc3','six_tastes').extractionIntegrity.fidelityStatus,'partial');
  assert.equal(row('0bc3').geometry.visibleFaces,3); assert.equal(row('0bc3').geometry.verified,false);
  assert.equal(calculation('0d94','ark').expression,'מעלים את ארון ברית י-ה-ו-ה');
  assert.doesNotMatch(calculation('0d94','ark').expression,/בחצצרות/);
});

test('triangle mismatch survives successful canonical parity and an adjoining matched pentagon',()=>{
  assert.equal(calculation('0e47','middle').trace.computed,777);
  assert.equal(calculation('0e47','middle').claimed,765);
  assert.equal(calculation('0e47','triangle_total').trace.computedTotal,3072);
  assert.equal(calculation('0e47','triangle_total').verification,'mismatch');
  assert.equal(calculation('0e47','pentagon_caption').verification,'match');
  assert.equal(row('0e47').target,null);
  assert.ok(receipt.engine_replays.every(r=>r.computed===r.expected && r.method_in_engine));
});

test('embedded visual reuse preserves both sources and distinct claims, never independent evidence',()=>{
  const g=report.visualReuse[0];
  assert.deepEqual(g.findingIds,[row('0b5e').id,row('0e47').id]);
  assert.equal(g.fullerContextFindingId,row('0e47').id);
  assert.equal(g.retainOriginalDetailFindingId,row('0b5e').id);
  assert.equal(g.sameFinding,false); assert.equal(g.byteIdentical,false);
  assert.equal(g.merge,false); assert.equal(g.suppress,false); assert.equal(g.independentSourcesAdded,0);
  assert.ok(report.rows.every(r=>r.identityOverlapIds.length===0));
});

test('all axes stay separate and no public projection or product write is authorized',()=>{
  for(const r of report.rows){
    for(const k of ['strength','score','scoreTargetId','sourceCount'])assert.equal(r[k],null);
    for(const k of ['execute','suppress','automaticPromotion','publicationChanged','interpretationVerified'])assert.equal(r[k],false);
    assert.equal(r.independentSourcesAdded,0); assert.ok(r.retainIds.includes(r.id));
  }
  const sql=buildImageSourceReceiptSql(evidence);
  assert.equal(assertReadOnly(sql),sql);
  assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE|ALTER|GRANT|CREATE|CALL)\b|;/iu);
  assert.match(sql,/public\.fn_method_value/);
  assert.match(sql,/ro\.privacy_scope='public'/);
  assert.match(sql,/person_only/); assert.match(sql,/old_chat/); assert.match(sql,/or-geula/);
  const script=readFileSync(new URL('../scripts/audit-world-corpus-residual.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(script,/\bfetch\s*\(|createClient\(|\.rpc\(/u);
});

test('missing IDs, image substitution, unsupported tokens and private-media bypass fail closed',()=>{
  for(const mutate of [
    e=>e.rows.pop(), e=>e.reviewPlan.pop(), e=>{e.rows[0].status='candidate';},
    e=>{e.sources[0].image_url+='other';},e=>{e.reviewPlan[0].media.sourceLocator='other';},
    e=>{e.reviewPlan[0].media.sha256=null;},e=>{e.reviewPlan[0].regions[0].box[0]=2;},
    e=>{e.reviewPlan[0].calculations[0].expression='ביטוי שלא בתמונה';},
    e=>{e.reviewPlan[2].media.inspected=true;},e=>{e.storageChecks[0].public=true;},
    e=>{e.reviewPlan[2].media.downloadAttempted=true;},
    e=>{e.reviewPlan[2].calculations[0].diagnosticOnly=false;},
    e=>{e.reviewPlan[3].calculations[2].constructed=false;},
    e=>{e.reviewPlan[6].recommendation='מתאים לעץ';},
    e=>{e.visualReuse[0].sameFinding=true;},e=>{e.visualReuse[0].sourceIds.reverse();},
    e=>{e.reviewPlan[0].score=0;},
    e=>{e.reviewPlan[0].transcription.humanApproved=true;},
  ]) {const changed=structuredClone(evidence);mutate(changed);assert.throws(()=>buildImageSourceReport(changed,receipt));}
});

test('live privacy, identity, source, target and engine drift invalidate the offline review',()=>{
  for(const mutate of [r=>r.claims.pop(),r=>{r.claims[0].admitted=false;},
    r=>{r.claims[0].general_scope=false;},r=>{r.claims[0].exact_source=false;},
    r=>{r.claims[0].exact_claim=false;},r=>{r.claims[0].claim_uid+='x';},
    r=>{r.claims[4].targets=[];},r=>{r.engine_replays[0].computed++;},
    r=>{r.engine_replays[0].phrase='other';},r=>{r.methods[0].in_engine=false;}]){
    const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>buildImageSourceReport(evidence,changed));
  }
});
