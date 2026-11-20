import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { build } from 'esbuild';
import { readingActionProps, readingActionBody, readingMeasurementPath, readingTelemetryPath } from '../src/lib/publicReadingTelemetry2029.js';
const bundled=await build({entryPoints:['src/lib/siteActivity2029.js'],bundle:true,write:false,format:'iife',globalName:'activity',plugins:[{name:'dependencies',setup(b){
 b.onLoad({filter:/measurement2029.js$/},()=>({contents:`export const captureMeasurement=(path)=>({auth:{token:globalThis.token},path:path||'/world'}); export const measurementBody=(c,s,e,p)=>({surface:s,event:e,props:p}); export const sendMeasurement=(c,b)=>{globalThis.sent.push({context:c,body:b});return true;};`}));
 b.onLoad({filter:/botVerdict.js$/},()=>({contents:'export const isBot=()=>globalThis.bot;'}));
 b.onLoad({filter:/privacy.js$/},()=>({contents:'export const isAnon=()=>globalThis.anon;'}));
}}]});
function client(){const c={crypto:webcrypto,sent:[],token:'account-A',anon:false,bot:false};vm.createContext(c);vm.runInContext(bundled.outputFiles[0].text,c);return c;}
test('the active Hebrew Heichal alias has the same measurement identity, without exposing other Hebrew inputs',()=>{
 for(const path of ['/היכל','/'+encodeURIComponent('היכל')]) {
  assert.equal(readingTelemetryPath(path),'/heichal'); assert.equal(readingMeasurementPath(path),'/heichal');
 }
 assert.equal(readingTelemetryPath('/number/'+encodeURIComponent('שם פרטי')),'/number/:value');
});
test('one settled operation sends once, with the occurrence account and no expression',()=>{
 const c=client();const done=c.activity.startSiteActivity('compute',{expression:'private',method:'regular'});
 c.token='account-B';done();done();assert.equal(c.sent.length,1);assert.equal(c.sent[0].context.auth.token,'account-A');
 assert.ok(!JSON.stringify(c.sent).includes('private'));assert.match(c.sent[0].body.props.operation_id,/^[0-9a-f-]{36}$/);
});
test('separate real operations get different IDs; bot and privacy mode suppress collection',()=>{
 const c=client();c.activity.recordSiteActivity('search');c.activity.recordSiteActivity('search');
 assert.notEqual(c.sent[0].body.props.operation_id,c.sent[1].body.props.operation_id);
 c.bot=true;c.activity.recordSiteActivity('search');c.bot=false;c.anon=true;c.activity.recordSiteActivity('search');assert.equal(c.sent.length,2);
 c.anon=false;const done=c.activity.startSiteActivity('compute');c.anon=true;done();assert.equal(c.sent.length,2,'opt-out during computation suppresses result');
});
test('worker-compatible action contract separates typing/search/compute/selection and rejects free text',()=>{
 for(const event of ['typing','search','compute','select','save','share','view']){
   const props=readingActionProps('activity_2029',event,{operation_id:'11111111-1111-4111-8111-111111111111',term:'private',session:'private'});
   const body={p_sod_id:null,p_session_id:null,p_surface:'activity_2029',p_event_type:event,p_path:'/world',p_app_context:'chrome',p_is_bot:false,p_props:props};
   assert.equal(readingActionBody(body),true);assert.equal('term' in props,false);
   assert.equal(readingActionBody({...body,p_props:{...props,term:'private'}}),false);
 }
});

test('tracking has one canonical sink in public and internal builds; no visitor_events fallback',async()=>{
 const out=await build({entryPoints:['src/lib/tracking.js'],bundle:true,write:false,format:'iife',globalName:'tracking',plugins:[{name:'isolated-sinks',setup(b){
  const stubs={
   'publicReadingRelease2029.js':'export const PUBLIC_READING_RELEASE=globalThis.publicBuild;',
   'supabase.js':'export const supabase={from(){throw Error("retired sink reached")}};',
   'marketing.js':'export const trackConversion=()=>{};',
   'events.js':'export const emit=(...args)=>globalThis.sent.push(args);',
   'visitorId.js':'export const getVisitorId=()=>"fixture-visitor";',
   'botVerdict.js':'export const sideEffectAllowed=()=>!globalThis.bot;',
   'runtimeErrorCapture.js':'export const installRuntimeErrorCapture=()=>{};export const getSharedCapture=()=>()=>{};export const buildIncidentMeta=()=>({});export const sanitizeRoute=x=>x;',
  };
  b.onLoad({filter:/\.js$/},args=>{const source=stubs[args.path.split('/').pop()];return source?{contents:source}:null;});
 }}]});
 for(const publicBuild of [true,false]){
  const c={publicBuild,sent:[],bot:false,setTimeout:()=>1,console};vm.createContext(c);vm.runInContext(out.outputFiles[0].text,c);
  c.tracking.track('share','number/1820','share',{platform:'copy'});
  assert.equal(c.sent.length,1);assert.equal(c.sent[0][0],'share');
  if(!publicBuild){c.bot=true;c.tracking.track('share',null,'share');assert.equal(c.sent.length,1);}
 }
});
