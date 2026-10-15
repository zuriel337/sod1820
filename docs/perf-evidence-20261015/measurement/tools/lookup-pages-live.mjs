// LIVE server measurement (real HTTPS to the canonical project, guest/anon key, sequential, limited): number lookup pages.
// Walks a number's rows page by page (cursor) with the existing RPC and with the additive RPC; same content check; per-call timing.
import fs from 'node:fs';
import { SUPABASE_URL, SUPABASE_ANON } from '/home/user/sod1820/src/lib/supabasePublicConfig.js';
const call = async (name, body) => { const t=performance.now(); const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method:'POST', headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${SUPABASE_ANON}`, 'content-type':'application/json' }, body: JSON.stringify(body) }); const j=await r.json(); return { status:r.status, json:j, ms:performance.now()-t }; };
const walk = async (name, value, limit) => { let after=null, rows=[], ms=[], calls=0; for(;;){ const r=await call(name,{p_value:value,p_limit:limit,p_after_bid_id:after}); if(r.status!==200) throw new Error(`${name} ${r.status} ${JSON.stringify(r.json).slice(0,100)}`); calls++; ms.push(r.ms); rows.push(...r.json); if(r.json.length<limit) break; after=r.json[r.json.length-1].bid_id; } return { rows, ms, calls }; };
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor((s.length-1)/2)]};
const out=[]; const REPS=3;
for (const [value,limit] of [[26,20],[300,20],[1820,20],[26,500],[300,500],[1820,500]]) {
  const per={old:[],new:[]}; let same=true, n=0, pages=0;
  await walk('fn_number_lookup',value,limit); await walk('fn_number_lookup_2029_page',value,limit); // warm both
  for(let r=0;r<REPS;r++){ const order=r%2?['new','old']:['old','new']; const got={};
    for(const k of order){ const t=performance.now(); got[k]=await walk(k==='old'?'fn_number_lookup':'fn_number_lookup_2029_page',value,limit); per[k].push({total:performance.now()-t, perCall:med(got[k].ms), calls:got[k].calls}); }
    if(JSON.stringify(got.old.rows)!==JSON.stringify(got.new.rows)) same=false; n=got.old.rows.length; pages=got.old.calls; }
  out.push({value,limit,rows:n,pages,identicalOrderedRows:same, oldTotalMs:Math.round(med(per.old.map(x=>x.total))), newTotalMs:Math.round(med(per.new.map(x=>x.total))), oldPerCallMs:Math.round(med(per.old.map(x=>x.perCall))), newPerCallMs:Math.round(med(per.new.map(x=>x.perCall))), oldRangeMs:[Math.round(Math.min(...per.old.map(x=>x.total))),Math.round(Math.max(...per.old.map(x=>x.total)))], newRangeMs:[Math.round(Math.min(...per.new.map(x=>x.total))),Math.round(Math.max(...per.new.map(x=>x.total)))]});
}
fs.writeFileSync(process.argv[2],JSON.stringify({measured:new Date().toISOString(),method:'live HTTPS from sandbox, guest, sequential, 1 warm walk + 3 alternating reps per cell',out},null,1)); console.log(JSON.stringify(out));
