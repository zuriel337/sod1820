import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {METHODS} from '../src/lib/gematria.js';
import {extractCompoundClaims} from '../src/lib/triage.js';
import {assertReadOnly, sourceTextReviewFingerprint} from '../scripts/audit-world-corpus-residual.mjs';

const read=name=>JSON.parse(readFileSync(new URL(`../docs/reviews/${name}-20261026.json`,import.meta.url)));
const evidence=read('world-zvi-clarification-evidence'), receipt=read('world-zvi-clarification-receipt');
const gematria=text=>METHODS.find(m=>m.key==='רגיל').fn(text);
const row=key=>evidence.cases.find(c=>c.key===key);

function validate(e,r) {
  assert.equal(r.evidenceFingerprint,sourceTextReviewFingerprint(e));
  assert.equal(r.engine.current_user,'supabase_read_only_user');
  assert.match(r.engine.engine_definition_md5,/^[a-f0-9]{32}$/u);
  assert.ok(Number.isFinite(Date.parse(r.engine.checked_at)));
  assert.equal(r.engine.checks.length,e.engineInputs.length);
  for(const i of e.engineInputs) {
    assert.equal(gematria(i.phrase),i.expected);
    const c=r.engine.checks.filter(c=>c.phrase===i.phrase && c.method===i.method);
    assert.equal(c.length,1);assert.equal(c[0].computed,i.expected);assert.equal(c[0].in_engine,true);
  }
  assert.equal(r.source.rows.length,4);assert.equal(r.source.sources.length,4);
  for(const c of e.cases) {
    const f=r.source.rows.find(r=>r.id===c.findingId)?.finding;
    assert.ok(f);assert.equal(f.id,c.findingId);assert.equal(f.source_ref,c.sourceRef);
    assert.equal(f.status,'approved');assert.equal(f.privacy_scope,'public');
    assert.equal(f.revision,null);assert.equal(f.promoted_node_id,null);
    const s=r.source.sources.find(s=>s.id===f.source_id);assert.ok(s);
    assert.equal(c.sourceRef,`channel_updates:${s.id}`);
    assert.equal(s.md5,createHash('md5').update(s.text).digest('hex'));
    assert.equal(s.status,'live');assert.equal(s.page_only,false);
    assert.equal(s.channel,'torat-haremez');
    assert.equal(s.contributor_id,'c66f0464-0928-490e-be9b-66d8a87e7fc8');
  }
}

test('four exact source bindings and 17 canonical leaf checks have a read-only receipt',()=>{
  validate(evidence,receipt);assert.equal(evidence.engineInputs.length,17);
  for(const sql of [receipt.sourceSql,receipt.engineSql])assert.equal(assertReadOnly(sql),sql);
  for(const gate of ["ro.status='approved'","ro.privacy_scope='public'","person_only","old_chat","or-geula","cu.status='live'","cu.page_only IS FALSE"])
    assert.ok(receipt.sourceSql.includes(gate));
});

test('changed source, denied admission, method result or evidence fails closed',()=>{
  for(const mutate of [
    r=>{r.source.rows[0].finding=null;},
    r=>{r.source.rows[0].finding.privacy_scope='private';},
    r=>{r.source.rows[0].finding.status='candidate';},
    r=>{r.source.rows[0].finding.source_ref='channel_updates:other';},
    r=>{r.source.sources[0].text+=' changed';},
    r=>{r.engine.checks[0].computed++;},
    r=>{r.engine.checks[0].in_engine=false;}
  ]) {const r=structuredClone(receipt);mutate(r);assert.throws(()=>validate(evidence,r));}
  const e=structuredClone(evidence);e.cases[0].top.visualCandidate='ויברך אתם אלהים';
  assert.throws(()=>validate(e,receipt));
});

test('four separate original attachments retain storage receipts, not public URLs or historical byte identity',()=>{
  assert.equal(evidence.attachments.length,4);assert.equal(new Set(evidence.attachments.map(a=>a.sha256)).size,4);
  assert.equal(new Set(evidence.attachments.map(a=>a.dropbox.id)).size,4);
  for(const a of evidence.attachments) {
    assert.match(a.sha256,/^[a-f0-9]{64}$/u);assert.equal(a.bytes,a.dropbox.bytes);
    assert.equal(a.dropbox.status,'completed');assert.equal(a.mime,'image/jpeg');
    assert.equal(a.sharedHref,null);assert.equal(a.originalHistoricalFileIdentityProven,false);
  }
  assert.equal(row('crown').sourceImageMarker,null);
  assert.equal(row('crown').historicalSourceImageMarker,'Image 4121.jpg');
  assert.equal(evidence.timezone,null);assert.equal(evidence.senderIndependentlyVerified,false);
  assert.doesNotMatch(JSON.stringify(evidence),/\+972|"(?:wa_names|user_id)":/u);
});

