import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const [crossFile,functionalFile,outFile]=process.argv.slice(2);
const read=p=>JSON.parse(p.endsWith('.gz')?zlib.gunzipSync(fs.readFileSync(p)):fs.readFileSync(p));
const cross=read(crossFile),functional=read(functionalFile);
const visible=a=>a.path==='/world'&&a.hash==='#world-sources'&&a.y>0&&a.top>=-1&&a.top<200;
for(const report of [cross,functional])for(const s of report.samples){
  assert.ok(!s.failure,s.failure);assert.equal(s.errors.length,0);assert.equal(s.misses.length,0);
  assert.ok(s.reads.every(r=>(r.status>=200&&r.status<300)||r.explainedDenial));
}
assert.equal(cross.samples.length,14);
for(let pair=0;pair<7;pair++){
  const a=cross.samples.find(s=>s.pair===pair&&s.arm==='a'),b=cross.samples.find(s=>s.pair===pair&&s.arm==='b');
  assert.ok(!visible(a.anchor),'Baseline cross-page failure must reproduce');
  assert.ok(!visible(a.forwardAnchor),'Baseline Forward failure must reproduce');
  for(const field of ['anchor','forwardAnchor','inPageAnchor']){
    assert.ok(visible(b[field]),`Fixed ${field} missed in pair ${pair}: ${JSON.stringify(b[field])}`);
    assert.deepEqual(b[field].items,a[field].items,'Ordered source identities must be preserved');
  }
  assert.equal(b.anchor.jumps.length,1,'One page-owned jump on initial arrival');
  assert.equal(b.forwardAnchor.jumps.length,2,'One further jump after Forward');
}
const direct=functional.samples.find(s=>s.flow==='direct');assert.ok(direct&&visible(direct.anchor));
const retained=functional.samples.find(s=>s.flow==='context');
assert.ok(retained&&visible(retained.anchor),'A retained number context must still resolve the sources landing');
assert.equal(retained.retainedContext.id,'1820','Anchor navigation must preserve the existing research subject');
for(const flow of ['input-wheel','input-touch','input-key']){
  const s=functional.samples.find(s=>s.flow===flow);assert.ok(s,`Missing ${flow}`);
  assert.equal(s.anchor.path,'/world');assert.ok(s.userInputAt>0);
  assert.equal(s.anchor.jumps.length,0,`Pending anchor must yield to ${flow}`);
  assert.ok(s.afterInput.y>0,`${flow} must perform a real scroll`);
}
const out={crossPage:'7/7 baseline FAIL → 7/7 fixed PASS',forward:'7/7 baseline FAIL → 7/7 fixed PASS',inPage:'7/7 PASS, ordered source IDs preserved',direct:'PASS',retainedNumberContext:'PASS; sources landing opens and subject 1820 is preserved',pendingUserInput:'wheel / touch swipe / PageDown PASS; no late anchor jump',errors:0,fixtureMisses:0,unexplainedReadFailures:0,fixtureSha256:cross.fixtureSha256,knownDenial:'research_objects 401/42501 retained',baselinePositions:cross.samples.filter(s=>s.arm==='a').map(s=>({y:s.anchor.y,top:s.anchor.top})),fixedPositions:cross.samples.filter(s=>s.arm==='b').map(s=>({y:s.anchor.y,top:s.anchor.top}))};
fs.writeFileSync(outFile,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
