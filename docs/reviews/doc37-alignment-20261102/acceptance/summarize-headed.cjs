// Offline report only; keeps every native trial and reports incomparable semantics.
const fs=require('node:fs');
const root=process.argv[2];if(!root)throw Error('Provide evidence directory');
const median=xs=>{xs=xs.filter(Number.isFinite).sort((a,b)=>a-b);return xs.length?xs[Math.floor(xs.length/2)]:null;};
const round=x=>Number.isFinite(x)?Math.round(x*10000)/10000:null;
function stats(xs){xs=xs.filter(Number.isFinite);return xs.length?{n:xs.length,median:round(median(xs)/1000),min:round(Math.min(...xs)/1000),max:round(Math.max(...xs)/1000)}:null;}
function ready(t,key,start=0){return t.snapshot?.readiness?.find(r=>r.time>=start&&(key==='primary'?r.primary==='ready':r[key]))?.time;}
const output={conditions:{browser:'genuine headed Chromium; Xorg dummy; unchanged User-Agent',viewportHeight:900,mobile:{width:390,cpu:4,rttMs:150,downloadBps:200000,uploadBps:100000},desktop:{width:1440,throttled:false},liveWrites:'independent deny-only guard; automatic server access logging not suppressed'},runs:{}};
for(const [kind,dir] of Object.entries({legacy:'headed-legacy',baseline:'headed-baseline',candidate:process.argv[3]||'headed-candidate-4798'})){
 const r=JSON.parse(fs.readFileSync(`${root}/${dir}/results.json`,'utf8'));
 output.runs[kind]={sha:r.sha,origin:r.origin,browserMode:r.browserMode,trials:r.trials.length,failed:r.trials.filter(x=>!x.ok).length,maxCls:Math.max(...r.trials.map(x=>x.documentCls||0)),controllerObserved:[...new Set(r.trials.map(x=>x.snapshot?.controller))],groups:[]};
 for(const width of [...new Set(r.trials.map(x=>x.width))])for(const state of ['fresh','warm']){
  const rows=r.trials.filter(x=>x.width===width&&x.label.startsWith(state));if(!rows.length)continue;
  const step=(t,name)=>t.steps?.find(s=>s.name===name)?.start;
  const initial=t=>t.snapshot?.reads?.filter(x=>x.path.startsWith('/rest/v1/')&&x.start<(step(t,'home-post')??Infinity))||[];
  const delta=(t,name,key)=>{const s=step(t,name);return s==null?null:ready(t,key,s)-s;};
  const metrics={heroContent:stats(rows.map(t=>ready(t,'heroContent'))),primaryReady:stats(rows.map(t=>ready(t,'primary'))),firstPostCard:stats(rows.map(t=>ready(t,'home'))),heroImageComplete:stats(rows.map(t=>ready(t,'heroImage'))),legacyControls:stats(rows.map(t=>ready(t,'legacyControls'))),legacyFirstUpdate:stats(rows.map(t=>ready(t,'legacyContent'))),legacyHeroImageComplete:stats(rows.map(t=>ready(t,'legacyHeroImage'))),initialAdmittedReadsEnd:stats(rows.map(t=>Math.max(0,...initial(t).map(x=>x.end||0)))),homePost:stats(rows.map(t=>delta(t,'home-post','post'))),backHome:stats(rows.map(t=>delta(t,'back-post-home','home'))),backPrimaryHome:stats(rows.map(t=>delta(t,'back-post-home','heroContent')))};
  output.runs[kind].groups.push({width,state,n:rows.length,metrics,clickedHrefs:[...new Set(rows.flatMap(t=>t.steps?.filter(s=>s.name==='home-post').map(s=>s.href)||[]))],deniedPaths:[...new Set(rows.flatMap(t=>t.snapshot?.denied?.map(d=>d.path)||[]))],pageErrors:rows.flatMap(t=>t.errors||[]),unfinishedHeroImages:rows.filter(t=>ready(t,kind==='legacy'?'legacyHeroImage':'heroImage')==null).length});
 }
}
output.limits=['Legacy first update/search/hero and new Home series/primary are explicitly separate semantics.','Legacy unreviewed RPCs, WhatsApp function and telemetry writes were denied; not unrestricted Production completion.','Cold Legacy hero images did not finish within observation windows; null is unknown, not zero.','Candidate primary-source hook is new; compare common heroContent as well rather than silently changing the baseline metric.','Matched Home→Post used the same public URL on all baseline/candidate samples.','No A3 rerun or new full gate pass is asserted.','All failed access/geometry attempts preserved separately.'];
console.log(JSON.stringify(output,null,2));
