import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
const ORIGIN='https://linswmnnkjxvweumprav.supabase.co';
const STORAGE='https://linswmnnkjxvweumprav.storage.supabase.co/storage/v1/upload/resumable';
const UID='11111111-1111-4111-8111-111111111111', HINT='33333333-3333-4333-8333-333333333333';
const {outputFiles}=await build({entryPoints:['src/lib/research/lifeJourneyHintMedia.js'],bundle:true,write:false,platform:'node',format:'cjs',
  define:{__SOD_2029_BUILD__:'true','import.meta.env.VITE_PUBLIC_READING_RELEASE':'"public-reading-20261101"'},
  plugins:[{name:'public-config-only',setup(b){b.onResolve({filter:/\/supabase\.js$/},()=>({path:'client',namespace:'offline'}));b.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:`export const SUPABASE_URL=${JSON.stringify(ORIGIN)}, SUPABASE_ANON='publishable-test', supabase=null;`}));}}]});
const mod={exports:{}};vm.runInNewContext(outputFiles[0].text,{module:mod,exports:mod.exports,URL,DOMException,TextEncoder,Uint8Array,btoa,Date,setTimeout,clearTimeout});
const attach=mod.exports.attachLifeJourneyHintImage;
function fixture({foreignIntent=false,foreignLocation=false,switchAfterFirst=false}={}){
 let uid=UID;const calls=[];
 const file=new Blob([new Uint8Array([1,2,3,4])],{type:'image/png'});Object.defineProperty(file,'name',{value:'fixture.png'});
 const client={auth:{getSession:async()=>({data:{session:{user:{id:uid},access_token:`token-${uid}`}}})}};
 const fetchImpl=async(url,init)=>{
  calls.push({url,method:init.method,headers:init.headers});
  assert.equal(init.headers.Authorization,`Bearer token-${UID}`);assert.equal(init.headers.apikey,'publishable-test');
  if(url===ORIGIN+'/functions/v1/media-upload-intent'){
   const body=JSON.parse(init.body);
   if(body.action==='issue')return Response.json({ok:true,hint_id:HINT,upload_receipt:'opaque',size:4,mime:'image/png',bucket:'submission-inbox',path:'private.png',signed_upload:{token:'signed-fixture'},tus:{endpoint:foreignIntent?'https://evil.invalid/upload':STORAGE,chunk_size:2}});
   if(body.action==='verify_hint_media')return Response.json({ok:true,verified:true,binding_receipt:'opaque-verified'});
   if(body.action==='bind_hint_media')return Response.json({ok:true,storage_object_id:'44444444-4444-4444-8444-444444444444'});
   assert.fail('unexpected operation');
  }
  if(init.method==='POST')return new Response(null,{status:201,headers:{location:foreignLocation?'https://evil.invalid/upload':STORAGE+'/fixture','upload-offset':'0'}});
  if(init.method==='PATCH'){
   if(switchAfterFirst)uid='22222222-2222-4222-8222-222222222222';
   return new Response(null,{status:204,headers:{'upload-offset':String(Number(init.headers['Upload-Offset'])+2)}});
  }
  assert.fail('unexpected request');
 };
 return {calls,run:()=>attach({hintId:HINT,file,expectedUserId:UID,client,fetchImpl})};
}
test('private upload retains signed intent and fresh caller identity on every chunk, verify and bind',async()=>{
 const f=fixture();await f.run();assert.deepEqual(f.calls.map(c=>c.method),['POST','POST','PATCH','PATCH','POST','POST']);
 for(const call of f.calls.filter(c=>c.url.startsWith(STORAGE)))assert.equal(call.headers['x-signature'],'signed-fixture');
});
test('account change between chunks fails closed before another upload or bind',async()=>{
 const f=fixture({switchAfterFirst:true});await assert.rejects(f.run(),/principal_changed/);
 assert.deepEqual(f.calls.map(c=>c.method),['POST','POST','PATCH']);
});
test('untrusted intent or upload Location never receives a caller JWT',async()=>{
 for(const options of [{foreignIntent:true},{foreignLocation:true}]){
  const f=fixture(options);await assert.rejects(f.run(),/untrusted_upload_target/);
  assert.ok(f.calls.every(c=>new URL(c.url).hostname.endsWith('.supabase.co')));
  assert.equal(f.calls.length,options.foreignIntent?1:2);
 }
});