test('the center is resolved but the top spelling is never silently changed to hit 3060',()=>{
  const c=row('triangle');assert.equal(gematria(c.center.quote),765);
  assert.equal(gematria(c.top.visualCandidate),771);assert.equal(gematria(c.top.alternativeSpelling),765);
  assert.equal(771+3*765,c.totalWithVisualCandidate);assert.equal(c.totalWithVisualCandidate,3066);
  assert.equal(4*765,c.totalWithAlternativeSpelling);assert.equal(c.totalWithAlternativeSpelling,3060);
  assert.equal(c.top.silentCorrectionAllowed,false);assert.equal(c.result,'center_resolved_whole_diagram_held');
  assert.equal(gematria(c.previousWitness.center),777);assert.equal(c.previousWitness.totalWithThree765,3072);
  assert.equal(c.previousWitness.preserved,true);
});

test('five explicit compound slices replay through the shared extractor, preserving quantity uncertainty',()=>{
  assert.equal(evidence.compoundReplays.length,5);
  for(const c of evidence.compoundReplays) {
    assert.ok(evidence.rawMessages[c.messageIndex].text.includes(c.sourceQuote));
    const parsed=extractCompoundClaims(c.expression);
    assert.equal(parsed.length,1);assert.equal(parsed[0].computedTotal,c.expected);
    assert.equal(parsed[0].status,'ENGINE_VERIFIED_COMPOSITE');
    const quantities=parsed[0].numericOccurrences?.filter(n=>n.syntacticRole==='arithmetic_input')
      || [parsed[0].quantityProvenance];
    assert.ok(quantities.length>0 && quantities.every(n=>n.status==='unresolved'));
  }
  assert.equal(row('pentagon').fiveEdgesVisuallyCounted,true);
  assert.equal(row('pentagon').perimeterIsPhysicalMeasurement,false);
});

test('pi/e powers share four truncated decimals, not exact equality or the claimed rounded value',()=>{
  const c=row('powers'),left=Math.PI**4+Math.PI**5,right=Math.exp(6);
  assert.equal(c.left,left);assert.equal(c.right,right);assert.notEqual(left,right);
  assert.ok(Math.abs(c.difference-(right-left))<1e-12);assert.ok(c.difference>1e-5);
  assert.equal(left.toFixed(4),'403.4288');assert.equal(right.toFixed(4),c.round4);
  for(const v of [left,right])assert.equal((Math.trunc(v*10000)/10000).toFixed(4),c.truncate4);
  assert.equal(c.exactEquality,false);assert.equal(c.citationAnd42MeaningVerified,false);
  assert.ok(Math.abs(left-receipt.engine.constants.powers_left)<1e-10);
  assert.ok(Math.abs(right-receipt.engine.constants.powers_right)<1e-10);
});

test('crown approximation is 19.999099..., distinct from 20 and the image decimal',()=>{
  const c=row('crown'),v=Math.exp(Math.PI)-Math.PI;
  assert.equal(c.value,v);assert.notEqual(v,20);assert.equal(v.toFixed(4),c.round4);
  assert.ok(String(v).startsWith(c.correctDecimalPrefix.replace('...','')));
  assert.ok(!String(v).startsWith(c.sourceDecimal.replace('...','')));
  assert.equal(c.distanceFrom20,20-v);assert.equal(c.exactEquality,false);assert.equal(c.limitClaimVerified,false);
  for(const phrase of c.gematriaWords)assert.equal(gematria(phrase),620);
  assert.ok(Math.abs(v-receipt.engine.constants.crown)<1e-10);
});

test('same-text historical appearances are not new independent sources; all originals remain',()=>{
  const sources=receipt.source.sources;
  assert.equal(sources.find(s=>s.id==='305b8335-72bf-43e5-9edd-0d1b4340f97f').text,
    sources.find(s=>s.id==='3c8ea715-0e4e-4690-9d49-b011b71b61d2').text);
  assert.equal(evidence.policy.independentSourceCount,null);assert.equal(evidence.policy.independentSourcesAdded,0);
  assert.equal(evidence.policy.deleted,0);assert.equal(evidence.policy.liveSourceAssociationWritten,false);
});

test('calculation, geometry, interpretation and publication remain separate with four unanswered questions',()=>{
  for(const key of ['strength','evidenceQuality','independentSourceCount'])assert.equal(evidence.policy[key],null);
  for(const key of ['wholeSourceVerified','interpretationVerified','automaticPromotion','publicationChanged','privacyChanged','runtimeChanged'])
    assert.equal(evidence.policy[key],false);
  assert.deepEqual(evidence.remainingOriginalQuestions.filter(q=>q.state.startsWith('unanswered')).map(q=>q.number),[4,5,6,7]);
  assert.equal(row('powers').result,'approximation_only_truncation_not_rounding');
});
