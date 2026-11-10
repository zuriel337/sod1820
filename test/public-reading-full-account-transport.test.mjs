import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { verifyReadingAdmin } from '../public-reading-deploy/admin-request.js';
import { buildPublicReadingWorker, PUBLIC_READING_POLICY_ID } from '../public-reading-deploy/transport.js';
import { readingSessionOptions } from '../src/lib/publicReadingAuthSession.js';
import { providerOAuthRequest } from '../src/lib/oauthReturn.js';
import { interceptPublicReadingAdminAuth } from '../preview-deploy/admin-readonly-auth.js';
const API='https://linswmnnkjxvweumprav.supabase.co', SITE='https://preview.invalid';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const token=(uid=a,role='authenticated')=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,role})).toString('base64url')+'.synthetic';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
function worker({role='admin',uid=a,rows,authError=false,throwFetch=false,fetchAction,signal,anonKey=''}={}) {
 let listener;const calls=[];
 const context={Request,Response,URL,Set,Map,JSON,atob,fetch:async(input,options)=>{
  const req=input instanceof Request?input:new Request(input,options);calls.push(req);
  if(throwFetch)throw Error('synthetic network failure');
  if(req.url===API+'/auth/v1/user')return json({id:uid},authError?401:200);
  if(req.url.startsWith(API+'/rest/v1/users?select=id%2Crole'))return json(rows??[{id:uid,role}]);
  return fetchAction?fetchAction(req):json({ok:true});
 },self:{location:{origin:SITE},addEventListener:(type,fn)=>{if(type==='fetch')listener=fn;}}};
 vm.runInNewContext(buildPublicReadingWorker('a'.repeat(40),{anonKey}),context);
 return {calls,async request(path,{method='POST',body={},jwt=token(),headers={},origin=API,omitApiKey=false}={}){
  let response;
  const request=new Request(origin+path,{method,headers:{Authorization:`Bearer ${jwt}`,...(!omitApiKey?{apikey:'publishable-synthetic'}:{}),...headers},...(method==='GET'||method==='HEAD'?{}:{body:JSON.stringify(body)}),signal});
  listener({request,respondWith(p){response=p;}});
  return response?await response:null;
 }};
}
test('worker policy changed and exact callback alone consumes tab-bound PKCE',()=>{
 assert.equal(PUBLIC_READING_POLICY_ID,'public-reading-owned-account-continuity-20261110');
 const storage={getItem(){},setItem(){},removeItem(){}};
 for(const pathname of ['/','/world','/auth/callback/','/post/auth/callback'])assert.equal(readingSessionOptions(storage,{pathname}).detectSessionInUrl,false);
 const configured=readingSessionOptions(storage,{pathname:'/auth/callback'});
 assert.equal(configured.detectSessionInUrl,true);assert.equal(configured.flowType,'pkce');
 // The SDK now receives a storage that cannot throw. While the given storage works it is written and read through unchanged.
 const map=new Map(),through={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const wrapped=readingSessionOptions(through,{pathname:'/auth/callback'}).storage;
 wrapped.setItem('a','1');assert.equal(map.get('a'),'1');assert.equal(wrapped.getItem('a'),'1');wrapped.removeItem('a');assert.equal(map.has('a'),false);
 assert.equal(configured.storageKey,'sod-public-reading-account');
});
test('Google and Facebook share verified exact callback and reject unapproved Preview origins',()=>{
 for(const provider of ['google','facebook']) {
  const request=providerOAuthRequest({provider,origin:'https://approved.vercel.app',functionalPreview:true,returnTo:'/world?q=1820#world-map',verifiedPreviewOrigins:['https://approved.vercel.app']});
  assert.equal(request.options.redirectTo,'https://approved.vercel.app/auth/callback');
  assert.equal(request.options.scopes,provider==='facebook'?'email public_profile':undefined);
  assert.throws(()=>providerOAuthRequest({provider,origin:'https://other.vercel.app',functionalPreview:true,verifiedPreviewOrigins:['https://approved.vercel.app']}),/OAUTH_PREVIEW_UNVERIFIED/);
 }
});
test('emitted account transport admits existing login, new signup, verification and exact PKCE exchange',async()=>{
 const w=worker();
 for(const [path,body] of [
  ['/auth/v1/otp',{email:'owner@example.invalid',data:{},create_user:false,gotrue_meta_security:{},code_challenge:'a'.repeat(43),code_challenge_method:'s256'}],
  ['/auth/v1/verify',{email:'owner@example.invalid',token:'12345678',type:'email',gotrue_meta_security:{}}],
  ['/auth/v1/otp',{email:'owner@example.invalid',data:{},create_user:true,gotrue_meta_security:{},code_challenge:'a'.repeat(43),code_challenge_method:'s256'}],
  ['/auth/v1/token?grant_type=pkce',{auth_code:'auth-code-synthetic',code_verifier:'a'.repeat(56)}],
 ]){const response=await w.request(path,{body});assert.equal(response.status,200,path);}
 assert.equal(w.calls.length,4);
});
test('new Auth transport denies role/data injection, phone, arbitrary callback, recovery and non-PKCE grants',async()=>{
 for(const [path,body] of [
  ['/auth/v1/otp',{email:'owner@example.invalid',data:{role:'admin'},create_user:true,code_challenge:'a'.repeat(43),code_challenge_method:'s256'}],
  ['/auth/v1/otp?redirect_to=https://evil.invalid',{email:'owner@example.invalid',data:{},create_user:true}],
  ['/auth/v1/otp',{phone:'+15555555555',create_user:true}],
  ['/auth/v1/verify',{email:'owner@example.invalid',token:'123456',type:'recovery'}],
  ['/auth/v1/token?grant_type=pkce',{auth_code:'code',code_verifier:'short'}],
  ['/auth/v1/token?grant_type=pkce&grant_type=password',{auth_code:'code',code_verifier:'a'.repeat(56)}],
  ['/auth/v1/user',{role:'admin'}],['/auth/v1/signup',{}],['/auth/v1/recover',{}],
 ]){const w=worker();assert.equal((await w.request(path,{body})).status,403,path);assert.equal(w.calls.length,0,path);}
});
test('historical Preview Auth remains password-only unless explicitly opted in by this worker',async()=>{
 let reply;const ev={request:new Request(API+'/auth/v1/otp',{method:'POST',body:JSON.stringify({email:'owner@example.invalid',data:{},create_user:true,code_challenge:'a'.repeat(43),code_challenge_method:'s256'})}),respondWith(p){reply=p;}};
 assert.equal(interceptPublicReadingAdminAuth(ev,API),true);assert.equal((await reply).status,403);
});
test('explicit admin actions verify canonical JWT and exact own role before forwarding original request',async()=>{
 for(const path of ['/functions/v1/ai-analyze','/functions/v1/research-run','/rest/v1/rpc/fn_get_or_create_my_person']) {
  const w=worker();const response=await w.request(path,{body:{user_id:a,operation:'explicit'},method:path.includes('/users?')?'PATCH':'POST'});
  assert.equal(response.status,200,path);assert.equal(w.calls.length,3,path);
  assert.equal(w.calls[0].url,API+'/auth/v1/user');assert.match(w.calls[1].url,new RegExp('id=eq.'+a));
  assert.equal(w.calls[2].url,API+path);assert.equal(w.calls[2].headers.get('authorization'),'Bearer '+token());
  assert.equal(w.calls[2].cache,'no-store');assert.equal(w.calls[2].redirect,'error');
 }
});
test('anonymous/member/spoofed identity, stale role, JWT failure and transport failure cannot invoke action',async()=>{
 for(const opts of [{role:'member'},{uid:b},{rows:[{id:b,role:'admin'}]},{rows:[{id:a,role:'admin'},{id:a,role:'admin'}]},{authError:true},{throwFetch:true}]){
  const w=worker(opts);assert.equal((await w.request('/functions/v1/ai-analyze',{body:{user_id:a,role:'admin'}})).status,403);assert.equal(w.calls.some(req=>req.url.endsWith('/functions/v1/ai-analyze')),false);
 }
 for(const jwt of ['',token(a,'anon'),'malformed']){const w=worker();assert.equal((await w.request('/functions/v1/ai-analyze',{jwt})).status,403);assert.equal(w.calls.length,0);}
});
test('no private role cache survives revocation or replacement; denied action never reaches endpoint',async()=>{
 let role='admin';const calls=[];
 const fetchImpl=async(url,options)=>{calls.push({url,options});return json(url.endsWith('/auth/v1/user')?{id:a}:[{id:a,role}]);};
 assert.equal(await verifyReadingAdmin({token:token(),apiKey:'publishable',fetchImpl}),a);
 role='member';assert.equal(await verifyReadingAdmin({token:token(),apiKey:'publishable',fetchImpl}),null);assert.equal(calls.length,4);
 const abort=new AbortController();abort.abort();assert.equal(await verifyReadingAdmin({token:token(),apiKey:'publishable',fetchImpl,signal:abort.signal}),null);assert.equal(calls.length,4);
});
test('financial, shared flag, mail delivery and foreign writes remain unavailable even to admin',async()=>{
 for(const path of ['/functions/v1/cardcom-checkout','/functions/v1/send-newsletter','/functions/v1/welcome-backfill','/functions/v1/wa-system-outbox','/rest/v1/rpc/credit_reserve_v1','/rest/v1/rpc/claim_daily_credit','/rest/v1/rpc/membership_credit_summary_v1','/rest/v1/profiles','/rest/v1/credit_ledger','/rest/v1/site_flags','/rest/v1/subscribers']) {
  const w=worker();assert.equal((await w.request(path)).status,403,path);assert.equal(w.calls.length,0,path);
 }
 const w=worker();assert.equal((await w.request('/functions/v1/ai-analyze',{origin:'https://other.supabase.co'})).status,403);assert.equal(w.calls.length,0);
});
test('signed private media TUS requires verified admin JWT on every chunk; signature alone grants nothing',async()=>{
 const origin='https://linswmnnkjxvweumprav.storage.supabase.co';
 for(const method of ['POST','PATCH','HEAD']) {
  const w=worker();assert.equal((await w.request('/storage/v1/upload/resumable/object',{origin,method,headers:{'Tus-Resumable':'1.0.0','x-signature':'signed-object'}})).status,200);assert.equal(w.calls.length,3);
  const denied=worker();assert.equal((await denied.request('/storage/v1/upload/resumable/object',{origin,method,jwt:'',headers:{'Tus-Resumable':'1.0.0','x-signature':'signed-object'}})).status,403);assert.equal(denied.calls.length,0);
 }
});
test('same-origin private adapter preserves only same-origin protection cookies; it independently verifies the current server principal',async()=>{
 const w=worker({anonKey:'publishable-policy'});assert.equal((await w.request('/api/contributor-self',{origin:SITE,method:'GET',omitApiKey:true})).status,200);
 assert.equal(w.calls.length,2);assert.equal(w.calls[0].url,API+'/auth/v1/user');assert.equal(w.calls[1].credentials,'same-origin');assert.equal(w.calls[1].headers.get('authorization'),'Bearer '+token());
 const none=worker();assert.equal((await none.request('/api/contributor-self',{origin:SITE,jwt:'',omitApiKey:true})).status,403);assert.equal(none.calls.length,0);
});
test('server private wrapper checks deployment, host, method and verified admin independently of worker',async()=>{
 let source=readFileSync(new URL('../public-reading-deploy/api/contributor-self.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function').replace('export default readingContributorSelfHandler();','globalThis.handlerFactory=readingContributorSelfHandler;');
 const ctx={contributorSelfHandler:()=>()=>{},SUPABASE_ANON:'publishable',deploymentAuthorized:()=>false,requestOrigin:()=>null,verifyReadingAdmin};vm.createContext(ctx);vm.runInContext(source,ctx);
 function res(){return{statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(data){this.data=data;return this;}};}
 let calls=0,checked=0;
 const base={authorized:()=>true,originOf:()=>SITE,verify:async args=>{checked++;assert.equal(args.token,token());return a;},handler:(_req,r)=>{calls++;return r.status(200).json({state:'ready'});}};
 const req={method:'GET',headers:{authorization:'Bearer '+token(),host:'preview.invalid'}};
 const good=res();await ctx.handlerFactory(base)(req,good);assert.equal(good.statusCode,200);assert.equal(calls,1);
 for(const [options,request] of [[{authorized:()=>false},req],[{originOf:()=>null},req],[{}, {...req,method:'DELETE'}],[{}, {...req,headers:{...req.headers,origin:'https://evil.invalid'}}],[{verify:async()=>null},req]]){
  const r=res();await ctx.handlerFactory({...base,...options})(request,r);assert.ok([403,405,421,503].includes(r.statusCode));assert.equal(calls,1);
 }
 assert.equal(checked,1);
});

test('prepared full-account helper retains actual SDK PKCE shapes and exact callbacks, separately from current emitted restriction',async()=>{
 const storageMap=new Map();const storage={getItem:key=>storageMap.get(key)??null,setItem:(key,value)=>storageMap.set(key,value),removeItem:key=>storageMap.delete(key)};
 const calls=[];
 const client=createClient(API,'publishable-synthetic',{auth:{...readingSessionOptions(storage,{pathname:'/login'}),autoRefreshToken:false},global:{fetch:async(input,init)=>{
  const request=new Request(input,init);
  // Exercise the exact SDK request against the same interceptor in a VM so no
  // external request is possible, including if admission behavior regresses.
  let result;
  const ctx={URL,Request,Response,JSON,fetch:async req=>{calls.push(req);return json({});}};
  vm.createContext(ctx);vm.runInContext(interceptPublicReadingAdminAuth.toString()+';globalThis.check=interceptPublicReadingAdminAuth;',ctx);
  ctx.check({request,respondWith(p){result=p;}},API,{accountAccess:true,clientOrigin:SITE});
  return await result;
 }}});
 // Avoid invoking the outer interceptor with global fetch: all transport is the VM stub.
 const result=await client.auth.signInWithOtp({email:'synthetic@example.invalid',options:{shouldCreateUser:true,data:{}}});
 assert.equal(result.error,null);assert.equal(calls.length,1);
 const body=await calls[0].clone().json();assert.equal(body.create_user,true);assert.deepEqual(body.data,{});assert.equal(body.code_challenge_method,'s256');
 for(const provider of ['google','facebook']){
  const request=providerOAuthRequest({provider,origin:SITE,functionalPreview:true});
  const response=await client.auth.signInWithOAuth({...request,options:{...request.options,skipBrowserRedirect:true}});
  assert.equal(response.error,null);const url=new URL(response.data.url);assert.equal(url.searchParams.get('redirect_to'),SITE+'/auth/callback');assert.equal(url.searchParams.get('code_challenge_method'),'s256');
 }
 await client.auth.stopAutoRefresh();
});

test('existing publishable fallback is used only for verification; original target bearer is never replaced',async()=>{
 const w=worker({anonKey:'existing-public-key'});
 const response=await w.request('/functions/v1/media-upload-intent',{omitApiKey:true});
 assert.equal(response.status,200);assert.equal(w.calls.length,3);
 for(const req of w.calls.slice(0,2)){assert.equal(req.headers.get('apikey'),'existing-public-key');assert.equal(req.headers.get('authorization'),'Bearer '+token());}
 assert.equal(w.calls[2].headers.get('apikey'),null);assert.equal(w.calls[2].headers.get('authorization'),'Bearer '+token());
});

test('public-reading reuses existing Auth without acquisition, while untrusted callback and metadata still fail closed',async()=>{
 const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/import\.meta\.env/g,'ENV').replaceAll('export ','');
 for(const reading of [true,false]){
  const origin=reading?'https://approved-preview.vercel.app':'https://sod1820.co.il';
  const calls=[],ctx={PUBLIC_READING_RELEASE:reading,ENV:{VITE_AUTH_VERIFIED_PREVIEW_ORIGINS:JSON.stringify([origin])},URL,Date,window:{location:{origin}},
   supabase:{auth:{signInWithOtp:async input=>{calls.push(['otp',input]);return {};},signInWithOAuth:async input=>{calls.push(['oauth',input]);return {};}}},
   signupAttribution:()=>{calls.push(['attribution']);return {source:'legacy'};},visitorId:()=>{calls.push(['visitor']);return 'legacy-fixture';}};
  vm.createContext(ctx);vm.runInContext(load('src/lib/oauthReturn.js')+';globalThis.oauth=providerOAuthRequest;',ctx);
  vm.runInContext(load('src/lib/auth.js')+';globalThis.otp=requestEmailOtp;globalThis.provider=signInWithConfiguredProvider;',ctx);
  if(reading){
   for(const provider of ['google','facebook']){
    await ctx.provider(provider,{returnTo:'/world#map'});const [kind,request]=calls.at(-1);
    assert.equal(kind,'oauth');assert.equal(request.provider,provider);assert.equal(request.options.redirectTo,origin+'/auth/callback');
    assert.equal(request.options.scopes,provider==='facebook'?'email public_profile':undefined);
   }
   calls.length=0;
   for(const options of [undefined,{shouldCreateUser:true},{shouldCreateUser:false}])await ctx.otp('fixture@example.invalid',options);
   assert.equal(calls.length,3);assert.deepEqual(calls.map(([,input])=>input.options.shouldCreateUser),[true,true,false]);
   for(const [kind,input]of calls){assert.equal(kind,'otp');assert.equal(JSON.stringify(input.options.data),'{}');}
   ctx.ENV.VITE_AUTH_VERIFIED_PREVIEW_ORIGINS='[]';
   for(const provider of ['google','facebook'])assert.throws(()=>ctx.provider(provider),{code:'OAUTH_PREVIEW_UNVERIFIED'});
   assert.equal(calls.length,3);
  }else{
   await ctx.otp('fixture@example.invalid');assert.equal(calls.find(c=>c[0]==='otp')[1].options.shouldCreateUser,true);
   assert.equal(calls.filter(c=>c[0]==='attribution').length,1);assert.equal(calls.filter(c=>c[0]==='visitor').length,1);
   await ctx.provider('google',{returnTo:'/world'});assert.equal(calls.at(-1)[0],'oauth');
  }
 }
});
test('emitted OAuth navigation requires exact callback, genuine PKCE shape and bounded provider scopes before browser navigation',async()=>{
 let reply,listener,calls=0;
 const ctx={Request,Response,URL,Set,Map,JSON,atob,fetch:async()=>{calls++;throw Error('OAuth must not reach test network');},self:{location:{origin:SITE},addEventListener:(type,fn)=>{if(type==='fetch')listener=fn;}}};
 vm.runInNewContext(buildPublicReadingWorker('a'.repeat(40)),ctx);
 const base={provider:'google',redirect_to:SITE+'/auth/callback',code_challenge:'a'.repeat(43),code_challenge_method:'s256'};
 async function send(values,{mode='navigate',suffix=''}={}){
  reply=undefined;const url=API+'/auth/v1/authorize?'+new URLSearchParams(values)+suffix;
  listener({request:{url,method:'GET',mode,headers:new Headers(),clone(){return this;},text:async()=>''},respondWith(p){reply=p;}});
  return reply?await reply:null;
 }
 for(const provider of ['google','facebook'])assert.equal(await send({...base,provider,...(provider==='facebook'?{scopes:'email public_profile'}:{})}),null);
 for(const values of [{...base,redirect_to:'https://evil.invalid/auth/callback'},{...base,redirect_to:SITE+'/auth/callback?next=evil'},{...base,redirect_to:SITE+'/auth/callback#token'},{...base,code_challenge:'short'},{...base,code_challenge_method:'plain'},{...base,scopes:'email public_profile'},{...base,provider:'facebook',scopes:'email public_profile pages_manage_posts'}])assert.equal((await send(values)).status,403);
 assert.equal((await send(base,{mode:'cors'})).status,403);assert.equal((await send(base,{suffix:'&provider=facebook'})).status,403);assert.equal(calls,0);
});

test('emitted worker sends a top-level navigation to the raw engine page to /code and leaves the engine iframe alone',async()=>{
 let listener,network=[];
 const ctx={Request,Response,URL,Set,Map,JSON,atob,fetch:async req=>{network.push(req.url);return new Response('<engine>',{status:200});},self:{location:{origin:SITE},addEventListener:(type,fn)=>{if(type==='fetch')listener=fn;}}};
 vm.runInNewContext(buildPublicReadingWorker('a'.repeat(40)),ctx);
 const send=async(path,{mode='navigate',destination='document'}={})=>{let reply;const request=new Request(SITE+path);Object.defineProperty(request,'mode',{value:mode});Object.defineProperty(request,'destination',{value:destination});listener({request,respondWith(p){reply=p;}});return reply?await reply:null;};
 const top=await send('/tzofen.html?embed=1');
 assert.equal(top.status,307);assert.equal(top.headers.get('location'),SITE+'/code');assert.equal(network.length,0,'the raw page is never fetched for a top-level navigation');
 // the engine inside the app is an iframe document (or a same-origin fetch): it still reaches the network
 for(const [mode,destination] of [['navigate','iframe'],['same-origin','empty']]){const r=await send('/tzofen.html?embed=1&bridge=hidden&experience=2029',{mode,destination});assert.ok(!r||r.status===200,`${mode}/${destination}`);}
 assert.ok(network.length>=1,'iframe loads still pass through to the network');
 // other pages are unaffected
 assert.notEqual((await send('/code')).status,307);
});

test('actual emitted worker admits only read-only verified WhatsApp association with server-verified matching JWT',async()=>{
 const path='/rest/v1/wa_account_links?select=verified_at&user_id=eq.'+a+'&verified_at=not.is.null&limit=1';
 for(const method of ['GET','HEAD']){const w=worker({role:'user'});assert.equal((await w.request(path,{method})).status,200);assert.equal(w.calls.length,2);assert.equal(w.calls[1].url,API+path);assert.equal(w.calls[1].headers.get('authorization'),'Bearer '+token());assert.equal(w.calls[1].cache,'no-store');}
 for(const path of [
  '/rest/v1/wa_account_links?select=phone&user_id=eq.'+a+'&verified_at=not.is.null&limit=1',
  '/rest/v1/wa_account_links?select=verified_at,phone&user_id=eq.'+a+'&verified_at=not.is.null&limit=1',
  '/rest/v1/wa_account_links?select=verified_at&user_id=eq.'+b+'&verified_at=not.is.null&limit=1',
  '/rest/v1/wa_account_links?select=verified_at&user_id=eq.'+a+'&user_id=eq.'+a+'&verified_at=not.is.null&limit=1',
  '/rest/v1/wa_account_links?select=verified_at&user_id=eq.'+a+'&verified_at=not.is.null&limit=1&or=(user_id.eq.'+b+')',
  '/rest/v1/wa_account_links?select=verified_at&user_id=eq.'+a+'&limit=1',
  '/rest/v1/wa_account_links?select=verified_at&user_id=eq.'+a+'&verified_at=not.is.null&limit=2',
 ]){const w=worker({role:'user'});assert.equal((await w.request(path,{method:'GET'})).status,403);assert.equal(w.calls.length,1);}
 for(const method of ['POST','PATCH','DELETE']){const w=worker({role:'user'});assert.equal((await w.request(path,{method})).status,403);assert.equal(w.calls.length,0);}
 for(const opts of [{uid:b},{authError:true},{throwFetch:true}]){const w=worker(opts);assert.equal((await w.request(path,{method:'GET'})).status,403);assert.ok(w.calls.length<=1);}
 const w=worker();assert.equal((await w.request(path,{method:'GET',jwt:''})).status,403);assert.equal(w.calls.length,0);
 for(const rpc of ['request_wa_link_code','verify_wa_link_code','unlink_my_wa']){const w=worker({role:'user'});assert.equal((await w.request('/rest/v1/rpc/'+rpc,{body:{p_phone:'synthetic'}})).status,403);assert.equal(w.calls.some(req=>new URL(req.url).pathname.endsWith('/'+rpc)),false);}
});


const communityBody = Object.freeze({p_intent:'תגובה',p_origin:'community_2029',p_body:'A public message',p_target_type:'home',p_target_id:'community',p_parent_id:null,p_title:null,p_gematria_claim:null,p_author_name:null,p_image_url:null});
test('restored native Community publishes for a verified ordinary member through the existing RPC',async()=>{
 const w=worker({role:'user'});
 const r=await w.request('/rest/v1/rpc/add_contribution',{body:communityBody});
 assert.equal(r.status,200);assert.equal(w.calls.length,2);
 assert.equal(w.calls[0].url,API+'/auth/v1/user');
 assert.equal(w.calls[1].url,API+'/rest/v1/rpc/add_contribution');
 assert.equal(await w.calls[1].clone().text(),JSON.stringify(communityBody));
 assert.equal(w.calls[1].headers.get('authorization'),'Bearer '+token());
});
test('restored Community rejects guests, expired sessions, forged actors and malformed publication',async()=>{
 for(const options of [{jwt:token(a,'anon')},{jwt:'malformed'}]){
  const w=worker({role:'user'});assert.equal((await w.request('/rest/v1/rpc/add_contribution',{body:communityBody,...options})).status,403);
  assert.equal(w.calls.length,0);
 }
 for(const config of [{authError:true},{uid:b}]){
  const w=worker({...config,role:'user'});assert.equal((await w.request('/rest/v1/rpc/add_contribution',{body:communityBody})).status,403);
  assert.ok(!w.calls.some(r=>r.url.endsWith('/add_contribution')));
 }
 for(const body of [{...communityBody,p_body:''},{...communityBody,p_origin:'broadcast'},{...communityBody,p_target_id:'private'},{...communityBody,p_body:'x'.repeat(6001)},{...communityBody,author_user_id:b}]){
  const w=worker({role:'user'});assert.equal((await w.request('/rest/v1/rpc/add_contribution',{body})).status,403);
  assert.ok(!w.calls.some(r=>r.url.endsWith('/add_contribution')));
 }
});
test('reply and reaction targets require the canonical anonymous public context',async()=>{
 for(const visible of [true,false])for(const kind of ['reply','reaction']){
  const w=worker({role:'user',anonKey:'public-synthetic',fetchAction:req=>req.url.includes('/community_message_context?')?json(visible?[{id:b}]:[]):json({ok:true})});
  const path=kind==='reply'?'/rest/v1/rpc/add_contribution':'/rest/v1/rpc/toggle_contribution_reaction';
  const body=kind==='reply'?{...communityBody,p_parent_id:b}:{p_id:b,p_emoji:'👍',p_visitor:null};
  assert.equal((await w.request(path,{body})).status,visible?200:403);
  const context=w.calls.find(r=>r.url.includes('/community_message_context?'));
  assert.equal(context.headers.get('authorization'),'Bearer public-synthetic');
  assert.equal(w.calls.filter(r=>r.url===API+path).length,visible?1:0);
 }
});
test('original OpenWeb API and authenticated existing SSO are available without opening foreign writes or model access',async()=>{
 const w=worker({role:'user'});
 assert.equal(await w.request('/v1.0.0/conversation/read',{origin:'https://api-2-0.spot.im'}),null);
 assert.equal(await w.request('/api/v2/events',{origin:'https://event-stream.spot.im'}),null);
 assert.equal((await w.request('/v1.0.0/conversation/read',{origin:'https://api-2-0.spot.im.foreign.invalid'})).status,403);
 assert.equal((await w.request('/v1.0.0/conversation/read',{origin:'https://foreign.invalid'})).status,403);
 assert.equal((await w.request('/functions/v1/openweb-sso',{body:{code_a:'synthetic-code'}})).status,200);
 assert.equal((await w.request('/functions/v1/openweb-sso',{body:{code_a:'synthetic-code',user_id:b}})).status,403);
 assert.equal((await w.request('/functions/v1/ai-analyze',{body:{persona:'raziel'}})).status,403);
});


test('published CSP admits the original OpenWeb service while retaining object/frame/base restrictions',()=>{
 const config=JSON.parse(readFileSync(new URL('../public-reading-deploy/vercel.json',import.meta.url),'utf8'));
 const csp=config.headers.flatMap(r=>r.headers).find(h=>h.key==='Content-Security-Policy').value;
 assert.match(csp,/connect-src[^;]+https:\/\/\*\.spot\.im/);
 assert.match(csp,/form-action[^;]+https:\/\/\*\.spot\.im/);
 assert.match(csp,/object-src 'none'/);assert.match(csp,/frame-ancestors 'self'/);assert.match(csp,/base-uri 'self'/);
});


test('unregistered repeatable likes use public context and the anonymous counter path on every press',async()=>{
 let count=0;
 const w=worker({role:'user',authError:true,anonKey:'public-synthetic',fetchAction:req=>req.url.includes('/community_message_context?')?json([{id:b}]):json({likes:7,community_likes:++count})});
 for(let i=1;i<=3;i++){
  const r=await w.request('/rest/v1/rpc/toggle_contribution_reaction',{jwt:token(a,'anon'),body:{p_id:b,p_emoji:'👍',p_visitor:'community-repeatable-like'}});
  assert.equal(r.status,200);assert.equal((await r.json()).community_likes,i);
 }
 assert.equal(w.calls.filter(r=>r.url.endsWith('/auth/v1/user')).length,0);
 const mutations=w.calls.filter(r=>r.url.endsWith('/toggle_contribution_reaction'));
 assert.equal(mutations.length,3);assert.ok(mutations.every(r=>r.headers.get('authorization')==='Bearer public-synthetic'));
});
test('guest repeatable mode cannot broaden emoji, body shape or nonpublic targets',async()=>{
 const w=worker({authError:true,anonKey:'public-synthetic',fetchAction:req=>json([])});
 assert.equal((await w.request('/rest/v1/rpc/toggle_contribution_reaction',{jwt:token(a,'anon'),body:{p_id:b,p_emoji:'👍',p_visitor:'community-repeatable-like'}})).status,403);
 for(const body of [{p_id:b,p_emoji:'🔥',p_visitor:'community-repeatable-like'},{p_id:b,p_emoji:'👍',p_visitor:'other'},{p_id:b,p_emoji:'👍',p_visitor:'community-repeatable-like',user_id:a}])
  assert.equal((await w.request('/rest/v1/rpc/toggle_contribution_reaction',{jwt:token(a,'anon'),body})).status,403);
 assert.equal(w.calls.filter(r=>r.url.endsWith('/toggle_contribution_reaction')).length,0);
});

test('explicit verified-account Community thread follow preserves the existing private and channel ceiling',async()=>{
 const body={p_topic:'thread:'+b,p_source:'community_thread',p_on:true,p_visitor:null};
 for(const on of [true,false]){
  const w=worker({role:'user'});
  assert.equal((await w.request('/rest/v1/rpc/watch_toggle',{body:{...body,p_on:on}})).status,200);
  assert.equal(w.calls.filter(r=>r.url===API+'/rest/v1/rpc/watch_toggle').length,1);
 }
 for(const bad of [{...body,p_topic:'news'},{...body,p_source:'center'},{...body,p_visitor:'visitor'},{...body,p_on:'true'},{...body,user_id:b},{...body,p_topic:'thread:invalid'}]){
  const w=worker({role:'user'});assert.equal((await w.request('/rest/v1/rpc/watch_toggle',{body:bad})).status,403);
  assert.ok(!w.calls.some(r=>r.url===API+'/rest/v1/rpc/watch_toggle'));
 }
 for(const denied of [{jwt:token(a,'anon')},{jwt:token(b)},{authError:true}]){
  const w=worker({role:'user',authError:denied.authError});
  assert.equal((await w.request('/rest/v1/rpc/watch_toggle',{body,jwt:denied.jwt})).status,403);
  assert.ok(!w.calls.some(r=>r.url===API+'/rest/v1/rpc/watch_toggle'));
 }
 const old=worker({role:'user'});
 assert.equal((await old.request('/rest/v1/rpc/watch_toggle',{body:{p_topic:'news',p_source:'center',p_on:false,p_visitor:null}})).status,200);
 assert.equal((await old.request('/functions/v1/send-push',{body:{topic:body.p_topic}})).status,403);
});

test('reading continuation accepts only bounded public cursors and strips account credentials',async()=>{
 const path='/rest/v1/rpc/community_thread_updates?select=root_id,new_count,first_reply_id,first_path';
 const cursor={root_id:a,message_id:b,created_at:'2026-11-04T12:00:00.123456Z'};
 const w=worker({anonKey:'public-cursor-key'});assert.equal((await w.request(path,{body:{p_cursors:[cursor]}})).status,200);
 assert.equal(w.calls.length,1);assert.equal(w.calls[0].headers.get('Authorization'),'Bearer public-cursor-key');
 for(const [url,body] of [[path,{p_cursors:Array(41).fill(cursor)}],[path,{p_cursors:[cursor,cursor]}],[path,{p_cursors:[{...cursor,user_id:a}]}],[path,{p_cursors:[{...cursor,root_id:'bad'}]}],[path,{p_cursors:[cursor],p_user_id:a}],[path+'&user_id='+a,{p_cursors:[cursor]}],[path.replace('first_path','body'),{p_cursors:[cursor]}]]) {
  const bad=worker();assert.equal((await bad.request(url,{body})).status,403);assert.equal(bad.calls.length,0);
 }
});
test('replies to me requires canonical account verification and its exact private pagination contract',async()=>{
 const path='/rest/v1/rpc/replies_to_me';
 const w=worker({role:'member'});assert.equal((await w.request(path,{body:{p_limit:50,p_before:null}})).status,200);
 assert.equal(w.calls.length,2);assert.equal(w.calls[1].headers.get('Authorization'),'Bearer '+token());
 for(const body of [{p_limit:101,p_before:null},{p_limit:50,p_before:'bad'},{p_limit:50,p_before:null,user_id:b}]) {
  const bad=worker();assert.equal((await bad.request(path,{body})).status,403);assert.equal(bad.calls.some(c=>c.url===API+path),false);
 }
 const guest=worker();assert.equal((await guest.request(path,{jwt:'',body:{p_limit:50,p_before:null}})).status,403);assert.equal(guest.calls.length,0);
});

test('reply unread count is an exact own-inbox read; arbitrary filters and foreign accounts stay blocked',async()=>{
 const path='/rest/v1/user_notifications?select=id&user_id=eq.'+a+'&read_at=is.null&kind=eq.reply';
 const w=worker({role:'member'});assert.equal((await w.request(path,{method:'HEAD'})).status,200);assert.equal(w.calls.length,2);assert.equal(w.calls[1].url,API+path);
 for(const url of [path.replace('eq.reply','eq.other'),path+'&kind=eq.reply',path.replace('eq.'+a,'eq.'+b),path.replace('user_notifications','user_notes')]){
  const bad=worker({role:'member'});assert.equal((await bad.request(url,{method:'HEAD'})).status,403);assert.equal(bad.calls.some(c=>c.url===API+url),false);
 }
});

test('guest community publishing: only the exact anonymous request is forwarded, with the public key',async()=>{
 const KEY='anon-public-key-synthetic';
 const path='/rest/v1/rpc/add_guest_community_message';
 const ok={p_body:'שלום',p_parent_id:null,p_website:''};
 const w=worker({anonKey:KEY});
 const accepted=await w.request(path,{body:ok,jwt:KEY});
 assert.equal(accepted.status,200);
 assert.equal(w.calls.length,1);
 assert.equal(w.calls[0].url,API+path);
 assert.equal(w.calls[0].headers.get('Authorization'),'Bearer '+KEY);
 assert.equal(w.calls[0].headers.get('apikey'),KEY);
 assert.equal((await w.request(path,{body:{...ok,p_parent_id:a},jwt:KEY})).status,200);
 assert.equal((await w.request(path,{body:{...ok,p_name:'דוד כהן'},jwt:KEY})).status,200,'optional guest name is forwarded');
 const denyCases=[
  ['session token',{body:ok,jwt:token()}],
  ['extra field',{body:{...ok,p_intent:'שאלה'},jwt:KEY}],
  ['empty guest name',{body:{...ok,p_name:'  '},jwt:KEY}],
  ['non-string guest name',{body:{...ok,p_name:5},jwt:KEY}],
  ['oversized guest name',{body:{...ok,p_name:'א'.repeat(101)},jwt:KEY}],
  ['name next to an extra field',{body:{...ok,p_name:'דוד',p_intent:'שאלה'},jwt:KEY}],
  ['missing field',{body:{p_body:'x',p_parent_id:null},jwt:KEY}],
  ['empty body',{body:{...ok,p_body:'   '},jwt:KEY}],
  ['oversized body',{body:{...ok,p_body:'א'.repeat(3001)},jwt:KEY}],
  ['bad parent',{body:{...ok,p_parent_id:'not-a-uuid'},jwt:KEY}],
  ['non-string body',{body:{...ok,p_body:5},jwt:KEY}],
  ['query string',{body:ok,jwt:KEY,path:path+'?x=1'}],
 ];
 for(const [label,{path:override,...options}] of denyCases.map(([l,o])=>[l,o])){
  const v=worker({anonKey:KEY});
  const response=await v.request(override||path,options);
  assert.ok(response.status===403,label+' '+response.status);
  assert.equal(v.calls.length,0,label+' must not reach the server');
 }
 const noKey=worker();
 assert.equal((await noKey.request(path,{body:ok,jwt:KEY})).status,403);
});

test('community tree hints and online-now reads are forwarded without requiring a verified admin, matching the database\'s own public grant (ZURIEL, 8.11.2026: these were silently falling to the admin-only fallback)',async()=>{
 for(const path of ['/rest/v1/rpc/community_tree_hints_list','/rest/v1/rpc/community_tree_hints_by_number','/rest/v1/rpc/community_presence_online']){
  const w=worker({anonKey:'anon-read-key'});
  const response=await w.request(path,{jwt:'',body:{p_limit:20}});
  assert.equal(response.status,200,path);
  assert.equal(w.calls.length,1,path+' must reach the database directly, with no admin-verification round trip');
  assert.equal(w.calls[0].url,API+path);
 }
});
test('community_tree_hint_set stays administrator-only: the new public reads above do not widen it',async()=>{
 const path='/rest/v1/rpc/community_tree_hint_set';
 const admin=worker({role:'admin'});
 assert.equal((await admin.request(path,{body:{p_id:a,p_action:'enter',p_numbers:null}})).status,200);
 const member=worker({role:'user'});
 assert.equal((await member.request(path,{body:{p_id:a,p_action:'enter',p_numbers:null}})).status,403);
 const guest=worker();
 assert.equal((await guest.request(path,{jwt:'',body:{p_id:a,p_action:'enter',p_numbers:null}})).status,403);
});
test('presence heartbeat requires a real verified signed-in account; exact empty body only',async()=>{
 const pingPath='/rest/v1/rpc/community_presence_ping';
 const member=worker({role:'user'});
 assert.equal((await member.request(pingPath,{body:{}})).status,200);
 assert.equal(member.calls.filter(c=>c.url===API+pingPath).length,1);
 const guest=worker();
 assert.equal((await guest.request(pingPath,{jwt:'',body:{}})).status,403);
 for(const body of [{p_extra:1},{p_limit:1}]){
  const bad=worker({role:'user'});
  assert.equal((await bad.request(pingPath,{body})).status,403,JSON.stringify(body));
 }
});
test('community_guest_unreviewed admits only a bounded uuid list or null, from a verified signed-in account',async()=>{
 const path='/rest/v1/rpc/community_guest_unreviewed';
 const nullIds=worker({role:'user'});
 assert.equal((await nullIds.request(path,{body:{p_ids:null}})).status,200);
 const withIds=worker({role:'user'});
 assert.equal((await withIds.request(path,{body:{p_ids:[a,b]}})).status,200);
 for(const body of [{p_ids:['not-a-uuid']},{p_ids:a},{p_ids:null,extra:1}]){
  const bad=worker({role:'user'});
  assert.equal((await bad.request(path,{body})).status,403,JSON.stringify(body));
 }
 const guest=worker();
 assert.equal((await guest.request(path,{jwt:'',body:{p_ids:null}})).status,403);
});
test('community_guest_review admits only the exact approve/hide body, from a verified signed-in account',async()=>{
 const path='/rest/v1/rpc/community_guest_review';
 for(const action of ['approve','hide']){
  const w=worker({role:'user'});
  assert.equal((await w.request(path,{body:{p_id:a,p_action:action}})).status,200,action);
 }
 for(const body of [{p_id:a,p_action:'delete'},{p_id:'not-a-uuid',p_action:'hide'},{p_id:a,p_action:'hide',extra:1}]){
  const bad=worker({role:'user'});
  assert.equal((await bad.request(path,{body})).status,403,JSON.stringify(body));
 }
 const guest=worker();
 assert.equal((await guest.request(path,{jwt:'',body:{p_id:a,p_action:'hide'}})).status,403);
});

test('community link preview: only the exact public GET is forwarded, without session or key',async()=>{
 const base='/functions/v1/link-preview?url=';
 const good=base+encodeURIComponent('https://example.org/article?id=1');
 const w=worker();
 const accepted=await w.request(good,{method:'GET'});
 assert.equal(accepted.status,200);
 assert.equal(w.calls.length,1);
 assert.equal(w.calls[0].method,'GET');
 assert.equal(w.calls[0].headers.get('Authorization'),null);
 assert.equal(w.calls[0].headers.get('apikey'),null);
 assert.equal(new URL(w.calls[0].url).searchParams.get('url'),'https://example.org/article?id=1');
 const denyCases=[
  ['http address',base+encodeURIComponent('http://example.org/')],
  ['no address',base],
  ['extra parameter',good+'&x=1'],
  ['too long',base+encodeURIComponent('https://example.org/'+'a'.repeat(2100))],
  ['other function',good.replace('link-preview','ai-analyze')],
 ];
 for(const [label,path] of denyCases){
  const v=worker({role:'user'});
  const response=await v.request(path,{method:'GET'});
  assert.equal(response.status,403,label);
  assert.ok(!v.calls.some(call=>call.url.includes('/functions/v1/')),label+' must not reach any function');
 }
 const post=worker({role:'user'});
 assert.equal((await post.request(good,{method:'POST',body:{}})).status,403);
 assert.ok(!post.calls.some(call=>call.url.includes('/functions/v1/')));
});

test('Bible code bridge: visitors reach the rate-limited verifier with the public key only; bad shapes never leave the worker',async()=>{
 const path='/functions/v1/els-search-bridge';
 const body={op:'verify_batch',term:'משיח',scope:'torah',corpus_id:'a'.repeat(16),candidates:[{skip:2,dir:1,start:5}],interaction_id:'x'};
 const guest=worker({anonKey:'anon-key'});
 const ok=await guest.request(path,{body,jwt:'anon-key'});
 assert.equal(ok.status,200);
 const call=guest.calls.find(c=>c.url.includes(path));
 assert.ok(call);assert.equal(call.method,'POST');assert.equal(call.headers.get('Authorization'),'Bearer anon-key');assert.equal(call.headers.get('apikey'),'anon-key');
 assert.equal((await call.clone().json()).op,'verify_batch');
 // a member's own verified session is kept (per-user rate), a forged token is replaced by the public key
 const member=worker({role:'user',anonKey:'anon-key'});
 assert.equal((await member.request(path,{body:{op:'page',term:'משיח',scope:'tanakh',skip_min:2,skip_max:50}})).status,200);
 assert.match(member.calls.find(c=>c.url.includes(path)).headers.get('Authorization'),/^Bearer eyJ/);
 const forged=worker({anonKey:'anon-key',authError:true});
 assert.equal((await forged.request(path,{body})).status,200);
 assert.equal(forged.calls.find(c=>c.url.includes(path)).headers.get('Authorization'),'Bearer anon-key');
 for(const [label,bad,extra] of [
  ['unknown op',{...body,op:'admin'}],['no term',{op:'page'}],['short term',{op:'page',term:'א'}],['long term',{op:'page',term:'א'.repeat(201)}],
  ['bad scope',{...body,scope:'everything'}],['array body',[1,2]],['too large',{...body,pad:'x'.repeat(262200)}],
  ['query string',body,'?x=1']]) {
  const w=worker({anonKey:'anon-key'});
  const response=await w.request(path+(extra||''),{body:bad,jwt:'anon-key'});
  assert.equal(response.status,403,label);
  assert.ok(!w.calls.some(c=>c.url.includes(path)),label+' must not reach the function');
 }
 const get=worker({anonKey:'anon-key'});
 assert.equal((await get.request(path,{method:'GET',jwt:'anon-key'})).status,403);
});

test('Bible code save: a verified member saves to their own library with the exact panel shape; everything else stays out',async()=>{
 const save={p_term:'משיח',p_scope:'torah',p_skip:2,p_direction:'fwd',p_positions:{findings:[]},p_image_url:null,p_title:'משיח',p_note:'הסבר קצר של הממצא',p_public:false,p_from_topic:null,p_start_index:100,p_engine_detail:{v:1}};
 const update={p_id:'33333333-3333-4333-8333-333333333333',p_positions:{findings:[]},p_image_url:null,p_description:'הסבר',p_engine_detail:{v:1}};
 const member=worker({role:'user',anonKey:'anon-key'});
 assert.equal((await member.request('/rest/v1/rpc/save_els_matrix',{body:save})).status,200);
 assert.equal((await member.request('/rest/v1/rpc/update_els_matrix',{body:update})).status,200);
 assert.equal(member.calls.filter(c=>/rpc\/(save|update)_els_matrix$/.test(c.url)).length,2);
 const cdn=API+'/storage/v1/object/public/gallery/sod1820/ciphers/c-abc-def.png';
 assert.equal((await worker({role:'user'}).request('/rest/v1/rpc/save_els_matrix',{body:{...save,p_image_url:cdn}})).status,200);
 const bad=[
  ['extra key',{...save,p_owner:'x'}],['missing key',(({p_note,...rest})=>rest)(save)],['short term',{...save,p_term:'א'}],['bad scope',{...save,p_scope:'all'}],
  ['public flag not boolean',{...save,p_public:'yes'}],['foreign image',{...save,p_image_url:'https://evil.invalid/a.png'}],['huge',{...save,p_note:'x'.repeat(5000)}],
 ];
 for(const [label,body] of bad){const w=worker({role:'user'});assert.equal((await w.request('/rest/v1/rpc/save_els_matrix',{body})).status,403,label);assert.ok(!w.calls.some(c=>c.url.includes('save_els_matrix')),label);}
 for(const [label,body] of [['bad id',{...update,p_id:'nope'}],['extra',{...update,p_status:'published'}]]){const w=worker({role:'user'});assert.equal((await w.request('/rest/v1/rpc/update_els_matrix',{body})).status,403,label);assert.ok(!w.calls.some(c=>c.url.includes('update_els_matrix')),label);}
 // not a verified member: forged identity or failed verification never reaches the server
 const forged=worker({authError:true});assert.equal((await forged.request('/rest/v1/rpc/save_els_matrix',{body:save})).status,403);
 assert.ok(!forged.calls.some(c=>c.url.includes('save_els_matrix')));
 // a verified member manages only their own cipher through the two owner-scoped functions, with the exact body
 const owned={p_id:update.p_id,p_title:'שם חדש'};
 const manager=worker({role:'user',anonKey:'anon-key'});
 assert.equal((await manager.request('/rest/v1/rpc/rename_my_els_matrix',{body:owned})).status,200);
 assert.equal((await manager.request('/rest/v1/rpc/delete_my_els_matrix',{body:{p_id:update.p_id}})).status,200);
 for(const [name,body] of [['rename_my_els_matrix',{...owned,p_owner:'x'}],['rename_my_els_matrix',{p_id:'nope',p_title:'x'}],['rename_my_els_matrix',{p_id:update.p_id,p_title:5}],
   ['delete_my_els_matrix',{p_id:update.p_id,p_status:'published'}],['delete_my_els_matrix',{p_id:'nope'}]]){
  const w=worker({role:'user'});assert.equal((await w.request('/rest/v1/rpc/'+name,{body})).status,403,name);assert.ok(!w.calls.some(c=>c.url.includes(name)),name);
 }
 for(const name of ['rename_my_els_matrix','delete_my_els_matrix']){
  const w=worker({authError:true});assert.equal((await w.request('/rest/v1/rpc/'+name,{body:name.startsWith('rename')?owned:{p_id:update.p_id}})).status,403,name);
  assert.ok(!w.calls.some(c=>c.url.includes(name)),name);
 }
 // moderation and publication stay administrator-only
 for(const name of ['moderate_els_matrix','admin_els_to_dossier','merge_els_variant','delete_els_matrix','self_publish_matrix']){
  const w=worker({role:'user'});assert.equal((await w.request('/rest/v1/rpc/'+name,{body:{p_id:update.p_id,p_status:'published'}})).status,403,name);
 }
});

test('emitted worker lets public storage video/audio range requests reach the network natively, but still guards the rest',async()=>{
 let listener;
 const ctx={Request,Response,URL,Set,Map,JSON,atob,fetch:async()=>new Response('x'),self:{location:{origin:SITE},addEventListener:(type,fn)=>{if(type==='fetch')listener=fn;}}};
 vm.runInNewContext(buildPublicReadingWorker('a'.repeat(40)),ctx);
 const ORIGIN='https://linswmnnkjxvweumprav.supabase.co';
 const probe=(path,{destination='video',mode='no-cors',method='GET'}={})=>{let handled=false;const request=new Request(ORIGIN+path,{method,headers:{Range:'bytes=0-'}});Object.defineProperty(request,'mode',{value:mode});Object.defineProperty(request,'destination',{value:destination});listener({request,clientId:'',respondWith(){handled=true;}});return handled;};
 assert.equal(probe('/storage/v1/object/public/media/a/b/original.mp4'),false,'public video goes native');
 assert.equal(probe('/storage/v1/object/public/media/a/b/x.mp3',{destination:'audio'}),false,'public audio goes native');
 assert.equal(probe('/storage/v1/object/public/media/a/b/original.mp4?token=1'),true,'query strings stay under the worker');
 assert.equal(probe('/storage/v1/object/sign/media/a/b/original.mp4'),true,'signed objects stay under the worker');
 assert.equal(probe('/storage/v1/object/public/private-bucket/a.mp4'),true,'other buckets stay under the worker');
});
