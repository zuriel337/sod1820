import fs from 'node:fs';
import assert from 'node:assert/strict';
const [beforeFile,afterFile,outFile]=process.argv.slice(2);
const before=JSON.parse(fs.readFileSync(beforeFile)),after=JSON.parse(fs.readFileSync(afterFile));
assert.equal(before.mode,after.mode,'Replay and hosted measurements cannot be mixed');
assert.deepEqual(before.profile,after.profile,'Profile mismatch');
assert.equal(before.fixtureSha256,after.fixtureSha256,'Different public snapshots');
assert.equal(before.runs,7);assert.equal(after.runs,7);
const paths=[...new Set(before.samples.map(s=>s.path))];
assert.deepEqual(paths,[...new Set(after.samples.map(s=>s.path))]);
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const range=a=>[Math.min(...a),Math.max(...a)];
const stats=a=>({median:median(a),range:range(a)});
let randomState=20291014;
const random=()=>((randomState=(Math.imul(randomState,1664525)+1013904223)>>>0)/4294967296);
function medianDifferenceCI(a,b){const deltas=[];for(let i=0;i<4000;i++)deltas.push(median(b.map(()=>b[Math.floor(random()*b.length)]))-median(a.map(()=>a[Math.floor(random()*a.length)])));deltas.sort((a,b)=>a-b);return[deltas[100],deltas[3899]];}
const result={before:before.runtime,after:after.runtime,mode:before.mode,fixtureSha256:before.fixtureSha256,profile:before.profile,routes:{},errors:[],note:'Latency=input to target-ready+two frames. Task/script/layout window also includes fixed800ms tail. Bootstrap percentile95% median delta interval is supplementary; fixture CPU/static transport is not live SQL latency.'};
for(const path of paths){
 const a=before.samples.filter(s=>s.path===path),b=after.samples.filter(s=>s.path===path);
 assert.equal(a.length,7);assert.equal(b.length,7);
 for(const s of [...a,...b]){assert.equal(s.errors.length,0,'Runtime error');assert.equal(s.misses.length,0,'Fixture miss');assert.ok(!s.failedPrimary,'Failed primary sample');}
 const work=sample=>Object.fromEntries(sample.reads.map(r=>[r.key,r.hash]));
 const all=rows=>new Map(rows.flatMap(s=>Object.entries(work(s))));const old=all(a),next=all(b);
 const mismatches=[...next].filter(([key,hash])=>old.has(key)&&old.get(key)!==hash);
 if(mismatches.length)result.errors.push(`${path}: changed response bytes for same request`);
 const row={measures:{},restRequests:{before:stats(a.map(s=>s.reads.length)),after:stats(b.map(s=>s.reads.length))},responseParity:{differentBodies:mismatches.length,removedKeys:[...old.keys()].filter(k=>!next.has(k)),addedKeys:[...next.keys()].filter(k=>!old.has(k))}};
 if(row.restRequests.after.median>row.restRequests.before.range[1])result.errors.push(`${path}: repeated data reads exceed observed baseline range`);
 for(const name of a[0].measures.map(m=>m.name)){
  const av=a.map(s=>s.measures.find(m=>m.name===name)),bv=b.map(s=>s.measures.find(m=>m.name===name));assert.ok(av.every(Boolean)&&bv.every(Boolean),'Missing input action');
  if(name==='actual-click')assert.ok([...av,...bv].every(m=>m.trustedClicks.some(c=>c.trusted)),'Synthetic click must not be accepted');
  const metrics={};for(const[k,get]of Object.entries({readyMs:m=>m.readyMs,taskMs:m=>m.metrics.TaskDuration,scriptMs:m=>m.metrics.ScriptDuration,layoutMs:m=>m.metrics.LayoutDuration,storageWrites:m=>m.storage.length,storageBytes:m=>m.storage.reduce((n,r)=>n+r.bytes,0),maxFrameMs:m=>Math.max(0,...m.frames.map(f=>f.ms)),longTaskMs:m=>m.longTasks.reduce((n,r)=>n+r.ms,0)})){
   const x=av.map(get),y=bv.map(get);metrics[k]={before:stats(x),after:stats(y),delta:median(y)-median(x),ci:medianDifferenceCI(x,y)};
  }
  const ceiling=metrics.readyMs.before.median*1.1+100;
  if(!name.startsWith('scroll')&&metrics.readyMs.after.median>ceiling)result.errors.push(`${path}/${name}: latency exceeds matched10%+100ms regression allowance`);
  row.measures[name]=metrics;
 }
 result.routes[path]=row;
}
result.regressionPassed=result.errors.length===0;
fs.writeFileSync(outFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({regressionPassed:result.regressionPassed,errors:result.errors}));
process.exitCode=result.regressionPassed?0:1;
