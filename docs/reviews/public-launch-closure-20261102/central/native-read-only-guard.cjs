const db='https://linswmnnkjxvweumprav.supabase.co';
const allowed=require('../../public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(x=>x.proname).filter(x=>x!=='lang_links_list');
allowed.push('convergence_meter','is_number_indexable','is_phrase_indexable','writer_public_contributions_page_v1');
module.exports=async function(context,origin){
  await context.addInitScript(({db,allowed,origin})=>{
   const reads=new Set(allowed),nativeFetch=window.fetch.bind(window);window.__safetyReads=[];window.__safetyDenied=[];window.__nativeShifts=[];window.__nativeLCP=[];new PerformanceObserver(list=>{for(const e of list.getEntries())window.__nativeLCP.push({time:e.startTime,size:e.size});}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())window.__nativeShifts.push({time:e.startTime,value:e.value,hadRecentInput:e.hadRecentInput,sources:e.sources.map(s=>({node:s.node?[s.node.tagName,s.node.id,String(s.node.className).slice(0,180)].join('.'):null,parent:s.node?.parentElement?[s.node.parentElement.tagName,s.node.parentElement.id,String(s.node.parentElement.className).slice(0,180)].join('.'):null,previous:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))});}).observe({type:'layout-shift',buffered:true});
   window.fetch=(input,init)=>{const req=new Request(input instanceof Request?input:new URL(input,location.href),init),u=new URL(req.url),rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/)?.[1];
    const safeRead=u.origin===db&&((u.pathname.startsWith('/rest/v1/')&&(!rpc||reads.has(rpc))&&(['GET','HEAD'].includes(req.method)||rpc&&req.method==='POST'))||req.method==='GET'&&['/auth/v1/user','/auth/v1/settings'].includes(u.pathname)||req.method==='GET'&&u.pathname.startsWith('/storage/v1/object/public/'));
    const local=req.method==='GET'&&u.origin===origin&&!u.pathname.startsWith('/api/')||req.method==='GET'&&u.origin===origin&&/^\/api\/(?:preview-capabilities|public-document|public-sitemap|contributor-self)(?:$|\/)/.test(u.pathname);
    if(!safeRead&&!local){window.__safetyDenied.push({path:u.pathname,method:req.method});return Promise.reject(new Error('independent_read_only_guard'));}
    const row={path:u.pathname,query:u.search,method:req.method,start:performance.now()};if(req.method==='POST')req.clone().text().then(t=>row.args=t).catch(()=>{});window.__safetyReads.push(row);return nativeFetch(req).then(response=>{row.end=performance.now();row.ms=row.end-row.start;row.status=response.status;if(!response.ok)response.clone().text().then(t=>row.error=t.slice(0,350)).catch(()=>{});return response;},error=>{row.end=performance.now();row.ms=row.end-row.start;row.error=error.name;throw error;});
   };
   const open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,...args){if(!['GET','HEAD'].includes(String(method).toUpperCase()))throw Error('independent_read_only_guard');return open.call(this,method,...args);};
   navigator.sendBeacon=()=>false;const NativeSocket=window.WebSocket;
   window.WebSocket=class extends NativeSocket{constructor(url,protocols){const u=new URL(url);if(u.origin!==db.replace('https:','wss:'))throw Error('independent_read_only_guard');super(url,protocols);}send(data){const m=JSON.parse(data),event=Array.isArray(m)?m[3]:m.event;if(!['phx_join','phx_leave','heartbeat','access_token'].includes(event))throw Error('independent_read_only_guard');return super.send(data);}};
  },{db,allowed,origin});

};
