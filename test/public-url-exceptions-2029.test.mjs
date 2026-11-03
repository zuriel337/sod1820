import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicPostLinkedMedia, legacySourcePath } from '../src/lib/research/publicPostSourceLinks2029.js';
import { publicReadingDocumentHandler } from '../public-reading-deploy/api/public-document.js';
import { publicReadingContinuation, publicReadingPath } from '../src/lib/publicReadingRelease2029.js';

const image='https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/a.jpg';
const source='/old/attachment/7';
const link=(src=image,extra='')=>`<a href="${source}"><img src="${src}" ${extra}></a>`;
const response=()=>({code:null,headers:new Map(),body:'',setHeader(k,v){this.headers.set(k.toLowerCase(),v);},status(n){this.code=n;return this;},send(v){this.body=String(v);return this;}});
const handler=publicReadingDocumentHandler({authorized:()=>true,readDocument:async()=>'<html><head></head><body></body></html>'});
const request=async path=>{const r=response();await handler({method:'GET',headers:{host:'sod1820.co.il'},url:path,query:{}},r);return r;};
const json=rows=>new Response(JSON.stringify(rows),{headers:{'Content-Type':'application/json'}});
async function isolated(fetcher,run){const prev=globalThis.fetch;globalThis.fetch=fetcher;try{await run();}finally{globalThis.fetch=prev;}}

test('source attachment requires one exact actual anchor and a public image; never infers filenames or data-href',()=>{
 assert.equal(publicPostLinkedMedia(link(image,'loading="lazy" loading="lazy"'),source).href,image);
 assert.equal(legacySourcePath('https://sod1820.co.il/old/attachment/7/?x=1'),source);
 for(const html of [`<div data-href="${source}"><img src="${image}"></div>`, `<!--${link()}-->`, `<script>${link()}</script>`,link().replace('href=','data-href='),link().replace(source,'https://other.example'+source),link().replace('src=',`src="${image}" src=`),link('https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/authenticated/media/a.jpg'),link()+link(image.replace('a.jpg','b.jpg'))]) assert.equal(publicPostLinkedMedia(html,source),null,html);
 for(const bad of ['//other.example/x','javascript:alert(1)','/%ZZ','/a%5cb','https://user@sod1820.co.il/a'])assert.equal(legacySourcePath(bad),null);
 assert.equal(publicPostLinkedMedia(link(),'/old/attachment/8'),null);
});

