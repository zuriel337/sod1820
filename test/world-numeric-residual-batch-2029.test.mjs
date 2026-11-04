import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readNumericResidualBatch, readNumericResidualReceipt, selectNextNumericResidualIds,
  replayNumericResidualBatch, buildNumericResidualReceiptSql, buildNumericResidualReview,
  assertReadOnly } from '../scripts/audit-world-corpus-residual.mjs';

const evidence=readNumericResidualBatch(), receipt=readNumericResidualReceipt();
const report=buildNumericResidualReview(evidence,receipt);
const byPrefix=prefix=>report.rows.find(r=>r.id.startsWith(prefix));

test('exact next 40 have stable order and do not reuse any of the previous 219 replays', () => {
  const previous=JSON.parse(readFileSync(new URL('../docs/reviews/world-corpus-residual-evidence-20261026.json',import.meta.url)));
  const done=new Set(previous.replays.map(r=>r.id));
  assert.equal(previous.partitions.filter(p=>p.lane==='gematria').flatMap(p=>p.ids).filter(id=>!done.has(id)).length,664);
  assert.deepEqual(report.rows.map(r=>r.id),selectNextNumericResidualIds());
  assert.equal(new Set(report.rows.map(r=>r.id)).size,40);
  assert.ok(report.rows.every(r=>!done.has(r.id)));
  assert.deepEqual(report.counts.byRecommendation,{'מתאים לעץ':4,'דורש בדיקה':27,'דורש OCR או תמלול':7,'דורש מקור':2});
});

test('four recommendations are exact calculation slices to existing unique targets, never truth/publication scores', () => {
  const ready=report.rows.filter(r=>r.target);
  assert.deepEqual(ready.map(r=>r.target.label),['1820','910','86','760']);
  for(const row of ready) {
    assert.equal(row.recommendation,'מתאים לעץ');
    assert.ok(row.calculations.every(c=>c.verification==='match'
      && c.extractionIntegrity.fidelityStatus==='complete' && c.extractionScope==='source_span_only'));
  }
  for(const row of report.rows) {
    assert.equal(row.score,null); assert.equal(row.scoreTargetId,null); assert.equal(row.strength,null);
    assert.equal(row.sourceCount,null); assert.equal(row.independentSourcesAdded,0);
    assert.equal(row.automaticPromotion,false); assert.equal(row.execute,false);
    assert.equal(row.publicationChanged,false); assert.equal(row.suppress,false);
    assert.equal(row.interpretationVerified,false); assert.equal(row.corpusCountVerified,false);
    assert.ok(row.retainIds.includes(row.id));
    if(row.recommendation!=='מתאים לעץ')assert.equal(row.target,null);
  }
  assert.match(byPrefix('0352').calculations[0].expression,/חיים.*חי.*אל-הים/);
  assert.doesNotMatch(byPrefix('0352').calculations[0].expression,/החותך/);
});

test('source spelling mismatches survive successful canonical replay parity', () => {
  const pairs=[['04c1',1032,1042],['04d0',1030,1024],['05ce',1154,858],['0601',1406,1412]];
  for(const [prefix,claimed,computed] of pairs) {
    const r=byPrefix(prefix), c=r.calculations.find(c=>c.type==='atomic');
    assert.equal(c.claimed,claimed); assert.equal(c.trace.computed,computed);
    assert.equal(c.verification,'mismatch'); assert.equal(r.target,null);
  }
  for(const prefix of ['0bea','0c8e']) {
    assert.deepEqual(byPrefix(prefix).calculations.filter(c=>c.verification==='mismatch').map(c=>c.trace.computed),[803,445]);
  }
  assert.equal(report.rows.flatMap(r=>r.calculations).filter(c=>c.verification==='mismatch').length,8);
});

test('counts and historical claims are not checked by gematria of their keywords', () => {
  const counts=report.rows.filter(r=>r.kind==='corpus_count');
  assert.equal(counts.length,5);
  for(const r of counts) {
    assert.equal(r.calculations.length,0); assert.equal(r.target,null); assert.equal(r.corpusCountVerified,false);
  }
  assert.equal(byPrefix('0c1d').kind,'historical_count');
  assert.equal(byPrefix('0c1d').recommendation,'דורש מקור');
  assert.equal(byPrefix('0ce2').recommendation,'דורש מקור');
});

test('image-only sources remain OCR work even when old intake says OCR was used; missing markers survive', () => {
  const media=report.rows.filter(r=>r.kind==='media');
  assert.equal(media.length,7);
  for(const r of media) {
    assert.equal(r.recommendation,'דורש OCR או תמלול'); assert.equal(r.calculations.length,0);
    assert.equal(r.media.inspected,false); assert.ok(r.sourceImage); assert.equal(r.target,null);
  }
  assert.deepEqual(byPrefix('04d0').media.markers,['[Image 3472.jpg]']);
  assert.deepEqual(byPrefix('091f').media.markers,['[Image 2943.jpg]']);
  assert.deepEqual(byPrefix('0da6').media.markers,['[Image 627.jpg]']);
  assert.equal(byPrefix('01e5').media.inspected,false);
  assert.equal(byPrefix('01e5').calculations[0].extractionScope,'source_span_only');
});

