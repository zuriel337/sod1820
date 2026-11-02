import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {COMMUNITY_UPLOAD_POLICY} from '../src/lib/community/communityUploadPolicy.js';
import {AVATAR_UPLOAD_POLICY} from '../src/lib/userCenter/avatarPolicy.js';
import {publicDocumentHandler} from '../preview-deploy/api/public-document.js';
import {previewRazielHandler} from '../preview-deploy/api/preview-raziel.js';
import {previewCapabilitiesHandler} from '../preview-deploy/api/preview-capabilities.js';

const branch='gpt/2029-public-launch-closure-20261102',baseRef='gpt/2029-public-reading-release-configuration-20261101';
const baseSha='6cd64a79598aaa38de4596f2506beb167447bf1c';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const builder=read('scripts/build-integrated-preview.mjs');
function worker(source,ref,env='preview'){
 return vm.runInNewContext(source.slice(source.indexOf('const allow ='),source.indexOf('await writeFile(resolve(output, "preview-readonly-sw.js")'))+';worker;',
  {COMMUNITY_UPLOAD_POLICY,AVATAR_UPLOAD_POLICY,process:{env:{VERCEL_ENV:env,VERCEL_GIT_COMMIT_REF:ref}}});
}
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},send(v){this.body=v;return this;},json(v){this.body=v;return this;}});

test('integration branch inherits byte-identical accepted public reading worker; old/foreign branches are unchanged',()=>{
 const original=execFileSync('git',['show',baseSha+':scripts/build-integrated-preview.mjs'],{encoding:'utf8'});
 assert.equal(worker(builder,branch),worker(original,baseRef));
 for(const ref of[baseRef,'gpt/2029-functional-unified-preview-20261031',branch+'-foreign','gpt/unrelated'])assert.equal(worker(builder,ref),worker(original,ref));
});
test('integration branch continues to reject Production and missing environment before building',()=>{
 for(const env of['production','']){const r=spawnSync(process.execPath,['scripts/build-integrated-preview.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,VERCEL_ENV:env,VERCEL_GIT_COMMIT_REF:branch},encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/functional_preview_requires_preview_environment/);}
});
test('public document uses trusted same reading profile, genuine status, noindex and no-store; forged activation cannot bypass branch/env',async()=>{
 for(const status of[200,404]){let observed;const res=response();await publicDocumentHandler({env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch},readDocument:async()=>'<html><head></head><body>same app</body></html>',metadataHandler:async(req,r)=>{observed=req;r.status(status).send('<html><head><title>owner</title><meta name="robots" content="index,follow"></head></html>');}})({method:'GET',query:{path:'/?p=34200&part=2&part=7',publicReadingRelease:'forged'}},res);assert.equal(res.code,status);assert.equal(observed.publicReadingRelease,'public-reading-20261101');assert.match(res.body,/noindex/);assert.equal(res.headers['Cache-Control'],'private, no-store');}
 for(const env of[{VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:branch},{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch+'-foreign'}]){let calls=0;const r=response();await publicDocumentHandler({env,readDocument:async()=>{calls++;return'';}})({method:'GET',query:{path:'/gematria',publicReadingRelease:'public-reading-20261101'}},r);assert.equal(r.code,404);assert.equal(calls,0);}
});
test('closed model/platform APIs remain unavailable before identity or network work',async()=>{
 for(const handler of[previewRazielHandler({env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch},fetchImpl:async()=>{throw Error('I/O forbidden');}}),previewCapabilitiesHandler({env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch},verifyToken:async()=>{throw Error('token verification forbidden');}})]){const r=response();await handler({method:'POST',headers:{authorization:'Bearer synthetic',host:'preview.invalid'}},r);assert.equal(r.code,404);}
 const own=read('preview-deploy/api/contributor-self.js').replace(/^import[^\n]+\n/,'').replace('export default','globalThis.options =');
 const ctx={process:{env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch}},contributorSelfHandler:options=>options};vm.runInNewContext(own,ctx);assert.equal(ctx.options.previewReadOnly,true);assert.equal(ctx.options.avatarUpdates,false);
});