test('all 2609 source URL strings survive reconciliation and every attachment rule points to its proven Post and exact image selector',()=>{
 const root=new URL('../docs/reviews/public-url-exceptions-20261103/',import.meta.url);
 const data=JSON.parse(readFileSync(new URL('reconciliation.json',root)));
 const proofs=JSON.parse(readFileSync(new URL('evidence/attachment-bindings.json',root)));
 const rules=JSON.parse(readFileSync(new URL('../public-reading-deploy/vercel.json',import.meta.url))).redirects;
 assert.equal(data.rows.length,2609);assert.equal(new Set(data.rows.map(r=>r.sourceUrl)).size,2609);
 assert.deepEqual(data.counts,{invalid:5,resolved:2355,intentionally_closed:52,pending_decision:197});
 assert.equal(data.rows.filter(r=>r.cohort==='post_lookup').length,2140);
 assert.equal(data.rows.filter(r=>r.cohort==='unhandled').length,469);
 for(const proof of proofs){const row=data.rows.find(r=>r.sourceUrl===proof.sourceUrl);assert.equal(row.postId,proof.postId);assert.equal(row.mediaHref,proof.mediaHref);assert.ok(row.chain.length);
  for(const suffix of ['', '/']){const rule=rules.find(r=>r.source===proof.sourcePath+suffix);assert.ok(rule);const u=new URL(rule.destination,'https://sod1820.co.il');assert.equal(u.searchParams.get('sourceAttachment'),proof.sourcePath);assert.equal(decodeURIComponent(u.pathname).replace(/\/$/,''),decodeURIComponent(proof.postHref).replace(/\/$/,''));}
  assert.equal(proof.byteEvidence.status,200);assert.match(proof.byteEvidence.mime,/^image\//);
 }
});

test('known route continuations retain query multiplicity and fragments; unknown descendants and templates stay missing',()=>{
 const suffix='?ref=a&ref=b&return=%2Fpost%2Fold#part';
 assert.equal(publicReadingContinuation('/WORLD','?ref=a&ref=b&return=%2Fpost%2Fold','#part'),'/world'+suffix);
 assert.equal(publicReadingContinuation('/category/סוד-האותיות/גלריות-גימטריה','?page=2','#p'),'/category/גלריות-גימטריה?page=2#p');
 for(const p of ['/category/סוד-האותיות/made-up','/old/attachment/999999','/editor/other','/*','/$1','/SLUG'])assert.equal(publicReadingPath(p),'missing');
 for(const p of ['/editor','/research-viewer','/2029/control','/צור-קשר/תרומות-donate','/sulamot11'])assert.equal(publicReadingPath(p),'closed');
});

test('real document fallback matches encoded literal source paths and emits header-safe Unicode targets with exact repeated query bytes',async()=>{
 await isolated(()=>{throw Error('redirect must not read data');},async()=>{
  const proof=JSON.parse(readFileSync(new URL('../docs/reviews/public-url-exceptions-20261103/evidence/attachment-bindings.json',import.meta.url)))[0];
  const r=await request(proof.sourceUrl+'?ref=a&ref=b&encoded=%2f%2F+%20');assert.equal(r.code,308);
  const u=new URL(r.headers.get('location'),'https://sod1820.co.il');assert.equal(u.searchParams.get('sourceAttachment'),proof.sourcePath);assert.deepEqual(u.searchParams.getAll('ref'),['a','b']);assert.ok(u.search.endsWith('&encoded=%2f%2F+%20'));assert.match(r.headers.get('location'),/^[\x20-\x7e]+$/);
  const c=await request('/category/'+encodeURIComponent('סוד-האותיות')+'/'+encodeURIComponent('גלריות-גימטריה')+'/?page=1');assert.equal(c.code,308);assert.equal(new URL(c.headers.get('location'),'https://sod1820.co.il').pathname,'/category/'+encodeURIComponent('גלריות-גימטריה'));
 });
});

test('missing historical bytes and private cache paths never masquerade as successful HTML media',async()=>{
 await isolated(()=>{throw Error('must not call a reader');},async()=>{
  for(const p of ['/audio/m/1.wav','/audio/246.wav','/data/user/0/app/cache/image.jpg','/wp-content/plugins/gallery-images/style/spinner.gif']){const r=await request(p);assert.equal(r.code,404);assert.match(r.headers.get('content-type'),/^text\/plain/);}
  const r=await request('/wp-json/wp/v2/posts');assert.equal(r.code,404);assert.match(r.headers.get('content-type'),/^application\/json/);
 });
});

test('attachment HTTP validates public source identity, exact selection, canonical and OG media; failure stays distinct from absence',async()=>{
 const post={id:1,slug:'old',source:'wordpress',wp_id:1,title:'Old public post',content:link(),tags:[]};
 await isolated(async()=>json([post]),async()=>{
  const r=await request('/old?sourceAttachment='+encodeURIComponent(source));assert.equal(r.code,200);assert.ok(r.body.includes(image));assert.match(r.body,/<link rel="canonical" href="https:\/\/sod1820.co.il\/old"/);assert.match(r.headers.get('x-robots-tag'),/noindex/);
  for(const suffix of ['?sourceAttachment=','?sourceAttachment=%2Fwrong','?sourceAttachment='+encodeURIComponent(source)+'&sourceAttachment='+encodeURIComponent(source)])assert.equal((await request('/old'+suffix)).code,404);
 });
 for(const tags of [['טיוטה'],['פורום']])await isolated(async()=>json([{...post,tags}]),async()=>assert.equal((await request('/old?sourceAttachment='+encodeURIComponent(source))).code,404));
 await isolated(async()=>{throw Error('offline');},async()=>assert.equal((await request('/old?sourceAttachment='+encodeURIComponent(source))).code,503));
});

test('verified collection is the existing public Posts flag, never a guessed truth score or private collection',async()=>{
 await isolated(async url=>{const u=new URL(url);assert.equal(u.pathname,'/rest/v1/posts');assert.equal(u.searchParams.get('verified'),'eq.true');assert.equal(u.searchParams.get('or'),'(tags.is.null,tags.not.ov.{טיוטה,פורום})');assert.equal(u.searchParams.get('order'),'modified.desc.nullslast,id.asc');return json([{id:1}]);},async()=>assert.equal((await request('/verified')).code,200));
 await isolated(()=>{throw Error('must not query invalid filters');},async()=>assert.equal((await request('/verified?category=anything')).code,404));
 await isolated(async()=>json([]),async()=>assert.equal((await request('/verified?page=99')).code,404));
 await isolated(async()=>{throw Error('offline');},async()=>assert.equal((await request('/verified')).code,503));
});
