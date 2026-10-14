import fs from 'node:fs';
const rows=fs.readFileSync('world-iso.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.variant);
const med=a=>{a=a.filter(x=>x!=null).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null};
const rng=a=>{a=a.slice().sort((x,y)=>x-y);return a[0]+'-'+a[a.length-1]};
console.log('prof visit variant n fail | ready med(range) | fcp lcp | tbt cpuScript cpuTask | cls | restApi(GET+POST) supa | restEncKB restDecKB | localEncKB jsCount | totalReqs | doc/inp');
for(const p of ['desktop','mobile'])for(const v of ['cold','warm'])for(const va of ['base','full','basic','off']){
 const r=rows.filter(x=>x.prof===p&&x.label.startsWith(v)&&x.variant===va);if(!r.length)continue;
 const g=k=>r.map(x=>x[k]);const okr=r.filter(x=>x.ok);
 console.log(p,v,va,r.length,r.length-okr.length,'|',med(g('ready')),'('+rng(g('ready'))+')','|',med(g('fcp')),med(g('lcp')),'|',med(g('tbt')),med(g('cpuScriptMs')),med(g('cpuTaskMs')),'|',med(g('cls')),'|',med(g('restApi')),med(g('supaReqs')),'|',med(g('restEncKB')),med(g('restDecKB')),'|',med(g('localEncKB')),med(g('jsCount')),'|',med(g('allReqs')),'|',med(g('inp')));
}
