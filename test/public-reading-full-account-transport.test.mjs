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
