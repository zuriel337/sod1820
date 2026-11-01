// Extend the existing independent barrier only for the reviewed STABLE public
// writer reader. Production worker permissions remain byte-identical.
const base=require('./public-frame-readonly-fixture.cjs');
const fs=require('node:fs');
const test=base.test.extend({context:async({context},use,info)=>{
 const api=await base.request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{}),reads=[],pending=new Set();let closing=false;
 const pattern='https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/writer_public_contributions_page_v1*';
 const handler=async route=>{
  if(closing)return route.abort();
  const req=route.request();if(req.method()!=='GET')return route.fallback();
  const url=new URL(req.url());if(!/^[a-f0-9-]{36}$/i.test(url.searchParams.get('p_contributor_id')||''))return route.abort();
  const headers={};for(const name of['apikey','authorization','accept','range','range-unit','prefer','origin'])if(req.headers()[name])headers[name]=req.headers()[name];
  const task=(async()=>{
   try{const response=await api.get(url.href,{headers,maxRedirects:0,timeout:30000}),h=response.headers();delete h['content-encoding'];delete h['content-length'];
    reads.push({path:url.pathname,method:'GET',status:response.status()});await route.fulfill({status:response.status(),headers:h,body:await response.body()});
   }catch(error){reads.push({path:url.pathname,method:'GET',error:error.name,cleanup:closing});await route.abort().catch(()=>{});if(!closing)throw Error('public_writer_read_failed:'+error.name);}
  })();pending.add(task);try{await task;}finally{pending.delete(task);}
 };
 await context.route(pattern,handler);
 try{await use(context);}finally{closing=true;await context.unroute(pattern,handler);await Promise.allSettled([...pending]);fs.writeFileSync(info.outputPath('additional-stable-read-audit.json'),JSON.stringify({reader:'writer_public_contributions_page_v1',review:'live pg_proc STABLE SQL SELECT, public active/unlocked writer and approved/published roots only, 2026-11-01',reads},null,2)+'\n');await api.dispose();}
}});
module.exports={...base,test};
