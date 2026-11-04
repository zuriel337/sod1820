import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {COMMUNITY_UPLOAD_POLICY} from '../src/lib/community/communityUploadPolicy.js';
import {AVATAR_UPLOAD_POLICY} from '../src/lib/userCenter/avatarPolicy.js';
import {previewRazielHandler} from '../preview-deploy/api/preview-raziel.js';

const branch='gpt/2029-number-fullpage-performance-20261101';
const baseBranch='gpt/2029-community1187-unified-20261101';
const builder=readFileSync(new URL('../scripts/build-integrated-preview.mjs',import.meta.url),'utf8');
function worker(source,ref){
 return vm.runInNewContext(source.slice(source.indexOf('const allow ='),source.indexOf('await writeFile(resolve(output, "preview-readonly-sw.js")'))+';worker;',{COMMUNITY_UPLOAD_POLICY,AVATAR_UPLOAD_POLICY,process:{env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:ref}}});
}
test('new exact branch inherits the complete accepted worker without widening any principal or operation',()=>{
 const baseline=execFileSync('git',['show','dbbe91de46d21a37110664dc732473de6d9cc6ca:scripts/build-integrated-preview.mjs'],{encoding:'utf8'});
 assert.equal(worker(builder,branch),worker(baseline,baseBranch));
 for(const ref of [baseBranch,'gpt/2029-functional-unified-preview-20261031',branch+'-foreign','gpt/unrelated'])assert.equal(worker(builder,ref),worker(baseline,ref));
});
test('the new branch cannot build for Production or an unspecified environment',()=>{
 for(const environment of ['production','']){
  const result=spawnSync(process.execPath,['scripts/build-integrated-preview.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,VERCEL_ENV:environment,VERCEL_GIT_COMMIT_REF:branch},encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/functional_preview_requires_preview_environment/);
 }
});
test('new Preview proxy keeps verified-admin denial, caller identity, cost boundaries and no paid retry',async()=>{
 const request={method:'POST',headers:{host:'preview.vercel.app',origin:'https://preview.vercel.app',authorization:'Bearer a.b.c','x-vercel-oidc-token':'signed.platform.proof'},body:{kind:'research',persona:'raziel',research_contract:'public-number-research-run-v1',subject:'synthetic'}};
 for(const [role,fail]of [[false,false],['true',false],[true,false],[true,true]]){
  const calls=[],res={code:null,setHeader(){},status(code){this.code=code;return this;},json(value){this.value=value;return this;}};
  await previewRazielHandler({env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch},fetchImpl:async(url,init)=>{
   calls.push({url,init});if(url.endsWith('/user'))return Response.json({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',user_metadata:{role:'admin'}});
   if(url.endsWith('/rd_is_admin'))return Response.json(role);
   if(fail)throw Error('ambiguous model response');return Response.json({status:'ok'});
  }})(request,res);
  assert.equal(res.code,role===true?(fail?502:200):403);assert.equal(calls.length,role===true?3:2);
  if(role===true){assert.equal(calls[2].init.headers.Authorization,request.headers.authorization);assert.equal(calls[2].init.body,JSON.stringify(request.body));assert.equal(calls.filter(c=>c.url.includes('ai-analyze')).length,1);}
 }
 for(const env of [{VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:branch},{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch+'-foreign'}]){
  let calls=0;const res={setHeader(){},status(n){this.code=n;return this;},json(){}};
  await previewRazielHandler({env,fetchImpl:async()=>{calls++;throw Error('must not reach server');}})(request,res);
  assert.equal(res.code,404);assert.equal(calls,0);
 }
});
