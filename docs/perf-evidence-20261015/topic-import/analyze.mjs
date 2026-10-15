import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const [input,output]=process.argv.slice(2);
const raw=fs.readFileSync(input),j=JSON.parse(input.endsWith('.gz')?zlib.gunzipSync(raw):raw);
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sourceTopics=['/topic/1237','/topic/424-mashiach-ben-david','/topic/trump'];
const sourceTopicHashes=sourceTopics.map(p=>crypto.createHash('sha256').update(p).digest('hex'));
assert.equal(j.responseObservationClock,'host monotonic; no renderer await in interception');
assert.equal(j.interactionClock,'trusted browser click to primary-ready; Back/Forward host action to ready');
assert.equal(j.identityCapture,'after Topic loading ends, fixture reads idle 700ms and DOM stable 600ms; outside primary-ready timing');
const arms=['a','b'].map(a=>j.samples.filter(s=>s.arm===a));
assert.deepEqual(arms.map(a=>a.length),[7,7]);
assert.deepEqual(j.samples.map(s=>s.arm),['a','b','b','a','a','b','b','a','a','b','b','a','a','b']);
for(let p=0;p<7;p++) {
  const pair=arms.map(a=>a.find(s=>s.pair===p));
  for(const s of pair){assert.equal(s.errors.length,0);assert.equal(s.misses.length,0);assert.ok(!s.failure);assert.ok(s.reads.every(r=>(r.status>=200&&r.status<300)||r.explainedDenial));}
  assert.ok(pair.every(s=>s.targetSha256||s.target),'A measured target is required');
  assert.ok(pair.every(s=>s.targetSha256?!sourceTopicHashes.includes(s.targetSha256):!sourceTopics.includes(s.target)), 'Ordinary-topic measurement must not select an enabled discovery topic');
  assert.equal(pair[1].storyModuleRequests.length,0,'Ordinary Topic must not request Story');
  assert.equal(pair[0].targetSha256||pair[0].target,pair[1].targetSha256||pair[1].target);
  const reads=s=>s.reads.map(r=>[r.requestSha256||r.key,r.status,r.hash,r.bytes,r.explainedDenial]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(reads(pair[0]),reads(pair[1]),`Request/response multiplicity differs in pair ${p}`);
  for(let step=0;step<3;step++)assert.deepEqual(pair[0].steps[step].identity,pair[1].steps[step].identity,`Ordered DOM content differs in pair ${p} step ${step}`);
  assert.ok(pair.every(s=>s.steps[0].observations.clicks.some(c=>c.trusted)),'Navigation must use a real input');
}
let seed=20261015;
const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
const metric=get=>{
  const [a,b]=arms.map(arm=>arm.map(get));
  const diffs=[];
  for(let i=0;i<20000;i++){
    const picks=Array.from({length:7},()=>Math.floor(random()*7));
    diffs.push(median(picks.map(p=>b[p]))-median(picks.map(p=>a[p])));
  }
  diffs.sort((a,b)=>a-b);
  return {aMedian:median(a),bMedian:median(b),delta:median(b)-median(a),percent:100*(median(b)/median(a)-1),aRange:[Math.min(...a),Math.max(...a)],bRange:[Math.min(...b),Math.max(...b)],pairedBootstrap95:[diffs[500],diffs[19500]]};
};
const out={redaction:j.redaction||null,samplesPerArm:7,fixtureSha256:j.fixtureSha256,browser:j.browser,profile:j.profile,parity:'PASS: per-pair identical request/response multiset, target and ordered visible text/topic identity at all three steps; trusted clicks; zero misses/page errors/unexplained read failures',knownDenial:'401/42501 on research_objects; actual captured denial body retained unchanged in both arms; authenticated grants not retested by this lane',readCounts:arms.map(a=>a.map(s=>s.reads.length)),deniedCounts:arms.map(a=>a.map(s=>s.reads.filter(r=>r.explainedDenial).length)),coldReady:metric(s=>s.coldReady),lcp:metric(s=>s.cold.lcp),coldCls:metric(s=>s.cold.cls),initialJsEncodedBytes:metric(s=>s.cold.scripts.reduce((n,r)=>n+r.encoded,0)),steps:[0,1,2].map(i=>({name:arms[0][0].steps[i].name,timing:metric(s=>s.steps[i].ms),identitySettledObservation:metric(s=>s.steps[i].identitySettledObservationMs),task:metric(s=>s.steps[i].taskMs),cls:metric(s=>s.steps[i].observations.cls)})),identityHashes:arms[0].map(s=>digest(s.steps.map(x=>x.identity)))};
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
