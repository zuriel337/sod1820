import { createNumberLookupTransport, resetNumberLookupTransportMemory } from "<checkout of 4b8855f3>/src/lib/research/numberLookupTransport2029.js";
const ON=async()=>({fx_number_lookup_page:true});
async function run(label,{conc,mk,after=0}){ resetNumberLookupTransportMemory(); const calls=[]; let t=0;
 const rpc=async(n,a)=>{ calls.push(n); await new Promise(r=>setTimeout(r,50)); return mk(n,a); };
 const r=createNumberLookupTransport(rpc,{is2029:true,readSwitches:ON});
 const burst=await Promise.allSettled(Array.from({length:conc},(_,i)=>r("fn_number_lookup",{p_value:i})));
 const c1={cand:calls.filter(c=>c.endsWith("_page")).length,base:calls.filter(c=>c==="fn_number_lookup").length}; calls.length=0;
 await Promise.allSettled(Array.from({length:after},(_,i)=>r("fn_number_lookup",{p_value:100+i})));
 console.log(label,JSON.stringify({burst:c1,afterKnown:{cand:calls.filter(c=>c.endsWith("_page")).length,base:calls.filter(c=>c==="fn_number_lookup").length},ok:burst.filter(x=>x.status==="fulfilled").length}));}
const missing=(n)=>{ if(n.endsWith("_page")) return {error:{code:"PGRST202"}}; return {data:[]}; };
const denied=(n)=>{ if(n.endsWith("_page")) return {error:{code:"42501"}}; return {data:[]}; };
await run("missing x4 concurrent, then 4 later",{conc:4,after:4,mk:missing});
await run("missing x1 then 4",{conc:1,after:4,mk:missing});
await run("denied  x4 concurrent, then 4 later",{conc:4,after:4,mk:denied});
