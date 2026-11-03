import {interceptOpeningMail} from "../preview-deploy/opening-mail-transport.js";
import {buildPublicReadingWorker} from '../public-reading-deploy/transport.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {interceptPublicReadingAdminAuth} from '../preview-deploy/admin-readonly-auth.js';
import {COMMUNITY_UPLOAD_POLICY} from '../src/lib/community/communityUploadPolicy.js';
import {AVATAR_UPLOAD_POLICY} from '../src/lib/userCenter/avatarPolicy.js';
const branch='gpt/2029-doc37-unified-alignment-20261102', api='https://linswmnnkjxvweumprav.supabase.co';
const builder=readFileSync(new URL('../scripts/build-integrated-preview.mjs',import.meta.url),'utf8');
const worker=vm.runInNewContext(builder.slice(builder.indexOf('const allow ='),builder.indexOf('await writeFile(resolve(output, "preview-readonly-sw.js")'))+';worker;',{
 process:{env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch}},COMMUNITY_UPLOAD_POLICY,AVATAR_UPLOAD_POLICY,interceptPublicReadingAdminAuth,interceptOpeningMail,
});
async function request(path, {method='POST',body,origin=api,authorization='Bearer synthetic.jwt.signature',workerSource=worker}={}) {
 let listener,reply,calls=0;
 const context={Request,Response,URL,Set,Map,JSON,atob,fetch:async()=>{calls++;return new Response('{}',{status:200});},self:{location:{origin:'https://preview.invalid'},addEventListener:(event,handler)=>{if(event==='fetch')listener=handler;}}};
 vm.runInNewContext(workerSource,context);
 listener({request:new Request(origin+path,{method,headers:{authorization,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),respondWith(value){reply=value;}});
 return {response:reply?await reply:null,calls};
}
test('existing-account password, refresh, identity and local logout only reach canonical Auth',async()=>{
 for(const [path,options] of [
 ['/auth/v1/token?grant_type=password',{body:{email:'synthetic@example.invalid',password:'synthetic',gotrue_meta_security:{}}}],
 ['/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:'synthetic'}}],
 ['/auth/v1/user',{method:'GET'}],['/auth/v1/logout?scope=local',{}],
 ]) {const r=await request(path,options);assert.equal(r.response.status,200,path);assert.equal(r.calls,1,path);}
});
test('account creation, alternate grants, mutation, query ambiguity and spoof fields fail before network',async()=>{
 for(const [path,options] of [
 ['/auth/v1/signup',{}],['/auth/v1/otp',{}],['/auth/v1/recover',{}],['/auth/v1/verify',{}],
 ['/auth/v1/logout?scope=global',{}],['/auth/v1/logout?scope=local&scope=global',{}],
 ['/auth/v1/token?grant_type=pkce',{}],['/auth/v1/token?grant_type=password&redirect_to=https://evil.invalid',{body:{email:'x@y',password:'x'}}],
 ['/auth/v1/token?grant_type=password',{body:{email:'x@y',password:'x',role:'admin'}}],
 ['/auth/v1/token?grant_type=password',{body:{email:'x@y',password:'x',user_id:'forged'}}],
 ['/auth/v1/user',{method:'PUT',body:{role:'admin'}}],['/auth/v1/user',{method:'GET',authorization:''}],
 ['/auth/v1/token?grant_type=password',{origin:'https://other.supabase.co',body:{email:'x@y',password:'x'}}],
 ]) {const r=await request(path,options);assert.equal(r.response.status,403,path);assert.equal(r.calls,0,path);}
});
test('screen authentication grants no model, mail, credit, profile or research write transport',async()=>{
 for(const path of ['/functions/v1/ai-analyze','/functions/v1/research-run','/functions/v1/newsletter-signup','/rest/v1/rpc/claim_daily_credit','/rest/v1/rpc/credit_reserve_v1','/rest/v1/rpc/research_state_apply_ops_v1','/rest/v1/rpc/fn_get_or_create_my_person','/rest/v1/users']){
 const r=await request(path,{body:{}});assert.equal(r.response.status,403,path);assert.equal(r.calls,0,path);
 }
});
test('alignment branch rejects Production and unspecified environment before build',()=>{
 for(const env of ['production','']){const r=spawnSync(process.execPath,['scripts/build-integrated-preview.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,VERCEL_GIT_COMMIT_REF:branch,VERCEL_ENV:env},encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/functional_preview_requires_preview_environment/);}
});
test('Preview and dormant Production workers admit only explicitly consented opening mail, never general mailing or delivery',async()=>{
 const valid={email:'synthetic@example.invalid',purpose:'site-openings',consent:true,source:'2029-opening-parts'};
 const updates={email:'synthetic@example.invalid',purpose:'site-updates',consent:true,source:'2029-site-updates'};
 for(const workerSource of [worker,buildPublicReadingWorker('a'.repeat(40))]){
  for(const [path,options] of [['/functions/v1/newsletter-signup',{method:'OPTIONS'}],['/functions/v1/newsletter-signup?format=json',{body:valid}],['/functions/v1/newsletter-signup?format=json',{body:updates}]]){
   const r=await request(path,{...options,workerSource});assert.equal(r.response.status,200);assert.equal(r.calls,1);
  }
  for(const patch of [{purpose:'site-updates'},{source:'2029-site-updates'},{purpose:'general'},{consent:false},{ref:'other'},{acquisition:{}},{user_id:'spoof'},{source:'home-stay'}]){
   const r=await request('/functions/v1/newsletter-signup?format=json',{body:{...valid,...patch},workerSource});assert.equal(r.response.status,403);assert.equal(r.calls,0);
  }
  for(const path of ['/functions/v1/send-newsletter','/functions/v1/welcome-backfill','/functions/v1/send-reengage','/functions/v1/newsletter-signup?format=json&format=html']){
   const r=await request(path,{body:valid,workerSource});assert.equal(r.response.status,403);assert.equal(r.calls,0);
  }
 }
});
