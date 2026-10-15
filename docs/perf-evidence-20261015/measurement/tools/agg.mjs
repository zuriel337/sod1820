import fs from 'node:fs';
const dir=process.argv[2], mode=process.argv[3]; const g={};
for(const f of fs.readdirSync(dir).filter(f=>f.startsWith(mode+'-')&&f.endsWith('.json'))){ const d=JSON.parse(fs.readFileSync(dir+'/'+f)); (g[d.flag+'/'+d.target] ||= []).push(...d.samples); }
const q=(a,p)=>{a=a.filter(Number.isFinite).sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)*p)]:null};
const f=x=>x==null?'-':Math.round(x*1000)/1000;
const cell=(s,k)=>`${f(q(s.map(x=>x[k]),.5))} [${f(q(s.map(x=>x[k]),0))}–${f(q(s.map(x=>x[k]),1))}]`;
for(const t of ['number','other']){ console.log('### target',t); for(const m of ['off','world','db','both']){ const s=g[m+'/'+t]; if(!s) continue;
  const ident=[...new Set(s.map(x=>JSON.stringify({l:x.subject.label,t:x.subject.type,r:x.subject.ret,rh:x.subject.retHref,sel:x.subject.sel,lens:x.subject.lens,text:x.text,heads:x.headsLen})))].length;
  const distinct=new Set(s.flatMap(x=>x.reqList.map(r=>r.replace(/select=[^&]*/,'select=…').replace('fn_number_lookup_2029_page','fn_number_lookup')).map(r=>r.slice(0,70)))).size;
  console.log(m.padEnd(6),'n='+s.length,'| ctx',cell(s,'tCtx'),'| content',cell(s,'tContent'),'| reqs',cell(s,'reqs'),'| lookup(fast)',f(q(s.map(x=>x.lookupReqs),.5))+'('+f(q(s.map(x=>x.fast),.5))+')','| cpu',cell(s,'cpuMs'),'| longMs',cell(s,'longMs'),'| cls',cell(s,'cls'),'| identityVariants',ident,'distinctReqKinds',distinct); } }
