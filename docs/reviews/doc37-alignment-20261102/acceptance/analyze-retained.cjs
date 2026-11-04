// Offline only. Derive bounded startup facts from the already retained native runs.
const fs=require('node:fs');
const input=process.argv[2];if(!input)throw Error('Provide retained results.json');
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const round=x=>Number.isFinite(x)?Math.round(x*10)/10:null;
const median=xs=>{xs=xs.filter(Number.isFinite).sort((a,b)=>a-b);return xs.length?xs[Math.floor(xs.length/2)]:null;};
const rows=data.trials.filter(t=>t.width===390&&/^fresh-/.test(t.label)).map(t=>{
 const s=t.snapshot||{},useful=s.readiness?.find(r=>r.home)?.time,cutoff=t.steps?.find(s=>s.name==='home-post')?.start??Infinity;
 const reads=(s.reads||[]).filter(r=>r.start<cutoff&&r.path.startsWith('/rest/v1/'));
 const first=reads.find(r=>r.path==='/rest/v1/posts');
 const fonts=(s.resources||[]).filter(r=>r.path.startsWith('/fonts/')&&r.start<useful);
 const sig=r=>JSON.stringify([r.method,r.path,r.query,r.args||null]);
 const unique=new Set(reads.map(sig));
 return {label:t.label,ok:t.ok,homeDomUsefulMs:round(useful),homeDriverMs:round(t.homeDriverMs),fontFetches:fonts.length,fontLastNetworkEndMs:round(Math.max(...fonts.map(r=>r.start+r.duration))),primaryPostsRead:{startMs:round(first?.start),endMs:round(first?.end),durationMs:round(first?.ms)},primaryReadEndToUsefulMs:round(useful-first?.end),initialReads:reads.length,readsStartingAfterUseful:reads.filter(r=>r.start>useful).length,exactDuplicateReadSignatures:reads.length-unique.size,cls:t.documentCls,errors:t.errors?.length,firstStep:cutoff};
});
console.log(JSON.stringify({sourceSha:data.sha,actualSW:data.actualSW,source:'native-clean-979c/results.json; retained evidence c63850d9',scope:'fresh 390 only, 4x CPU/150ms latency/200000Bps down/100000Bps up',rows,median:{homeDomUsefulMs:round(median(rows.map(r=>r.homeDomUsefulMs))),fontLastNetworkEndMs:round(median(rows.map(r=>r.fontLastNetworkEndMs))),primaryReadEndToUsefulMs:round(median(rows.map(r=>r.primaryReadEndToUsefulMs)))},limits:['Network completion is not font activation or await completion.','Script resource timings do not measure JavaScript evaluation.','Gap between primary read and useful DOM is observed, not causally attributed.','Different query signatures may overlap rows; no identical request duplication is not proof of zero overlap.','Concurrent request durations must not be added into saved wall time.']},null,2));
