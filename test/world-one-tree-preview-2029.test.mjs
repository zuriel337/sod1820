import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {COMMUNITY_UPLOAD_POLICY} from '../src/lib/community/communityUploadPolicy.js';
import {AVATAR_UPLOAD_POLICY} from '../src/lib/userCenter/avatarPolicy.js';
import {previewRazielHandler} from '../preview-deploy/api/preview-raziel.js';

const branch='gpt/2029-world-one-tree-sources-20261101';
const baseBranch='gpt/2029-community1187-unified-20261101';
const continuation=[branch,'gpt/2029-number-fullpage-performance-20261101','gpt/2029-public-world-number-acceptance-20261101'];
const builder=readFileSync(new URL('../scripts/build-integrated-preview.mjs',import.meta.url),'utf8');
const sha256=data=>createHash('sha256').update(data).digest('hex');
// Hermetic pins (sha256): the original baseline commit dbbe91de (PR1187 unified Preview) is not on main and CI checks out
// shallow, so `git show` of it cannot be a test input. Provenance: `git show <commit>:<path> | sha256sum`.
// Accepted state of the Preview integration surface = the files as merged to main by the owner-approved reconcile
// (#1191, 71bb7646). Since the original dbbe91de baseline that reconcile added more than the three World/Number
// continuation branches (launch-candidate / public-reading branches, the read-only launch transport, the opening-mail and
// admin-readonly interceptors), so the old "baseline plus three branch names" equality no longer describes main.
const ACCEPTED={
  'scripts/build-integrated-preview.mjs':'9851e0f2c4c829c1610f573afdca8a0485a64da16067c244344da24a76796435',
  'preview-deploy/api/contributor-self.js':'12dd60314e24431561d4571ee4161f55425c90a8fc86d593a699af4acf8489be',
  'preview-deploy/api/preview-capabilities.js':'c89cb629c47949854a5a4716a5797af031b0f9187614df9e54464da409ef7cd4',
  'preview-deploy/api/preview-raziel.js':'3e653f662964ea909667da5ebeee36f64bc7473af925d2ba99869f7a48241f2e',
  'preview-deploy/api/public-document.js':'d77d0d19d32d5a57ea7b3a077deef9f453fb1de9a99a9db46102580aea598aef',
  'preview-deploy/api/public-sitemap.js':'7ba96d45357d7242def6e158a327781e3b88272899766a9348cfad367e4f73bc',
};
test('Preview integration equals the accepted reconciled state, and the three World/Number continuation branches are granted exactly where the base branch is',()=>{
 for(const [file,expected] of Object.entries(ACCEPTED)){
  const bytes=readFileSync(new URL('../'+file,import.meta.url));
  assert.equal(sha256(bytes),expected,file+' differs from the accepted state (git diff 71bb7646 -- '+file+')');
  const current=bytes.toString('utf8');
  // Invariant kept from the original check: each continuation branch is admitted at every place the base branch is, nowhere else.
  for(const ref of continuation)assert.equal(current.split(ref).length,current.split(baseBranch).length,file+': '+ref);
 }
});
function worker(source,ref){
 return vm.runInNewContext(source.slice(source.indexOf('const allow ='),source.indexOf('await writeFile(resolve(output, "preview-readonly-sw.js")'))+';worker;',{COMMUNITY_UPLOAD_POLICY,AVATAR_UPLOAD_POLICY,process:{env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:ref}}});
}
// sha256 of the worker source the ACCEPTED baseline builder (dbbe91de) generates for each Preview ref.
const BASELINE_WORKER_SHA256={
 [baseBranch]:'989e1cc315d8b42ae1cc01c57f44bbe6cd2ff4b90b6eb4e9453090008d57f2fb',
 'gpt/2029-functional-unified-preview-20261031':'f799fe988297e140c3f9d1ec2453e71a1934d4138fbc5570450bee41c8d75516',
 [branch+'-foreign']:'18c84dc4f615d04956ed89b81fd73b3ed15a5749d4e261ac7b3f427980b51317',
 'gpt/unrelated':'18c84dc4f615d04956ed89b81fd73b3ed15a5749d4e261ac7b3f427980b51317',
};
test('new exact branch inherits the complete accepted worker without widening any principal or operation',()=>{
 for(const ref of continuation)assert.equal(sha256(worker(builder,ref)),BASELINE_WORKER_SHA256[baseBranch],ref);
 for(const [ref,expected] of Object.entries(BASELINE_WORKER_SHA256))assert.equal(sha256(worker(builder,ref)),expected,ref);
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
