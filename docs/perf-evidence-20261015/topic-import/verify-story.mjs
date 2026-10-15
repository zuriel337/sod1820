import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const [input,recovery,output]=process.argv.slice(2);
const read=p=>JSON.parse(p.endsWith('.gz')?zlib.gunzipSync(fs.readFileSync(p)):fs.readFileSync(p));
const raw=read(input),r=read(recovery),arms=['a','b'].map(arm=>raw.samples.filter(s=>s.arm===arm));
assert.deepEqual(arms.map(a=>a.length),[7,7]);
assert.equal(raw.responseObservationClock,'host monotonic; no renderer await in interception');
const reads=s=>s.reads.map(r=>[r.requestSha256||r.key,r.status,r.hash,r.bytes,r.explainedDenial]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
for(let p=0;p<7;p++){
  const a=arms[0].find(s=>s.pair===p),b=arms[1].find(s=>s.pair===p);
  for(const s of [a,b]){assert.ok(!s.failure);assert.equal(s.errors.length,0);assert.equal(s.misses.length,0);assert.ok(s.story.open);assert.ok(s.story.stageCount>0);assert.ok(s.reads.every(r=>(r.status>=200&&r.status<300)||r.explainedDenial));}
  assert.deepEqual(a.story,b.story,'Full source story and method-panel identity must match');
  assert.deepEqual(a.primary,b.primary,'Full Topic identity must match');
  assert.deepEqual(reads(a),reads(b),'Read/response multiset must match');
}
const failed=r.samples[0];assert.equal(r.samples.length,1);assert.ok(!failed.failure);assert.ok(failed.primarySurvivedFailure);assert.ok(failed.story.open&&failed.story.stageCount>0);assert.equal(failed.errors.length,0);assert.equal(failed.misses.length,0);
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
let seed=20261015;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
const metric=get=>{const [a,b]=arms.map(s=>s.map(get)),diffs=[];for(let n=0;n<20000;n++){const picks=Array.from({length:7},()=>Math.floor(random()*7));diffs.push(median(picks.map(p=>b[p]))-median(picks.map(p=>a[p])));}diffs.sort((a,b)=>a-b);return {aMedian:median(a),bMedian:median(b),delta:median(b)-median(a),percent:100*(median(b)/median(a)-1),pairedBootstrap95:[diffs[500],diffs[19500]]};};
const out={pairs:7,fixtureSha256:raw.fixtureSha256,parity:'PASS: full Topic/source story, method identities, Stage present, disclosure open and exact request/response multiset',errorRecovery:'PASS: primary survives optional module failure; reload recovers full story and method Stage',primaryReady:metric(s=>s.coldReady),storyReady:metric(s=>s.storyReady),lcp:metric(s=>s.cold.lcp),cls:metric(s=>s.cold.cls),readCounts:arms.map(a=>a.map(s=>s.reads.length))};
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
