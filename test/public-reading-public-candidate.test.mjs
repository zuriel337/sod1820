import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {build} from 'esbuild';
import {publicCandidateBuildIdentity,publicCandidateRuntimeAuthorized,protectedReviewBuildIdentity,protectedReviewRuntimeAuthorized,protectedReviewConfigMaterialization,REVIEW_PROJECT_ID,PRODUCTION_REVIEW_BRANCH,REVIEW_AUTH_HOST} from '../public-reading-deploy/review-admission.js';

// Isolated source proposal only. No platform identity is used to deploy or
// address a real service. All source readers and renderers are synthetic.
const root=fileURLToPath(new URL('..',import.meta.url));
const sha='c'.repeat(40),canonical='https://sod1820.co.il';
const env={VERCEL:'1',VERCEL_ENV:'production',VERCEL_TARGET_ENV:'production',VERCEL_PROJECT_ID:REVIEW_PROJECT_ID,VERCEL_GIT_COMMIT_REF:PRODUCTION_REVIEW_BRANCH,VERCEL_GIT_COMMIT_SHA:sha,VERCEL_DEPLOYMENT_ID:'dpl_SyntheticPublicCandidate1',VERCEL_URL:'sod1820-syntheticpublic1-sod1820-s-projects.vercel.app'};
const input={env,sourceSha:sha,requestedSourceSha:sha,sourceDirty:false};
const receipt=publicCandidateBuildIdentity(input),immutable='https://'+env.VERCEL_URL;
const metadata=(path,robots='index, follow')=>`<html><head><title>Existing public owner</title><link rel="canonical" href="${canonical+path}"><meta name="robots" content="${robots}"></head><body>metadata only</body></html>`;
function response(){return {code:0,headers:{},body:null,setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(n){this.code=n;return this;},send(s){this.body=s;return this;},json(s){this.body=s;return this;}};}
function request(path='/',origin=canonical,extra={}){return {url:path,method:'GET',headers:{host:new URL(origin).host,'x-forwarded-proto':'https'},query:{},...extra};}
function plugin(identity){return {name:'synthetic-public-candidate-only',setup(b){
 b.onLoad({filter:/protected-review-build\.js$/},a=>a.path===resolve(root,'public-reading-deploy/.generated/protected-review-build.js')?{loader:'js',contents:`export const PROTECTED_REVIEW_BUILD=Object.freeze(${JSON.stringify(identity)});`}:undefined);
 b.onLoad({filter:/[/\\]api[/\\]og\.js$/},a=>a.path===resolve(root,'api/og.js')?{loader:'js',contents:`export default async function(req,res){globalThis.ownerCalls.push(req);const row=globalThis.ownerRows[req.query.path]||{};if(row.fail)throw Error('synthetic source unavailable');if(row.location)res.setHeader('Location',row.location);res.status(row.status??200).send(row.html||globalThis.defaultMetadata);}`}:undefined);
 b.onLoad({filter:/[/\\]api[/\\]sitemap\.js$/},a=>a.path===resolve(root,'api/sitemap.js')?{loader:'js',contents:`export default async function(req,res){globalThis.sitemapCalls.push(req);res.setHeader('Content-Type','application/xml');res.setHeader('Cache-Control','public,max-age=120');res.setHeader('X-Robots-Tag','index, follow');res.status(200).send(globalThis.ownerXml);}`}:undefined);
 b.onLoad({filter:/[/\\]api[/\\]card\.js$/},a=>a.path===resolve(root,'api/card.js')?{loader:'js',contents:`export default async function(){globalThis.cardCalls++;return new Response('existing renderer',{headers:{'content-type':'image/png'}});}`}:undefined);
 b.onLoad({filter:/[/\\]api[/\\]contributor-self\.js$/},a=>a.path===resolve(root,'api/contributor-self.js')?{loader:'js',contents:`export function contributorSelfHandler(){return async function(){globalThis.privateHandlerCalls++;throw Error('private source must not be read');}}`}:undefined);
 b.onLoad({filter:/[/\\]src[/\\]lib[/\\]supabase\.js$/},a=>a.path===resolve(root,'src/lib/supabase.js')?{loader:'js',contents:`export const SUPABASE_ANON='synthetic-publishable-only';`}:undefined);
}};}
let compiled;
async function context(identity=receipt,platform=env){
 const built=await build({stdin:{resolveDir:root,contents:`export * from './public-reading-deploy/authorization.js';export{publicReadingDocumentHandler}from'./public-reading-deploy/api/public-document.js';export{publicReadingRobotsHandler}from'./public-reading-deploy/api/public-robots.js';export{publicReadingSitemapHandler}from'./public-reading-deploy/api/public-sitemap.js';export{readingContributorSelfHandler}from'./public-reading-deploy/api/contributor-self.js';export{default as card}from'./public-reading-deploy/api/card.js';`,loader:'js'},bundle:true,write:false,platform:'node',format:'iife',globalName:'adapters',define:{'import.meta.url':JSON.stringify('file:///synthetic/public-document.js'),'import.meta.env':'{}'},plugins:[plugin(identity)]});
 const ctx={require,process:{env:platform},console,setTimeout,clearTimeout,URL,URLSearchParams,Request,Response,Headers,Buffer,TextEncoder,TextDecoder,atob,fetch:async()=>{throw Error('ALL live fetches forbidden in proposal test');},ownerCalls:[],sitemapCalls:[],ownerRows:{},defaultMetadata:metadata('/'),ownerXml:`<urlset><url><loc>${canonical}/old-post</loc></url></urlset>`,privateHandlerCalls:0,cardCalls:0};
 vm.createContext(ctx);vm.runInContext(built.outputFiles[0].text,ctx);return ctx;
}
const readDocument=async()=>'<html><head><title>app title</title></head><body><main>EXISTING_APP</main></body></html>';

