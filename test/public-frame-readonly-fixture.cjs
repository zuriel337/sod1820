// Preserve the baseline deny-default transport; vary cached HTTP responses by Origin.
const pw=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
const db='https://linswmnnkjxvweumprav.supabase.co',origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4185';
const allowed=new Set(require('../docs/reviews/public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(f=>f.proname));allowed.add('convergence_meter');
allowed.add('is_number_indexable');allowed.add('is_phrase_indexable');
const cache=new Map();
const test=pw.test.extend({context:async({context},use,info)=>{
 const api=await pw.request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{});const audit={readOnlyTransport:true,reads:[],blocked:[],errors:[]};
 await context.routeWebSocket('**/*',ws=>ws.close());
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url()),method=req.method();if(u.origin===origin&&method==='GET')return route.continue();
  const publicImage=method==='GET'&&u.origin===db&&u.pathname.startsWith('/storage/v1/object/public/')&&req.resourceType()==='image';
  const font=['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(u.origin)&&method==='GET';const rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
  if(publicImage || font || (u.origin===db && ((['GET','HEAD'].includes(method)&&u.pathname.startsWith('/rest/v1/')&&(!rpc||allowed.has(rpc)))||(method==='POST'&&allowed.has(rpc))))){
   const get=new URL(u);if(method==='POST')for(const [k,v]of Object.entries(req.postDataJSON()||{})){if(v==null)continue;get.searchParams.set(k,Array.isArray(v)?'{'+v.map(x=>typeof x==='string'?'"'+x.replaceAll('"','\\"')+'"':String(x)).join(',')+'}':typeof v==='object'?JSON.stringify(v):String(v));}
   const key=(method==='HEAD'?'HEAD ':'GET ')+get.href+JSON.stringify({accept:req.headers().accept,origin:req.headers().origin,prefer:req.headers().prefer,range:req.headers().range});try{if(!cache.has(key)){const task=(async()=>{const h=req.headers(),headers={};for(const name of ['apikey','authorization','accept','range','range-unit','prefer','origin'])if(h[name])headers[name]=h[name];const r=await api[method==='HEAD'?'head':'get'](get.href,{headers:{...headers,'Cache-Control':'no-cache'},maxRedirects:0,timeout:25000});const status=r.status();const responseHeaders=r.headers();delete responseHeaders['content-encoding'];delete responseHeaders['content-length'];const entry={status,body:await r.body(),headers:responseHeaders};if(status>=500)throw Error('upstream_'+status);return entry;})();cache.set(key,task);task.catch(()=>cache.delete(key));}const entry=await cache.get(key);audit.reads.push({path:u.pathname,status:entry.status,transport:method==='HEAD'?'HEAD':'GET'});return route.fulfill(entry);}catch(e){audit.errors.push({path:u.pathname,error:String(e.message).split('\n')[0]});return route.abort();}
  }
  if(['data:','blob:'].includes(u.protocol))return route.continue();audit.blocked.push({path:u.pathname,method,origin:u.origin});return route.abort();
 });
 try{await use(context);}finally{fs.mkdirSync(path.dirname(info.outputPath('read-only-audit.json')),{recursive:true});fs.writeFileSync(info.outputPath('read-only-audit.json'),JSON.stringify(audit,null,2));await api.dispose();}
}});
module.exports={...pw,test};
