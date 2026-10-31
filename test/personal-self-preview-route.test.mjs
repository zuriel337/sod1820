import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler from '../preview-deploy/api/contributor-self.js';

const response=()=>({code:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('Preview Node entry shares the canonical ESM package mode used by its imported handler',()=>{
 for(const path of ['../preview-deploy/package.json','../package.json'])assert.equal(JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8')).type,'module');
});
test('Preview SPA fallback excludes API paths and retains native personal routes',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../preview-deploy/vercel.json',import.meta.url),'utf8'));
 const fallback=config.rewrites.find(r=>r.destination==='/index.html');const match=new RegExp('^'+fallback.source+'$');
 for(const path of ['/api/contributor-self','/api/unknown','/api'])assert.equal(match.test(path),false,path);
 for(const path of ['/','/2029/me/page-editor','/2029/me/public-page','/community/chat'])assert.equal(match.test(path),true,path);
});
test('deployed Preview wrapper returns private JSON Auth denial, never a static page',async()=>{
 const r=response();await handler({method:'GET',headers:{},url:'/api/contributor-self'},r);
 assert.equal(r.code,401);assert.deepEqual(r.body,{state:'login_required'});assert.equal(r.headers['Cache-Control'],'private, no-store');assert.equal(r.headers.Vary,'Authorization');assert.equal(r.headers['X-Preview-Read-Only'],'true');
});
test('deployed wrapper denies writes even outside a Preview runtime',async()=>{
 const r=response();await handler({method:'POST',headers:{},body:{action:'create'}},r);
 assert.equal(r.code,403);assert.deepEqual(r.body,{state:'preview_read_only'});assert.equal(r.headers['X-Preview-Write-Blocked'],'true');
});

test('exact unified Preview enables only the existing own-avatar capability and keeps profile writes blocked',async()=>{
 const previous={VERCEL_ENV:process.env.VERCEL_ENV,VERCEL_GIT_COMMIT_REF:process.env.VERCEL_GIT_COMMIT_REF};
 const branch='gpt/2029-unified-community-latest-integration-20261031';
 try{
  for(const[index,[environment,ref,expected]]of [[ 'preview',branch,'true'],['preview',branch+'-other','false'],['production',branch,'false']].entries()){
   process.env.VERCEL_ENV=environment;process.env.VERCEL_GIT_COMMIT_REF=ref;
   const {default:entry}=await import('../preview-deploy/api/contributor-self.js?unified-avatar='+index);
   const guest=response();await entry({method:'GET',headers:{},url:'/api/contributor-self'},guest);
   assert.equal(guest.code,401);assert.equal(guest.headers['X-Preview-Avatar-Updates'],expected);
   const denied=response();await entry({method:'POST',headers:{},body:{action:'create'}},denied);
   assert.equal(denied.code,403);assert.equal(denied.headers['X-Preview-Write-Blocked'],'true');
  }
 }finally{for(const[key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
