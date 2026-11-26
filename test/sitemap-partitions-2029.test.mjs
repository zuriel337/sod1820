import test from 'node:test';
import assert from 'node:assert/strict';
import sitemap, {partitionedSitemap} from '../api/sitemap.js';
import {PUBLIC_READING_PROFILE_ID} from '../src/lib/publicReadingRelease2029.js';
import {runCanary} from '../scripts/post-deploy-canary.mjs';
const profile={publicFoundationPreview:true,publicReadingRelease:PUBLIC_READING_PROFILE_ID,publicReadingProductionArtifact:true};
const response=()=>({headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(c){this.code=c;return this;},send(s){this.body=s;return this;}});
async function invoke(url,handler=partitionedSitemap){const res=response();await handler({...profile,url},res);return res;}
const entries=xml=>[...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map(x=>x[0]).sort();
function source(t,{count=2051,failCount=false,badCount=false,failPage=false}={}){
 const calls=[];const rows=Array.from({length:count},(_,i)=>({phrase:i===0?'123':i===1?'':`ביטוי ${String(i).padStart(5,'0')} & מקור`,lastmod:'2026-11-21'}));
 t.mock.method(globalThis,'fetch',async(raw,options={})=>{
  const u=new URL(raw),method=options.method||'GET'; calls.push({path:u.pathname,method,params:u.searchParams});
  assert.equal(u.origin,'https://linswmnnkjxvweumprav.supabase.co');
  if(u.pathname.endsWith('/sitemap_phrases_v1')){
   if(method==='HEAD'){assert.equal(options.headers.Prefer,'count=exact');return new Response(null,{status:failCount?503:200,headers:{'content-range':badCount?'*/unknown':`0-0/${count}`}});}
   assert.equal(u.searchParams.get('order'),'phrase.asc');assert.equal(u.searchParams.get('limit'),'1000');
   if(failPage)return new Response('unavailable',{status:503});
   const from=Number(u.searchParams.get('offset'));return Response.json(rows.slice(from,from+1000));
  }
  if(u.pathname.endsWith('/posts'))return Response.json([{id:1,slug:'first-post',source:'wordpress',link:'https://sod1820.co.il/first-post/',tags:['נושא'],categories:[],date:'2026-11-21'}]);
  if(u.pathname.endsWith('/sitemap_numbers')){assert.equal(method,'POST');return Response.json([{value:1820,lastmod:'2026-11-21'}],{headers:{'content-range':'0-0/1'}});}
  assert.equal(method,'GET');return Response.json([]);
 });return calls;
}
test('index makes one metadata read; every bounded part together preserves the complete existing XML entries',async t=>{
 const calls=source(t);const index=await invoke('/sitemap.xml');assert.equal(index.code,200);
 assert.equal(calls.length,1);assert.equal(calls[0].method,'HEAD');assert.equal(calls[0].params.get('limit'),'1');
 const urls=[...index.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1].replaceAll('&amp;','&'));
 assert.deepEqual(urls.map(x=>new URL(x).search),['?part=content','?part=catalog','?part=phrases&page=1','?part=phrases&page=2','?part=phrases&page=3']);
 const all=[];
 for(const url of urls){calls.length=0;const part=await invoke(url);assert.equal(part.code,200);assert.match(part.headers['cache-control'],/s-maxage=21600/);all.push(...entries(part.body));
  if(url.includes('phrases')){assert.equal(calls.length,1);assert.ok(entries(part.body).length<=1000);}else assert.ok(calls.every(x=>!x.path.endsWith('/sitemap_phrases_v1')));
 }
 const original=await invoke('/sitemap.xml',sitemap);assert.equal(original.code,200);
 assert.deepEqual(all.sort(),entries(original.body),'no omitted/changed URL, lastmod, video/number source or priority');
 assert.equal(new Set(all).size,all.length);assert.doesNotMatch(all.join(''),/<loc>[^<]*\/number\/123<\/loc>/);
});
test('count grows without a build; zero phrases still advertises both non-phrase maps',async t=>{
 for(const count of [0,1000,1001,3001]){source(t,{count});const r=await invoke('/sitemap.xml');assert.equal(r.code,200);assert.equal((r.body.match(/<sitemap>/g)||[]).length,2+Math.ceil(count/1000));t.mock.restoreAll();}
});
test('missing totals and failed source pages fail closed and never cache an incomplete map',async t=>{
 for(const config of [{failCount:true},{badCount:true},{failPage:true}]){source(t,config);const r=await invoke(config.failPage?'/sitemap.xml?part=phrases&page=2':'/sitemap.xml');assert.equal(r.code,503);assert.equal(r.headers['cache-control'],'no-store');assert.doesNotMatch(r.body,/<urlset|<sitemapindex/);t.mock.restoreAll();}
});
test('unbounded, duplicate or noncanonical part parameters do not read any source',async t=>{
 const calls=source(t);for(const query of ['part=wrong','part=phrases','part=phrases&page=0','part=phrases&page=-1','part=phrases&page=01','part=phrases&page=1.5','part=phrases&page=50000','part=core&page=1','part=core&part=phrases','part=phrases&page=1&page=2','foo=1']){const r=await invoke('/sitemap.xml?'+query);assert.equal(r.code,404,query);assert.equal(r.headers['cache-control'],'no-store');}assert.equal(calls.length,0);
});
test('canary checks every index child and fails if a later child fails',async()=>{
 for(const failing of [false,true]){const seen=[];const result=await runCanary('https://sod1820.co.il',{fetchImpl:async raw=>{
 const u=new URL(raw);seen.push(u.pathname+u.search);
 if(u.pathname==='/')return new Response('<div id="root"></div><script src="/assets/entry.js"></script>');
 if(u.pathname==='/assets/entry.js')return new Response('x'.repeat(1100));
 if(u.pathname==='/sitemap.xml'&&!u.search)return new Response('<sitemapindex>'+[1,2,3,4].map(n=>`<sitemap><loc>https://sod1820.co.il/sitemap.xml?part=phrases&amp;page=${n}</loc></sitemap>`).join('')+'</sitemapindex>');
 if(u.search)return new Response('<urlset/>',{status:failing&&u.searchParams.get('page')==='4'?503:200});
 return new Response('ok');}});assert.equal(result.ok,!failing);assert.equal(seen.filter(x=>x.includes('?')).length,4);}
});
test('canary rejects external, duplicate or empty index targets without following foreign links',async()=>{
 for(const inner of ['','<loc>https://evil.test/map</loc>','<loc>https://sod1820.co.il/map</loc>'.repeat(2)]){const result=await runCanary('https://sod1820.co.il',{fetchImpl:async raw=>{const u=new URL(raw);assert.equal(u.origin,'https://sod1820.co.il');return new Response(u.pathname==='/'?'<div id="root"></div><script src="/assets/entry.js"></script>':u.pathname==='/assets/entry.js'?'x'.repeat(1100):u.pathname==='/sitemap.xml'?`<sitemapindex>${inner}</sitemapindex>`:'ok');}});assert.equal(result.ok,false);}
});
