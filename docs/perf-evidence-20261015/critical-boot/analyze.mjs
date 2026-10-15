import fs from 'node:fs';
import assert from 'node:assert/strict';
const report=JSON.parse(fs.readFileSync(process.argv[2]));
const median=xs=>{const a=xs.toSorted((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
let seed=18202029;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
function pairedCI(a,b){
  const values=[];
  for(let i=0;i<10000;i++){
    const indices=a.map(()=>Math.floor(random()*a.length));
    values.push(median(indices.map(j=>b[j]))-median(indices.map(j=>a[j])));
  }
  values.sort((x,y)=>x-y);return [values[250],values[9749]];
}
const metrics={
  ready:s=>s.cold.ready[s.pathname],lcp:s=>s.cold.lcp,cls:s=>s.cold.cls,root:s=>s.cold.firstRoot,
  flagsStart:s=>s.reads.find(r=>r.key.includes('/site_flags?'))?.at,
  flagsEnd:s=>s.reads.find(r=>r.key.includes('/site_flags?'))?.released,
  jsBytes:s=>s.cold.resources.filter(r=>r.url.endsWith('.js')).reduce((a,r)=>a+r.wire,0),
  jsBytesBeforeReady:s=>s.cold.resources.filter(r=>r.url.endsWith('.js')&&r.end<=s.cold.ready[s.pathname]).reduce((a,r)=>a+r.wire,0),
  jsRequests:s=>s.cold.resources.filter(r=>r.url.endsWith('.js')).length,
  coldReads:s=>s.next.readStart,next:s=>s.next.ms,back:s=>s.back.ms,
  nextCls:s=>s.next.snapshot.cls-s.cold.cls,backCls:s=>s.back.snapshot.cls-s.next.snapshot.cls,
};
const output={base:report.base,candidate:report.candidate||'6bb7af037e4f0493e31ea5408703d8767d5c93fc',fixtureSha256:report.fixtureSha256,conditions:report.conditions,
  inference:'Paired percentile bootstrap of difference of medians, 10000 resamples, seed18202029. Small n=7; controlled local replay, not hosted/field acceptance.',routes:{}};
for(const pathname of [...new Set(report.samples.map(s=>s.pathname))]){
  const arms=Object.fromEntries(['base','candidate'].map(a=>[a,report.samples.filter(s=>s.arm===a&&s.pathname===pathname).sort((a,b)=>a.iteration-b.iteration)]));
  assert.equal(arms.base.length,7);assert.equal(arms.candidate.length,7);
  for(const s of [...arms.base,...arms.candidate]){assert.deepEqual(s.errors,[]);assert.deepEqual(s.misses,[]);assert.ok(s.reads.every(r=>r.status>=200&&r.status<300));}
  const data={metrics:{},parity:{}};
  for(const [name,read] of Object.entries(metrics)){
    const a=arms.base.map(read),b=arms.candidate.map(read);
    assert.ok([...a,...b].every(Number.isFinite),name);
    data.metrics[name]={baseMedian:median(a),candidateMedian:median(b),delta:median(b)-median(a),ci95:pairedCI(a,b),baseRange:[Math.min(...a),Math.max(...a)],candidateRange:[Math.min(...b),Math.max(...b)]};
  }
  data.parity.coldContentHashes=[...new Set([...arms.base,...arms.candidate].map(s=>s.cold.textHash))];
  data.parity.nextTargets=[...new Set([...arms.base,...arms.candidate].map(s=>s.next.target))];
  data.parity.nextContentHashes=[...new Set([...arms.base,...arms.candidate].map(s=>s.next.snapshot.textHash))];
  data.parity.coldLinks={base:[...new Set(arms.base.map(s=>JSON.stringify(s.cold.links)))],candidate:[...new Set(arms.candidate.map(s=>JSON.stringify(s.cold.links)))]};
  const identities=ss=>[...new Set(ss.flatMap(s=>s.reads.map(r=>JSON.stringify([r.key,r.bodyHash,r.status]))))].sort();
  const a=identities(arms.base),b=identities(arms.candidate);
  data.parity.onlyBaseRequests=a.filter(k=>!b.includes(k));data.parity.onlyCandidateRequests=b.filter(k=>!a.includes(k));
  data.parity.allReadCounts={base:arms.base.map(s=>s.reads.length),candidate:arms.candidate.map(s=>s.reads.length)};
  data.parity.noDuplicateCode=[...arms.base,...arms.candidate].every(s=>{
    const js=s.cold.resources.filter(r=>r.url.endsWith('.js')).map(r=>r.url);return new Set(js).size===js.length;
  });
  output.routes[pathname]=data;
}
fs.writeFileSync(process.argv[3],JSON.stringify(output,null,2)+'\n');
for(const [route,data] of Object.entries(output.routes)) console.log(route,JSON.stringify(Object.fromEntries(['ready','lcp','next','back','flagsEnd','cls','jsBytes'].map(k=>[k,data.metrics[k]]))));
