import fs from 'node:fs';
const files=process.argv.slice(2); const rows=files.flatMap(f=>fs.readFileSync(f,'utf8').trim().split('\n').map(l=>JSON.parse(l))).filter(r=>!r.kind);
const med=a=>{a=a.filter(x=>x>=0).sort((x,y)=>x-y);return a.length?a[a.length>>1]:NaN};
const rng=a=>{a=a.filter(x=>x>=0).sort((x,y)=>x-y);return a.length?`${a[0]}-${a[a.length-1]}`:'-'};
const g={}; for(const r of rows){(g[[r.prof,r.scen,r.label.split('#')[0],r.variant].join(' ')]??=[]).push(r)}
const metric=process.env.M||'ready';
console.log('prof scen visit variant | n fail | '+metric+' med (range) | fcp lcp | rest KB enc / reqs / dup | local enc KB');
for(const k of Object.keys(g).sort()){const a=g[k];const f=a.filter(r=>!r.ok).length;
 console.log(k.padEnd(34),a.length,f,'|',String(med(a.map(r=>r[metric]))).padStart(6),`(${rng(a.map(r=>r[metric]))})`,'|',med(a.map(r=>r.fcp)),med(a.map(r=>r.lcp)),'|',med(a.map(r=>r.restEncKB)),'/',med(a.map(r=>r.restReqs)),'/',med(a.map(r=>r.restDupGets)),'|',med(a.map(r=>r.localEncKB)))}
