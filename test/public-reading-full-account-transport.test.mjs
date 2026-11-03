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
 assert.equal(PUBLIC_READING_POLICY_ID,'public-reading-owned-account-continuity-20261103');
 const storage={getItem(){},setItem(){},removeItem(){}};
 for(const pathname of ['/','/world','/auth/callback/','/post/auth/callback'])assert.equal(readingSessionOptions(storage,{pathname}).detectSessionInUrl,false);
 const configured=readingSessionOptions(storage,{pathname:'/auth/callback'});
 assert.equal(configured.detectSessionInUrl,true);assert.equal(configured.flowType,'pkce');assert.equal(configured.storage,storage);
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
test('emitted existing-account transport admits OTP without account creation and verification',async()=>{
 const w=worker();
 for(const [path,body] of [
  ['/auth/v1/otp',{email:'owner@example.invalid',data:{},create_user:false,gotrue_meta_security:{},code_challenge:'a'.repeat(43),code_challenge_method:'s256'}],
  ['/auth/v1/verify',{email:'owner@example.invalid',token:'12345678',type:'email',gotrue_meta_security:{}}],
 ]){const response=await w.request(path,{body});assert.equal(response.status,200,path);}
 assert.equal(w.calls.length,2);
});
test('new Auth transport denies role/data injection, phone, arbitrary callback, recovery and non-PKCE grants',async()=>{
 for(const [path,body] of [
  ['/auth/v1/otp',{email:'owner@example.invalid',data:{role:'admin'},create_user:true,code_challenge:'a'.repeat(43),code_challenge_method:'s256'}],
  ['/auth/v1/otp',{email:'owner@example.invalid',data:{},create_user:true,gotrue_meta_security:{},code_challenge:'a'.repeat(43),code_challenge_method:'s256'}],
  ['/auth/v1/token?grant_type=pkce',{auth_code:'auth-code-synthetic',code_verifier:'a'.repeat(56)}],
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
 for(const path of ['/functions/v1/ai-analyze','/functions/v1/els-search-bridge','/functions/v1/research-run','/rest/v1/rpc/fn_get_or_create_my_person']) {
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

test('public-reading client refuses OAuth before SDK and forces existing-account OTP even when caller asks to create',async()=>{
 const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/import\.meta\.env/g,'ENV').replaceAll('export ','');
 for(const reading of [true,false]){
  const calls=[],ctx={PUBLIC_READING_RELEASE:reading,ENV:{},URL,Date,window:{location:{origin:'https://sod1820.co.il'}},
   supabase:{auth:{signInWithOtp:async input=>{calls.push(['otp',input]);return {};},signInWithOAuth:async input=>{calls.push(['oauth',input]);return {};}}},
   signupAttribution:()=>{calls.push(['attribution']);return {source:'legacy'};},visitorId:()=>{calls.push(['visitor']);return 'legacy-fixture';}};
  vm.createContext(ctx);vm.runInContext(load('src/lib/oauthReturn.js')+';globalThis.oauth=providerOAuthRequest;',ctx);
  vm.runInContext(load('src/lib/auth.js')+';globalThis.otp=requestEmailOtp;globalThis.provider=signInWithConfiguredProvider;',ctx);
  if(reading){
   for(const provider of ['google','facebook'])assert.throws(()=>ctx.provider(provider,{returnTo:'/world#map'}),{code:'AUTH_SIGNUP_CONSENT_PENDING'});
   assert.deepEqual(calls,[]);
   for(const options of [undefined,{shouldCreateUser:true},{shouldCreateUser:false}])await ctx.otp('fixture@example.invalid',options);
   assert.equal(calls.length,3);for(const [kind,input]of calls){assert.equal(kind,'otp');assert.equal(input.options.shouldCreateUser,false);assert.equal(JSON.stringify(input.options.data),'{}');}
  }else{
   await ctx.otp('fixture@example.invalid');assert.equal(calls.find(c=>c[0]==='otp')[1].options.shouldCreateUser,true);
   assert.equal(calls.filter(c=>c[0]==='attribution').length,1);assert.equal(calls.filter(c=>c[0]==='visitor').length,1);
   await ctx.provider('google',{returnTo:'/world'});assert.equal(calls.at(-1)[0],'oauth');
  }
 }
});
test('emitted existing-account worker denies OAuth navigation even with a valid exact callback',async()=>{
 const url=API+'/auth/v1/authorize?'+new URLSearchParams({provider:'google',redirect_to:SITE+'/auth/callback',code_challenge:'a'.repeat(43),code_challenge_method:'s256'});
 let reply,listener,calls=0;
 const ctx={Request,Response,URL,Set,Map,JSON,atob,fetch:async()=>{calls++;throw Error('OAuth must not reach network');},self:{location:{origin:SITE},addEventListener:(type,fn)=>{if(type==='fetch')listener=fn;}}};
 vm.runInNewContext(buildPublicReadingWorker('a'.repeat(40)),ctx);
 listener({request:{url,method:'GET',mode:'navigate',headers:new Headers(),clone(){return this;},text:async()=>''},respondWith(p){reply=p;}});
 assert.equal((await reply).status,403);assert.equal(calls,0);
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
