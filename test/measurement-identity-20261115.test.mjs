import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { build } from 'esbuild';
import { readingMeasurementBody, readingMeasurementPath } from '../src/lib/publicReadingTelemetry2029.js';
import { buildPublicReadingWorker } from '../public-reading-deploy/transport.js';

const compiled = await build({stdin:{contents:`export * from './src/lib/measurement2029.js'; export * from './src/lib/measurementAuth2029.js'; export {emit,emitPublicArrivalOnce} from './src/lib/events.js';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'measurement',platform:'browser',plugins:[{name:'isolated-dependencies',setup(b){
 b.onLoad({filter:/\/supabase\.js$/},()=>({contents:`export const SUPABASE_URL='https://example.supabase.co',SUPABASE_ANON='anon-test'; export const supabase={rpc:(...args)=>{globalThis.rpcCalls.push(args);return Promise.resolve({})}};`}));
 b.onLoad({filter:/\/publicReadingRelease2029\.js$/},()=>({contents:'export const PUBLIC_READING_RELEASE=true;'}));
}}]});
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
function client({local=storage(),session=storage()}={}){
 const sent=[],rpcCalls=[],listeners=new Map();
 const doc={cookie:'vb=browser',referrer:'https://www.google.com/search?q=not-collected',visibilityState:'visible',documentElement:{scrollHeight:2000},addEventListener(){},removeEventListener(){}};
 const loc={pathname:'/post/example',search:'?utm_source=google&secret=local',host:'sod1820.co.il'};
 const c={console,URL,URLSearchParams,crypto:webcrypto,Date,Math,JSON,Map,Set,Promise,localStorage:local,sessionStorage:session,document:doc,location:loc,navigator:{userAgent:'Mozilla/5.0 Chrome/120.0'},rpcCalls,
 setInterval:()=>1,clearInterval(){},fetch:async(url,options)=>{sent.push({url,...options,parsed:JSON.parse(options.body)});return {ok:true};}};
 c.window={setInterval:()=>1,clearInterval(){},location:loc,innerHeight:500,scrollY:0,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener(){}};
 vm.createContext(c);vm.runInContext(compiled.outputFiles[0].text,c);
 return {m:c.measurement,c,sent,rpcCalls,local,session,listeners,settle:async()=>{for(let i=0;i<8;i++)await Promise.resolve();}};
}
const account=(id,token)=>({user:{id},access_token:token});
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';

test('guest -> account A -> logout -> account B: stable browser, distinct sessions, immutable earlier credentials',async()=>{
 const h=client();assert.equal(h.m.captureMeasurement(),null,'no fabricated guest while auth is pending');
 h.m.setMeasurementAuth(null);const guest=h.m.captureMeasurement();
 h.m.setMeasurementAuth(account(A,'token-A'));const a=h.m.captureMeasurement();
 h.m.setMeasurementAuth(null);const logout=h.m.captureMeasurement();
 h.m.setMeasurementAuth(account(B,'token-B'));const b=h.m.captureMeasurement();
 assert.equal(new Set([guest.visitorId,a.visitorId,logout.visitorId,b.visitorId]).size,1);
 assert.equal(new Set([guest.sessionId,a.sessionId,logout.sessionId,b.sessionId]).size,4);
 for(const ctx of [guest,a,logout,b]) await h.m.sendMeasurement(ctx,h.m.measurementBody(ctx,'page','view'));
 assert.deepEqual(h.sent.map(r=>r.headers.Authorization),['Bearer anon-test','Bearer token-A','Bearer anon-test','Bearer token-B']);
 assert.ok(h.sent.every(r=>!r.body.includes(A)&&!r.body.includes(B)), 'account identity is not supplied in a body');
 assert.equal(h.rpcCalls.length,0,'no link_identity or historical stitching');
});

test('refresh and token refresh retain session; 30 minute inactivity starts another session',()=>{
 const h=client();h.m.setMeasurementAuth(account(A,'token-A'));const before=h.m.captureMeasurement();
 const refresh=client({local:h.local,session:h.session});refresh.m.setMeasurementAuth(account(A,'refreshed-A'));
 assert.equal(refresh.m.captureMeasurement().sessionId,before.sessionId);
 refresh.m.setMeasurementAuth(account(A,'another-token'));assert.equal(refresh.m.captureMeasurement().sessionId,before.sessionId);
 h.local.setItem('sod_sid_t',String(Date.now()-31*60000));assert.notEqual(refresh.m.captureMeasurement().sessionId,before.sessionId);
});

test('engagement flush uses old account, once, even when account changes and pagehide races cleanup',async()=>{
 const h=client();h.m.setMeasurementAuth(account(A,'token-A'));
 const stop=h.m.startPublicPageEngagement('/post/example');
 h.m.setMeasurementAuth(account(B,'token-B'),false);stop();h.listeners.get('pagehide')?.();await h.settle();
 assert.equal(h.sent.length,1);assert.equal(h.sent[0].headers.Authorization,'Bearer token-A');
 assert.equal(h.sent[0].parsed.p_event_type,'engagement');
 assert.equal(h.sent[0].parsed.p_props.measurement.page_path,'/post/example');
});

test('one arrival per canonical session; actions and page view share IDs; no raw campaign/query',async()=>{
 const h=client();h.m.setMeasurementAuth(null);const ctx=h.m.captureMeasurement();
 assert.equal(h.m.emitPublicArrivalOnce(ctx),true);assert.equal(h.m.emitPublicArrivalOnce(ctx),false);
 h.m.emit('page','view');h.m.emit('calculator_2029','first_compute',{props:{method:'regular',expression:'private input'}});
 await h.settle();assert.equal(h.sent.length,3);assert.equal(new Set(h.sent.map(x=>x.parsed.p_session_id)).size,1);
 assert.ok(h.sent.every(x=>!x.body.includes('private input')&&!x.body.includes('secret=')&&!x.body.includes('not-collected')));
 h.m.setMeasurementAuth(account(A,'token-A'));assert.equal(h.m.emitPublicArrivalOnce(h.m.captureMeasurement()),true);
});

test('blocked storage records missing IDs without inventing a persistent browser or session',()=>{
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 const h=client({local:blocked,session:blocked});h.m.setMeasurementAuth(null);
 const ctx=h.m.captureMeasurement();assert.equal(ctx.visitorId,null);assert.equal(ctx.sessionId,null);
 assert.equal(readingMeasurementBody(h.m.measurementBody(ctx,'page','view')),true);
});

test('public page labels retain public posts/numbers, redact queries and reject private routes',()=>{
 assert.equal(readingMeasurementPath('/post/שלום?utm_source=x#title'),'/post/שלום');
 assert.equal(readingMeasurementPath('/number/73'),'/number/73');
 assert.equal(readingMeasurementPath('/number/private-expression'),'/number/:value');
 for(const path of ['/admin','/me','/community/whatsapp','/auth/callback'])assert.equal(readingMeasurementPath(path),null);
});

function worker(){const handlers={},sent=[];vm.runInNewContext(buildPublicReadingWorker('a'.repeat(40),{anonKey:'anon-test'}),{
 self:{location:{origin:'https://sod1820.co.il'},skipWaiting(){},clients:{claim:async()=>{},get:async id=>id==='page'?{type:'window',url:'https://sod1820.co.il/post/example'}:undefined},addEventListener:(n,f)=>handlers[n]=f},
 URL,Response,Request,Map,Set,JSON,fetch:async req=>{sent.push(req);return new Response('{}');}});
 return{sent,post:async(body,token='token-A',id='page')=>{let p;handlers.fetch({request:new Request('https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/ingest_event',{method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:'anon-test'},body:JSON.stringify(body)}),clientId:id,respondWith:v=>p=v});return p?await p:null;}};}

test('actual serialized worker forwards v2 credentials and rejects unknown identity/free-text fields',async()=>{
 const h=client();h.m.setMeasurementAuth(account(A,'token-A'));const ctx=h.m.captureMeasurement();const body=JSON.parse(JSON.stringify(h.m.measurementBody(ctx,'page','view')));
 const w=worker();assert.equal((await w.post(body)).status,200);assert.equal(w.sent[0].headers.get('Authorization'),'Bearer token-A');
 for(const bad of [{...body,p_user_id:A},{...body,p_props:{...body.p_props,_measurement_account:A}},{...body,p_props:{...body.p_props,query:'private'}},{...body,p_props:{measurement:{...body.p_props.measurement,account_id:A}}}])assert.equal((await w.post(bad)).status,403);
 assert.equal((await w.post(body,'token-A','not-a-window')).status,403);assert.equal(w.sent.length,1);
});

test('expired credentials are not retried under a different account or anonymous identity',async()=>{
 const h=client();h.m.setMeasurementAuth(account(A,'expired-A'));const ctx=h.m.captureMeasurement();h.m.setMeasurementAuth(account(B,'token-B'));
 let calls=0;assert.equal(await h.m.sendMeasurement(ctx,h.m.measurementBody(ctx,'page','view'),{fetchFn:async(_url,opts)=>{calls++;assert.equal(opts.headers.Authorization,'Bearer expired-A');return {ok:false};}}),false);
 assert.equal(calls,1);
});