test('public-capable candidate needs exact real-shaped Production identity but does not authorize traffic assignment',()=>{
 assert.ok(Object.isFrozen(receipt));assert.equal(receipt.mode,'public-production-candidate');assert.equal(receipt.target,'production');
 assert.equal(receipt.canonicalServingPrepared,true);assert.equal(receipt.indexingPrepared,true);
 for(const key of ['productionAuthorized','cutoverAuthorized','domainAssignmentAuthorized'])assert.equal(receipt[key],false);
 assert.equal(publicCandidateRuntimeAuthorized(receipt,env),true);assert.equal(protectedReviewRuntimeAuthorized(receipt,env),false);assert.equal(receipt.authHost,undefined);
});
test('missing, wrong, copied, Preview, retired-branch, foreign, dirty and unpinned identities fail closed',()=>{
 const bad=[null,{},...Object.keys(env).map(k=>({...env,[k]:undefined})),{...env,VERCEL_ENV:'preview'},{...env,VERCEL_TARGET_ENV:'preview'},{...env,VERCEL_PROJECT_ID:'prj_other'},{...env,VERCEL_GIT_COMMIT_REF:'gpt/2029-public-cutover-final-preparation-20261103'},{...env,VERCEL_GIT_COMMIT_SHA:'d'.repeat(40)},...['sod1820.co.il','www.sod1820.co.il','evil.vercel.app',env.VERCEL_URL+'.evil.test',REVIEW_AUTH_HOST].map(host=>({...env,VERCEL_URL:host}))];
 for(const v of bad){assert.throws(()=>publicCandidateBuildIdentity({...input,env:v}),/identity_rejected/);assert.equal(publicCandidateRuntimeAuthorized(receipt,v),false);}
 for(const v of [{sourceDirty:true},{requestedSourceSha:null},{requestedSourceSha:'HEAD'},{requestedSourceSha:'d'.repeat(40)}])assert.throws(()=>publicCandidateBuildIdentity({...input,...v}),/identity_rejected/);
 for(const key of ['sourceSha','projectId','branch','deploymentId','host','mode','target'])assert.equal(publicCandidateRuntimeAuthorized({...receipt,[key]:'wrong'},env),false,key);
 for(const key of ['productionAuthorized','cutoverAuthorized','domainAssignmentAuthorized'])for(const value of [true,undefined])assert.equal(publicCandidateRuntimeAuthorized({...receipt,[key]:value},env),false,key);
 for(const key of ['canonicalServingPrepared','indexingPrepared'])for(const value of [false,undefined])assert.equal(publicCandidateRuntimeAuthorized({...receipt,[key]:value},env),false,key);
 assert.equal(publicCandidateRuntimeAuthorized({...receipt,authHost:REVIEW_AUTH_HOST},env),false);
});
test('Preview/stage receipts cannot select public serving and default remains dormant',async()=>{
 const stage=protectedReviewBuildIdentity({...input,reviewTarget:'production'});
 assert.equal(publicCandidateRuntimeAuthorized(stage,env),false);
 const c=await context(stage);assert.equal(c.adapters.publicIndexingAllowed(canonical),false);assert.equal(c.adapters.publicReadingOriginAllowed(canonical),false);
 const dormant=await context(null);assert.equal(dormant.adapters.deploymentAuthorized(),false);const res=response();await dormant.adapters.publicReadingDocumentHandler({readDocument})(request('/'),res);assert.equal(res.code,503);assert.equal(dormant.ownerCalls.length,0);
});
test('public build keeps the one exact nested-config exception; it cannot authorize unrelated dirty edits',()=>{
 const config='{"framework":null,"headers":[]}';const args={reviewMode:true,reviewTarget:'production',env,trackedStatus:' M vercel.json\0',trackedDiff:`:100644 100644 ${'d'.repeat(40)} ${'0'.repeat(40)} M\0vercel.json\0`,committedConfig:config,workingConfig:config};
 assert.equal(protectedReviewConfigMaterialization(args),true);
 for(const patch of [{trackedStatus:args.trackedStatus+' M src/App2029.jsx\0'},{workingConfig:'{"headers":[]}'},{reviewMode:false},{env:{...env,VERCEL_PROJECT_ID:'wrong'}},{trackedDiff:args.trackedDiff.replace('100644 100644','100644 120000')}])assert.equal(protectedReviewConfigMaterialization({...args,...patch}),false);
});
test('canonical documents retain owner metadata; immutable staging is always noindex and no-store',async()=>{
 const c=await context();assert.equal(c.adapters.protectedReviewOrigin(),null);assert.equal(c.adapters.publicCandidateOrigin(),immutable);
 for(const origin of [canonical,immutable]){c.ownerRows['/']={html:metadata('/')};const res=response();await c.adapters.publicReadingDocumentHandler({readDocument})(request('/',origin),res);assert.equal(res.code,200,c.proposalFailure);assert.match(res.body,/EXISTING_APP/);assert.equal(res.headers['cache-control'],'no-store');assert.match(res.body,/https:\/\/sod1820.co.il\//);assert.match(res.headers['x-robots-tag'],origin===canonical?/^index, follow$/:/noindex/);}
 assert.equal(c.adapters.publicReadingOriginAllowed('https://'+REVIEW_AUTH_HOST),false);assert.equal(c.adapters.publicReadingOriginAllowed(null),false);
});
test('WWW redirects preserve raw encoded path and repeated query; old addresses and original path selector remain exact',async()=>{
 const c=await context();const path='/%D7%A4%D7%95%D7%A1%D7%98?part=2&part=7&path=%2Frequested';const res=response();await c.adapters.publicReadingDocumentHandler({readDocument})(request(path,'https://www.sod1820.co.il'),res);assert.equal(res.code,308);assert.equal(res.headers.location,canonical+path);assert.equal(c.ownerCalls.length,0);
 c.ownerRows['/old-post']={html:metadata('/old-post')};const old=response();await c.adapters.publicReadingDocumentHandler({readDocument})(request('/old-post?part=2&part=7&path=%2Frequested'),old);assert.equal(old.code,200);assert.match(old.body,/canonical" href="https:\/\/sod1820.co.il\/old-post/);assert.equal(c.ownerCalls.at(-1).query.path,'/old-post');assert.equal(c.ownerCalls.at(-1).publicReadingSearch,'?part=2&part=7&path=%2Frequested');
});
test('genuine missing, closed, private, non-indexable and failed source states never become indexable successes',async()=>{
 const c=await context();const handler=c.adapters.publicReadingDocumentHandler({readDocument});
 for(const path of ['/this-is-not-a-real-public-page','/2029/control','/login','/credits']){c.ownerRows[path]={status:path==='/this-is-not-a-real-public-page'?404:200,html:metadata(path)};const res=response();await handler(request(path),res);assert.equal(res.code,path==='/this-is-not-a-real-public-page'?404:200,path);assert.match(res.headers['x-robots-tag'],/noindex/,path);}
 c.ownerRows['/number/1820']={html:metadata('/number/1820','noindex, follow')};let res=response();await handler(request('/number/1820'),res);assert.match(res.headers['x-robots-tag'],/noindex/);
 c.ownerRows['/old-post']={status:503};res=response();await handler(request('/old-post'),res);assert.equal(res.code,503);assert.equal(res.headers['retry-after'],'60');assert.match(res.headers['x-robots-tag'],/noindex/);
 c.ownerRows['/old-post']={status:404,html:metadata('/old-post','noindex, follow')};res=response();await handler(request('/old-post'),res);assert.equal(res.code,404);assert.match(res.headers['x-robots-tag'],/noindex/);
});
test('robots and XML allow canonical crawling while immutable stage stays private from indexing',async()=>{
 const c=await context();for(const origin of [canonical,immutable]){
  const rob=response();await c.adapters.publicReadingRobotsHandler()(request('/robots.txt',origin),rob);assert.equal(rob.code,200);assert.equal(rob.headers['cache-control'],'no-store');assert.match(rob.body,origin===canonical?/Allow: \/\nDisallow: \/api\//:/^User-agent: \*\nDisallow: \/\n$/);
  const xml=response();await c.adapters.publicReadingSitemapHandler()(request('/sitemap.xml',origin),xml);assert.equal(xml.code,200);assert.equal(xml.body,c.ownerXml);assert.equal(xml.headers['cache-control'],'no-store');assert.match(xml.headers['x-robots-tag'],origin===canonical?/^index/:/noindex/);assert.equal(c.sitemapCalls.at(-1).publicReadingProductionArtifact,true);
 }
 const head=response();await c.adapters.publicReadingSitemapHandler()(request('/sitemap.xml',canonical,{method:'HEAD'}),head);assert.equal(head.body,'');
});
test('foreign hosts, path spoofing and unsupported methods reject before public readers',async()=>{
 const c=await context();const handler=c.adapters.publicReadingDocumentHandler({readDocument});
 for(const req of [request('/','https://evil.invalid'),request('/','https://sod1820.co.il.evil.invalid'),request('/',canonical,{headers:{host:'sod1820.co.il','x-forwarded-proto':'http'}}),request('/',canonical,{method:'POST'}),request('/api/public-document',canonical,{query:{path:'//evil.invalid'}})]){const res=response();await handler(req,res);assert.ok([400,405,421].includes(res.code));}
 assert.equal(c.ownerCalls.length,0);assert.equal(c.sitemapCalls.length,0);
 const ctx=await context({...receipt,mode:'forged'},env);const res=response();await ctx.adapters.publicReadingDocumentHandler({readDocument})(request('/?cutover=true',canonical,{headers:{host:'sod1820.co.il','x-cutover':'true'}}),res);assert.equal(res.code,503);assert.equal(ctx.ownerCalls.length,0);
});
test('public deployment proof never replaces caller JWT or private authorization',async()=>{
 const c=await context();const handler=c.adapters.readingContributorSelfHandler();
 for(const headers of [{host:'sod1820.co.il'},{host:'sod1820.co.il',authorization:'Bearer invalid-token-that-is-not-a-jwt'}]){const res=response();await handler({url:'/api/contributor-self',method:'GET',headers},res);assert.equal(res.code,403);}
 assert.equal(c.privateHandlerCalls,0);
});
test('Edge share renderer admits only exact allowed public candidate hosts',async()=>{
 const c=await context();for(const origin of [canonical,immutable]){const res=await c.adapters.card(new Request(origin+'/api/card?path=%2Fold-post'));assert.equal(res.status,200);}
 const res=await c.adapters.card(new Request('https://foreign.invalid/api/card?path=%2Fold-post'));assert.equal(res.status,421);assert.equal(c.cardCalls,2);
});
test('new build mode rejects mixed, duplicate and missing pins before any compiler or platform operation',()=>{
 for(const args of [['--public-production-candidate'],['--public-production-candidate','--protected-review','--review-source='+sha],['--public-production-candidate','--protected-production-review','--review-source='+sha],['--public-production-candidate','--public-production-candidate','--review-source='+sha],['--public-production-candidate','--review-source='+sha,'--review-source='+sha]]){
  const r=spawnSync(process.execPath,['scripts/build-public-reading-production.mjs',...args],{cwd:root,env:{PATH:process.env.PATH},encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/invalid_public_reading_build_arguments/);
 }
});

test('direct document API remains noindex even for an eligible public post on the canonical host',async()=>{
 const c=await context();c.ownerRows['/old-post']={html:metadata('/old-post')};const res=response();
 await c.adapters.publicReadingDocumentHandler({readDocument})(request('/api/public-document?path=%2Fold-post',canonical,{query:{path:'/old-post'}}),res);
 assert.equal(res.code,200);assert.match(res.headers['x-robots-tag'],/noindex/);assert.match(res.body,/canonical" href="https:\/\/sod1820.co.il\/old-post/);assert.equal(res.headers['cache-control'],'no-store');
});
