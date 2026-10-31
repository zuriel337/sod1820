const pw=require('@playwright/test');
const fs=require('node:fs');
const origin='https://sod1820-26of53pw9-sod1820-s-projects.vercel.app';
const database='https://linswmnnkjxvweumprav.supabase.co';
const allowed=new Set(['gematria_api','fn_method_value','fn_method_profile','gematria_method_trace','fn_zero_scale','posts_by_number_strict','fn_number_lookup','fn_number_dossier','fn_number_journey','fn_verses_by_gematria','lang_links_list','number_neighbors','fn_all_methods','world_group_source_arrivals_v2','rd_is_admin','fn_cross_research','community_feed_page','community_message_context','get_reality_videos']);
const inventory=require('../rpc-read-inventory.json').functions;
const signatures=new Map(inventory.map(f=>[f.proname,new Map(f.arguments.split(',').filter(Boolean).map(a=>[a.trim().split(/\s+/)[0],{defaultNull:/DEFAULT NULL::/.test(a)}]))]));
const safePath=u=>({origin:u.origin,path:u.pathname});
function encodeArgument(v){
  if(Array.isArray(v))return '{'+v.map(x=>typeof x==='number'||typeof x==='boolean'?String(x):'"'+String(x).replaceAll('\\','\\\\').replaceAll('"','\\"')+'"').join(',')+'}';
  return typeof v==='object'?JSON.stringify(v):String(v);
}
async function installGuard(context,audit,{localOrigin=null}={}){
  await context.routeWebSocket('**/*',ws=>{audit.blocked.push({kind:'websocket',...safePath(new URL(ws.url()))});ws.close();});
  await context.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url()),method=req.method();
    const row={method,...safePath(u),serviceWorker:!!req.serviceWorker()};
    const deny=async reason=>{audit.blocked.push({...row,reason});await route.abort('blockedbyclient');};
    if(u.origin===database){
      const rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/)?.[1];
      if(rpc&&allowed.has(rpc)&&method==='POST'){
        let body;try{body=req.postDataJSON();}catch{return deny('invalid_rpc_json');}
        if(!body||Array.isArray(body)||typeof body!=='object')return deny('invalid_rpc_arguments');
        const get=new URL(u);
        const signature=signatures.get(rpc);if(!signature)return deny('missing_reviewed_signature');
        for(const [k,v] of Object.entries(body)){
          if(!signature.has(k))return deny('unexpected_rpc_argument');
          if(v===null){if(signature.get(k).defaultNull)continue;return deny('null_rpc_argument_needs_review');}
          get.searchParams.set(k,encodeArgument(v));
        }
        const original=req.headers();
        const headers={apikey:original.apikey||'',authorization:original.authorization||'','cache-control':'no-cache'};
        try{
          // HTTP GET makes PostgREST execute the function in a READ ONLY transaction.
          // No live POST is sent, even for the audited deterministic read RPCs.
          const response=await context.request.get(get.href,{headers,maxRedirects:0,timeout:45000});
          if(response.status()>=300&&response.status()<400)return deny('rpc_redirect_denied');
          audit.reads.push({...row,transportMethod:'GET',rpc,status:response.status()});
          return route.fulfill({response});
        }catch{audit.transportErrors.push({...row,rpc,reason:'readonly_rpc_transport_failed'});return route.abort('failed');}
      }
      if(['GET','HEAD'].includes(method)&&((u.pathname.startsWith('/rest/v1/')&&!rpc)||(rpc&&allowed.has(rpc))||/^\/storage\/v1\/(?:object\/public|render\/image\/public)\//.test(u.pathname))){
        audit.reads.push(row);return route.continue();
      }
      return deny('only_postgrest_readonly_or_public_storage');
    }
    if(u.origin===origin&&['GET','HEAD'].includes(method)){
      if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/_vercel/'))return deny('preview_dynamic_endpoint');
      audit.staticReads++;return route.continue();
    }
    if(localOrigin&&u.origin===localOrigin&&method==='GET'){audit.localReads.push(row);return route.continue();}
    if(['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(u.origin)&&method==='GET')return route.continue();
    if(['data:','blob:'].includes(u.protocol))return route.continue();
    return deny('external_or_mutating_request');
  });
}
const newAudit=()=>({blocked:[],reads:[],responses:[],localReads:[],transportErrors:[],staticReads:0});
async function readProtectedStatic(context,url){
  for(let attempt=0;attempt<4;attempt++){
    const response=await context.request.get(url,{maxRedirects:0,timeout:30000});
    if(![429,502,503,504].includes(response.status())||attempt===3)return response;
    await new Promise(r=>setTimeout(r,250*2**attempt));
  }
}
async function authenticate(context){
  let url=process.env.SOD_PREVIEW_ACCESS_URL;
  let phase='access',lastStatus=null;
  if(!url||new URL(url).origin!==origin)throw new Error('Expected protected Preview access URL on private runner input');
  try{
    if(process.env.SOD_VERCELOAUTH_STATE){
      const cookies=JSON.parse(process.env.SOD_VERCELOAUTH_STATE);
      const host=new URL(origin).hostname;
      if(!Array.isArray(cookies)||cookies.some(c=>![host,'.'+host,'.vercel.app'].includes(c.domain)))throw new Error();
      await context.addCookies(cookies);url=null;
    }
    for(let i=0;i<6;i++){
      if(!url)break;
      const response=await readProtectedStatic(context,url);
      lastStatus=response.status();
      if(response.status()>=300&&response.status()<400){const next=new URL(response.headers().location,url);if(next.origin!==origin)throw new Error();url=next.href;continue;}
      if(!response.ok())throw new Error();break;
    }
    phase='identity';const response=await readProtectedStatic(context,origin+'/preview-identity.json');lastStatus=response.status();
    const identity=await response.json();
    pw.expect(identity.sha).toBe('63e6882c3b7b4004d337927c7231728a7612d452');
    pw.expect(identity.target).toBe('preview');
  }catch{throw new Error(`Protected Preview authentication/identity validation failed at ${phase}, HTTP ${lastStatus}; credentials withheld`);}
}
const test=pw.test.extend({context:async({context},use,testInfo)=>{
  if(process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS!=='1')throw new Error('Service Worker interception must be enabled');
  if(process.env.SOD_GUARD_PREFLIGHT_PASSED!=='1')throw new Error('Local guard preflight must pass before hosted navigation');
  const audit=newAudit();await installGuard(context,audit);
  context.on('response',response=>{const req=response.request(),u=new URL(response.url());if(u.origin===database)audit.responses.push({method:req.method(),...safePath(u),status:response.status(),serviceWorker:!!req.serviceWorker()});});
  try{await authenticate(context);await use(context);}finally{
    const file=testInfo.outputPath('sanitized-network-audit.json');fs.mkdirSync(require('node:path').dirname(file),{recursive:true});
    fs.writeFileSync(file,JSON.stringify({test:testInfo.title,...audit},null,2));
  }
}});
module.exports={...pw,test,installGuard,newAudit,origin};
