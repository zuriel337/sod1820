// Reproducible timing comparison. The single exclusion below is determined by
// recorded concurrent filesystem work, never by a result's speed. Its full raw
// outcome and the replacement context's conditioning cold visit remain evidence.
const fs=require('node:fs'),assert=require('node:assert/strict');
const [baselinePath,replacementPath,candidatePath,outPath]=process.argv.slice(2);
if(!baselinePath||!outPath)throw Error('usage: node summarize-home-js.cjs BASE REPLACEMENT_OR_DASH CANDIDATE_OR_DASH OUT');
const read=p=>p&&p!=='-'?JSON.parse(fs.readFileSync(p,'utf8')):null;
const baseline=read(baselinePath),replacement=read(replacementPath),candidate=read(candidatePath);
const cleanBaseline=baseline.trials.filter(t=>!(t.width===1440&&t.trial===3&&t.state==='warm'));
const confound={width:1440,trial:3,state:'warm',reason:'Root git worktree checkout2026-11-02T18:47:47.650Z–18:47:49.081Z overlaps final10s of loop; exclude entire loop from timing aggregate, retain functional outcome.'};
if(replacement){assert.equal(replacement.sha,baseline.sha);const matches=replacement.trials.filter(t=>t.width===1440&&t.state==='warm');assert.equal(matches.length,1);cleanBaseline.push({...matches[0],replacementFor:'1440:3:warm'});}
const median=xs=>{const a=[...xs].sort((x,y)=>x-y),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
const stats=values=>({n:values.length,medianMs:median(values),minMs:Math.min(...values),maxMs:Math.max(...values),values});
function summarize(report,trials){
 if(!report)return null;
 const groups=[];
 for(const width of[390,1440])for(const state of['cold','warm']){
  const rows=trials.filter(t=>t.width===width&&t.state===state),steps={};if(!rows.length)continue;
  for(const name of rows[0].steps.map(s=>s.name)){
   const samples=rows.map(t=>t.steps.find(s=>s.name===name));
   steps[name]={useful:stats(samples.map(s=>s.usefulMs)),materialAndMethods:samples.every(s=>Number.isFinite(s.materialAndMethodsMs))?stats(samples.map(s=>s.materialAndMethodsMs)):null,driverReady:stats(samples.map(s=>s.driverReady-s.start))};
  }
  groups.push({width,state,n:rows.length,allNavigationPass:rows.every(t=>t.ok),allStabilityPass:rows.every(t=>t.stabilityOk),maxCLS:Math.max(...rows.map(t=>t.documentCls)),primaryPosts:[...new Set(rows.map(t=>t.primaryPostHref))],steps});
 }
 return{sha:report.sha,groups,rawTrials:report.trials.length,selectedTrials:trials.length};
}
const result={baseline:summarize(baseline,cleanBaseline),candidate:candidate?summarize(candidate,candidate.trials):null,confoundedRetained:[confound],replacementAvailable:Boolean(replacement),notes:['Primary Home DOM metric is distinct from full opacity; separate diagnostic retains animation delay.','Immediate primary Post is sprites-lightning-over-france, not the older secondary-series Post metric.','Profiler/coverage/trace diagnostic latency never enters this aggregate.','All failures/outliers retained; no sample selection by outcome.']};
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({baselineSHA:baseline.sha,baselineSelected:cleanBaseline.length,candidateSHA:candidate?.sha,candidateTrials:candidate?.trials.length,replacementAvailable:Boolean(replacement)}));