test('repeated source texts do not collapse different claims or become independent evidence', () => {
  assert.equal(report.repeatedSourceTexts.length,2);
  assert.deepEqual(report.repeatedSourceTexts.map(g=>g.findingIds.length).sort(),[2,3]);
  for(const group of report.repeatedSourceTexts) {
    assert.equal(group.sourceTextOnly,true); assert.equal(group.merge,false); assert.equal(group.independentSourcesAdded,0);
    assert.ok(group.sourceIds.every(id=>evidence.sources.find(s=>s.id===id).text!=='📷 עדכון'));
  }
  assert.equal(byPrefix('08f0').sourceId,byPrefix('0aef').sourceId);
  assert.notEqual(byPrefix('08f0').kind,byPrefix('0aef').kind);
  assert.ok(report.rows.every(r=>r.identityOverlapIds.length===0));
});

test('longest identity representation is advisory only; semantic overlap is not deletion authority', () => {
  const changed=structuredClone(receipt), c=changed.claims[0], original=evidence.rows.find(r=>r.id===c.id);
  c.identity_overlaps=[{...original,id:'00000000-0000-4000-8000-000000000001',statement:original.statement+'  '}];
  const r=buildNumericResidualReview(evidence,changed).rows[0];
  assert.equal(r.recommendedFullestIdentityVersion,c.identity_overlaps[0].id);
  assert.equal(r.suppress,false); assert.equal(r.execute,false); assert.equal(r.retainIds.length,2);
  c.identity_overlaps[0].value++;
  assert.equal(buildNumericResidualReview(evidence,changed).rows[0].recommendedFullestIdentityVersion,null);
  c.identity_overlaps[0].claim_uid='another claim';
  assert.throws(()=>buildNumericResidualReview(evidence,changed),/identity overlap/);
});

test('fresh live receipt matches 63 canonical operand calculations for 26 replayed records', () => {
  assert.equal(report.counts.withCalculationReplay,26); assert.equal(report.counts.calculations,40);
  assert.equal(receipt.engine_replays.length,63);
  assert.ok(receipt.engine_replays.every(r=>r.computed===r.expected && r.method_in_engine));
  assert.equal(report.counts.sourceMessages,37);
});

test('read-only SQL guard is preserved including semicolons in historical claim identity', () => {
  const sql=buildNumericResidualReceiptSql(evidence);
  assert.equal(assertReadOnly(sql),sql);
  assert.match(sql,/md5\(public\.fn_research_claim_uid\(ro.statement\)\)=s.claim_uid_md5/);
  assert.doesNotMatch(sql,/;|\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|DO|SET)\b/iu);
  assert.match(sql,/public\.fn_research_source_uid\(other.source_ref\)=s.source_uid/);
  assert.match(sql,/public\.fn_research_claim_uid\(other.statement\)=public\.fn_research_claim_uid\(ro.statement\)/);
  assert.throws(()=>assertReadOnly('SELECT 1; DELETE FROM public.nodes'));
  assert.doesNotMatch(sql,/SELECT\s+\*/iu);
});

test('missing IDs, source drift, access drift and wrong claim spans fail closed', () => {
  for(const alter of [e=>e.rows.pop(),e=>e.rows.push(e.rows[0]),e=>e.reviewPlan.pop(),
    e=>{e.rows[0].privacy_scope='private';},e=>{e.rows[0].status='candidate';},
    e=>{e.sources[0].channel='or-geula';},e=>{e.sources[0].contributor_id='unknown';},
    e=>{e.sources[0].text+='changed';},e=>{e.reviewPlan[0].calculations[0].sourceSpan.end++;}]) {
    const changed=structuredClone(evidence);alter(changed);
    assert.throws(()=>replayNumericResidualBatch(changed));
  }
});

test('unknown strength, source independence and pending incomplete derivations cannot be auto-upgraded', () => {
  for(const alter of [e=>{e.reviewPlan[0].score=100;},e=>{e.reviewPlan[0].strength='חזק';},
    e=>{e.reviewPlan[0].sourceCount=2;},e=>{e.reviewPlan[0].automaticPromotion=true;},
    e=>{e.reviewPlan.find(p=>p.id.startsWith('014d')).recommendation='מתאים לעץ';},
    e=>{e.reviewPlan.find(p=>p.id.startsWith('04c1')).recommendation='מתאים לעץ';},
    e=>{e.reviewPlan.find(p=>p.id.startsWith('0e0c')).recommendation='מתאים לעץ';}]) {
    const changed=structuredClone(evidence);alter(changed);
    assert.throws(()=>replayNumericResidualBatch(changed));
  }
});

test('live identity/target/source/engine drift invalidates recommendations', () => {
  for(const alter of [r=>r.claims.pop(),r=>r.claims.push(r.claims[0]),
    ...['admitted','general_scope','exact_claim','exact_source'].map(key=>r=>{r.claims[0][key]=false;}),
    r=>{r.claims[0].source_ref='other';},r=>{r.claims[0].targets=[];},
    r=>r.engine_replays.pop(),r=>r.engine_replays.push(r.engine_replays[0]),
    r=>{r.engine_replays[0].computed++;},r=>{r.engine_replays[0].method='other';},
    r=>{r.engine_replays[0].method_in_engine=false;},r=>{r.methods[0].in_engine=false;}]) {
    const changed=structuredClone(receipt);alter(changed);
    assert.throws(()=>buildNumericResidualReview(evidence,changed));
  }
});

test('offline review adds no database executor, HTTP call or public runtime consumer', () => {
  const script=readFileSync(new URL('../scripts/audit-world-corpus-residual.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(script,/fetch\s*\(|createClient\s*\(|\.rpc\s*\(/u);
  assert.equal(report.execute,false); assert.equal(report.counts.promoted,0); assert.equal(report.counts.deleted,0);
});
