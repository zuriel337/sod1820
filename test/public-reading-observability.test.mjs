import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { build, transform } from "esbuild";
import { readingTelemetryPath, readingWebVitalBody } from "../src/lib/publicReadingTelemetry2029.js";
import { buildPublicReadingWorker } from "../public-reading-deploy/transport.js";
import { publicReadingAdminApi } from "../public-reading-deploy/read-only-api.js";
import { buildWebVitalsSnapshot } from "../src/lib/webVitalsCore.js";

const SITE = "https://sod1820.co.il", DB = "https://linswmnnkjxvweumprav.supabase.co";
const UID = "11111111-1111-4111-8111-111111111111";
const token = Buffer.from('{}').toString('base64url') + '.' + Buffer.from(JSON.stringify({role:'authenticated',sub:UID})).toString('base64url') + '.signature';
const json = value => new Response(JSON.stringify(value), { headers: {"Content-Type":"application/json"} });
function vital(phase = "checkpoint") {
  return { p_sod_id:null,p_session_id:null,p_surface:"performance",p_event_type:"web_vital",p_path:"/",p_app_context:"chrome",p_is_bot:false,
    p_props:{...buildWebVitalsSnapshot(),sample_id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",phase,
      flush_reason:phase === "checkpoint" ? "15s_checkpoint" : "pagehide", initial_path:"/",current_path:"/",collector:"performance_observer",
      measurement_scope:"document_navigation_hard_load_only",nav_type:"navigate",visibility_at_flush:"visible"} };
}
function worker({origin=SITE,clientPath="/",clientId="window-1"}={}) {
  const listeners={},calls=[];
  const self={location:{origin},skipWaiting(){},clients:{claim(){},get:async()=>({type:"window",url:origin+clientPath})},addEventListener:(name,fn)=>{listeners[name]=fn;}};
  const context={self,Request,Response,Headers,URL,URLSearchParams,atob,TextEncoder,console,fetch:async(req,opts)=>{const r=req instanceof Request?req:new Request(req,opts);calls.push(r);return json({ok:true});}};
  vm.runInNewContext(buildPublicReadingWorker("a".repeat(40),{anonKey:"public-fixture",gaId:"G-TEST12345"}),context);
  return {calls,request:async(path,body,options={})=>{
    let response;
    const request=new Request(path,{...(body?{method:"POST",body:JSON.stringify(body),headers:{"Content-Type":"application/json"}}:{}),...options});
    listeners.fetch({request,clientId,respondWith:value=>{response=Promise.resolve(value);}});
    return response ? response : null;
  }};
}
test("public measurement labels redact expressions, source slugs, query tokens and private/account routes",()=>{
  for(const path of ["/number/משה?email=person@example.invalid#secret","/number/1820","/2029/number/משיח"])assert.equal(readingTelemetryPath(path),"/number/:value");
  for(const path of ["/post/public-slug","/old-wordpress-post"])assert.equal(readingTelemetryPath(path),"/post/:item");
  for(const path of ["/","/world","/number/:value","/post/:item","/tag/:item"])assert.equal(readingTelemetryPath(path),path);
  for(const path of ["/login","/auth/callback","/2029/me/research","/me/messages","/profile","/2029/control","/unsubscribe","/credits","/journey","/community/researcher/me","//evil.invalid","/%2fauth/callback","/bad%zz"])assert.equal(readingTelemetryPath(path),null,path);
});
test("the existing RUM schema preserves missing metrics and permits only the anonymous bounded family",()=>{
  const b=vital();assert.equal(readingWebVitalBody(b),true);assert.equal(b.p_props.inp_ms,null);
  for(const mutation of [b=>b.p_sod_id=UID,b=>b.p_session_id=UID,b=>b.p_event_type="view",b=>b.p_path="/2029/me/research",
    b=>b.p_props.email="person@example.invalid",b=>b.p_props.current_path="/number/שם",b=>b.p_props.cls=Infinity,
    b=>b.p_props.sample_id="not-a-document-id",b=>b.p_props.cls_shift_sources=["person@example.invalid"]]){
    const changed=structuredClone(b);mutation(changed);assert.equal(readingWebVitalBody(changed),false);
  }
});
test("emitted worker admits checkpoint/final only from the matching canonical window, strips account JWT and bounds duplicates",async()=>{
  const w=worker();const b=vital();
  assert.equal((await w.request(DB+"/rest/v1/rpc/ingest_event",b,{headers:{"Content-Type":"application/json",Authorization:"Bearer "+token}})).status,200);
  assert.equal(w.calls[0].headers.get("Authorization"),"Bearer public-fixture");
  assert.equal((await w.request(DB+"/rest/v1/rpc/ingest_event",b)).status,403);
  assert.equal((await w.request(DB+"/rest/v1/rpc/ingest_event",vital("final"))).status,200);
  assert.equal(w.calls.length,2);
  for(const opts of [{origin:"https://preview.invalid"},{clientPath:"/login"},{clientPath:"/world"},{clientId:""}]){
    const denied=worker(opts);assert.equal((await denied.request(DB+"/rest/v1/rpc/ingest_event",b)).status,403);assert.equal(denied.calls.length,0);
  }
});
test("RUM cannot broaden report, identity, billing or generic event admission",async()=>{
  for(const body of [{...vital(),p_sod_id:UID},{...vital(),p_event_type:"search"},{...vital(),p_props:{...vital().p_props,raw_query:"private"}}]){
    const w=worker();assert.equal((await w.request(DB+"/rest/v1/rpc/ingest_event",body)).status,403);assert.equal(w.calls.length,0);
  }
  for(const rpc of ["link_identity","claim_daily_credit","newsletter_send"]){const w=worker();assert.equal((await w.request(DB+"/rest/v1/rpc/"+rpc,{})).status,403);assert.equal(w.calls.length,0);}
});
function collect(extra={}) {
  return "https://www.google-analytics.com/g/collect?"+new URLSearchParams({v:"2",tid:"G-TEST12345",en:"page_view",dl:SITE+"/",dt:"SOD1820",...extra});
}
test("GA4 transport admits only the configured collector and sanitized public page; marketing/private attempts fail closed",async()=>{
  const w=worker();assert.equal((await w.request(collect(),null,{method:"POST"})).status,200);assert.equal(w.calls.length,1);
  for(const extra of [{tid:"G-FOREIGN"},{dl:SITE+"/?email=private"},{dl:SITE+"/login"},{dl:"https://foreign.invalid/"},{dt:"Private person's name"},{en:"purchase"},{"up.email":"private"},{uid:UID}]){
    const denied=worker();assert.equal((await denied.request(collect(extra),null,{method:"POST"})).status,403);assert.equal(denied.calls.length,0);
  }
  for(const opts of [{origin:"https://preview.invalid"},{clientPath:"/login"},{clientId:""}]){const denied=worker(opts);assert.equal((await denied.request(collect(),null,{method:"POST"})).status,403);assert.equal(denied.calls.length,0);}
  const denied=worker();assert.equal((await denied.request("https://www.google-analytics.com/other",null,{method:"POST"})).status,403);
});
function res(){return{code:null,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};}
const adminReq=(extra={})=>({method:"GET",url:"/api/search-console?days=30",query:{days:"30"},headers:{host:"sod1820.co.il",authorization:"Bearer "+token},...extra});
test("admin provider adapters validate deployment, origin, method, bounded query and current role before entering the existing reader",async()=>{
  let called=0,verified=0;
  const h=publicReadingAdminApi(async(req,r)=>{called++;assert.equal(req.headers.authorization,"Bearer "+token);r.status(200).json({source:"existing-reader"});},
    {authorized:()=>true,originOf:()=>SITE,verify:async()=>{verified++;return UID;}});
  const ok=res();await h(adminReq(),ok);assert.equal(ok.code,200);assert.equal(called,1);assert.equal(ok.headers.vary,"Authorization");
  for(const req of [adminReq({method:"POST"}),adminReq({url:"/api/search-console?days=-1"}),adminReq({url:"/api/search-console?days=1&days=2"}),adminReq({url:"/api/search-console?role=admin"}),adminReq({headers:{origin:"https://foreign.invalid",authorization:"Bearer "+token}}),adminReq({headers:{host:"sod1820.co.il"}})]){
    const bad=res();await h(req,bad);assert.ok([400,403,405,421].includes(bad.code));assert.equal(called,1);
  }
  const noRole=publicReadingAdminApi(()=>assert.fail("unverified reader"),{authorized:()=>true,originOf:()=>SITE,verify:async()=>null});const bad=res();await noRole(adminReq(),bad);assert.equal(bad.code,403);
  const dormant=publicReadingAdminApi(()=>assert.fail("dormant reader"),{authorized:()=>false});const closed=res();await dormant(adminReq(),closed);assert.equal(closed.code,503);
  assert.equal(verified,1);
});
test("emitted worker preserves bearer only for the three GET admin readers, never a public/admin proxy",async()=>{
  for(const path of ["/api/ga-insights","/api/vercel-insights","/api/search-console"]){
    const w=worker();assert.equal((await w.request(SITE+path+"?days=30",null,{headers:{Authorization:"Bearer "+token}})).status,200);assert.equal(w.calls[0].headers.get("Authorization"),"Bearer "+token);
    for(const req of [{method:"POST"},{method:"GET",headers:{}},{method:"GET",headers:{Authorization:"Bearer "+token},url:SITE+path+"?url=https://foreign.invalid"}]){
      const denied=worker();const target=req.url||SITE+path;delete req.url;assert.equal((await denied.request(target,null,req)).status,403);assert.equal(denied.calls.length,0);
    }
  }
  const w=worker();assert.equal((await w.request(SITE+"/api/admin-unknown",null,{headers:{Authorization:"Bearer "+token}})).status,403);assert.equal(w.calls.length,0);
});
test("actual GA adapter groups public labels and never initializes on a private route; Legacy options stay separate",async()=>{
  const source=await build({entryPoints:["src/lib/analytics.js"],bundle:true,write:false,format:"cjs",platform:"node",define:{"import.meta.env.VITE_GA_ID":'"G-TEST12345"'}});
  const scripts=[],layer=[];const context={exports:{},module:{exports:{}},window:{location:{origin:SITE,href:SITE+"/number/PRIVATE?token=SECRET"},dataLayer:layer},document:{title:"PRIVATE TITLE",createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}}};
  context.exports=context.module.exports;vm.runInNewContext(source.outputFiles[0].text,context);const a=context.module.exports;
  a.initGA({publicReading:true,path:"/login"});assert.equal(scripts.length,0);
  a.initGA({publicReading:true,path:"/number/PRIVATE"});a.trackPageview("/number/PRIVATE?token=SECRET",{publicReading:true});
  assert.equal(scripts.length,1);const serialized=JSON.stringify(context.window.dataLayer);assert.ok(!serialized.includes("PRIVATE"));assert.ok(!serialized.includes("SECRET"));assert.ok(serialized.includes("/number/:value"));
  const beforePrivate=context.window.dataLayer.length;
  a.trackPageview("/2029/me/research",{publicReading:true});assert.equal(context.window.dataLayer.length,beforePrivate);
});
test("the actual public RUM collector never creates/bridges identity and finalizes through the same bounded existing event family",async()=>{
  const code=await build({entryPoints:["src/lib/webVitals2029.js"],bundle:true,write:false,format:"cjs",platform:"node",plugins:[{name:"existing-io-fixtures",setup(b){
    b.onResolve({filter:/\/(?:supabase|identity|botVerdict)\.js$/},a=>({path:a.path.split('/').at(-1),namespace:"fixture"}));
    b.onLoad({filter:/.*/,namespace:"fixture"},a=>({contents:a.path==='supabase.js'?`export const SUPABASE_URL='${DB}',SUPABASE_ANON='public-fixture';export const supabase={rpc:(...args)=>{globalThis.calls.push(args);return Promise.resolve({});}};`:a.path==='identity.js'?`export function getSodId(){throw Error('identity access');}export function sessionId(){throw Error('session identity access');}export const appContext=()=> 'chrome';`:`export const isBot=()=>false;`}));
  }}]});
  let checkpoint;const events={},calls=[],posts=[];const doc={visibilityState:"visible",addEventListener:(n,fn)=>events[n]=fn,removeEventListener(){}};
  const win={location:{pathname:"/number/PRIVATE"},addEventListener:(n,fn)=>events[n]=fn,removeEventListener(){}};
  const context={module:{exports:{}},calls,console,URL,JSON,document:doc,location:win.location,performance:{getEntriesByType:()=>[]},fetch:async(url,opts)=>{posts.push({url,opts});return json({ok:true});}};context.exports=context.module.exports;
  vm.runInNewContext(code.outputFiles[0].text,context);
  const cleanup=context.module.exports.startWebVitals2029({win,doc,production:true,publicReading:true,bot:false,PerformanceObserverCtor:class{observe(){}disconnect(){}},sampleId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",setTimeoutFn:fn=>{checkpoint=fn;return 1;},clearTimeoutFn(){}});
  checkpoint();assert.equal(calls.length,1);assert.equal(calls[0][0],"ingest_event");assert.equal(readingWebVitalBody(calls[0][1]),true);assert.equal(calls[0][1].p_path,"/number/:value");
  events.pagehide();assert.equal(posts.length,1);assert.equal(posts[0].url,DB+"/rest/v1/rpc/ingest_event");assert.equal(readingWebVitalBody(JSON.parse(posts[0].opts.body)),true);
  events.pagehide();assert.equal(posts.length,1);cleanup();
});
test("actual route effects activate only anonymous RUM and delayed public GA, preserving the marketing/identity/credit ceiling",async()=>{
  const app=readFileSync("src/App2029.jsx","utf8");const source=app.slice(app.indexOf("function RouteEffects2029()"),app.indexOf("// A 2029 runtime never"));
  const code=(await transform(source,{loader:"jsx",format:"cjs"})).code;const calls=[],effects=[];let mutation,ready=false,idle;
  const context={PUBLIC_READING_RELEASE:true,integratedPreviewEnabled:false,kingdomPreviewEnabled:false,useLocation:()=>({pathname:"/"}),useEffect:fn=>effects.push(fn),
    useAuth:()=>({loading:false,isAdmin:false}),React:{useRef:value=>({current:value})},
    window:{location:{hostname:"sod1820.co.il"},requestIdleCallback:fn=>{idle=fn;return 1;},cancelIdleCallback:()=>{}},
    document:{querySelector:()=>ready?{}:null,getElementById:()=>({}),body:{}},MutationObserver:class{constructor(fn){mutation=fn;}observe(){}disconnect(){}},
    readingTelemetryPath,startWebVitals2029:opts=>{calls.push(["RUM",opts]);return ()=>{};},initGA:opts=>calls.push(["GA",opts]),trackPageview:(...args)=>calls.push(["page",...args]),
    initMarketing:()=>assert.fail("marketing"),ensureIdentity:()=>assert.fail("identity bridge"),startPageEngagement:()=>assert.fail("generic event sink"),setTimeout,clearTimeout};
  vm.runInNewContext(code+";RouteEffects2029();",context);const cleanup=effects.map(fn=>fn());assert.equal(calls.length,1);assert.equal(calls[0][0],"RUM");assert.equal(calls[0][1].publicReading,true);
  ready=true;mutation();assert.equal(calls.length,1);idle();assert.deepEqual(calls.map(x=>x[0]),["RUM","GA","page"]);cleanup.forEach(fn=>fn?.());
});
