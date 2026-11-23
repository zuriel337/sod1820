import test from "node:test";
import assert from "node:assert/strict";
import {
 PUBLIC_SEO_ORIGIN_2029, publicationFamily2029, parsePublicSitemapEntries2029,
 selectPublicationSeoCandidates2029, assessPublicationSeoHttp2029
} from "../src/lib/research/publicationSeoAudit2029.js";
import { runPublicationSeoAudit2029 } from "../scripts/run-publication-seo-audit-2029.mjs";
const loc=path=>PUBLIC_SEO_ORIGIN_2029+path;
const item=(path,lastmod)=>({url:loc(path),path,family:publicationFamily2029(path),lastmod});
const sitemap=(entries)=>'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+entries.map(({path,date})=>'<url><loc>'+loc(path)+'</loc>'+(date?'<lastmod>'+date+'</lastmod>':'')+'</url>').join('')+'</urlset>';
const html=(path,extra="")=>`<!doctype html><html lang="he"><head><title>המסע לשער החמישים — סוד 1820</title><link rel="canonical" href="${loc(path)}"><meta name="description" content="המסע לשער החמישים, ספר מחקר ומקורות"/>${extra}</head><body><main><article>זהו תוכן ציבורי נגיש, הכולל דברי פתיחה, מראי מקום, הקשרים למחקר ומבוא שמסביר את העיסוק בשער החמישים.</article></main></body></html>`;
test("sitemap uses exact canonical URL family: no query, off-domain, root aliases or arbitrary dynamic routes",()=>{
 const xml='<?xml version="1.0"?><urlset><url><loc>'+loc("/post/new-post")+'</loc><lastmod>2026-11-23</lastmod></url><url><loc>https://evil.example/post/bad</loc></url><url><loc>'+loc("/post/bad?private=1")+'</loc></url><url><loc>'+loc("/number/337")+'</loc></url><url><loc>'+loc("/legacy-wordpress-slug")+'</loc></url></urlset>';
 const result=parsePublicSitemapEntries2029(xml);
 assert.equal(result.status,"OBSERVED");assert.deepEqual(result.items.map(x=>x.path),["/post/new-post","/legacy-wordpress-slug"]);
 assert.equal(result.items[1].family,"root-candidate");
});
test("48-hour date-only publication selection includes post, Book and codes; missing dates never count as full coverage",()=>{
 const rows=[item("/post/a","2026-11-22"),item("/post/old","2026-10-10"),item("/book/b",null),item("/codes/c",null)];
 const r=selectPublicationSeoCandidates2029(rows,{now:"2026-11-23T10:00:00Z",max:24});
 assert.deepEqual(r.items.map(x=>x.path),["/post/a","/book/b","/codes/c"]);
 assert.equal(r.coverage,"SELECTED");
});
test("many undated books are labelled PARTIAL and never silently omitted",()=>{
 const rows=Array.from({length:15},(_,i)=>item("/book/"+i,null));
 const r=selectPublicationSeoCandidates2029(rows,{now:"2026-11-23T10:00:00Z",max:18,perFamily:4});
 assert.equal(r.items.length,4);assert.equal(r.coverage,"PARTIAL");
 assert.ok(r.reasons.includes("book:UNDATED_COVERAGE_PARTIAL"));
});
test("valid public document passes only HTTP evidence, not a Google indexing claim",()=>{
 const i=item("/post/sample","2026-11-23");
 const report=assessPublicationSeoHttp2029(i,{status:200,finalUrl:i.url,headers:{"x-robots-tag":"index, follow"},body:html(i.path)});
 assert.equal(report.state,"OBSERVED_OK");
 assert.match(report.note,/Google indexing/);
});
test("public sitemap pointing at missing Post or noindex is a real failure",()=>{
 const i=item("/post/test","2026-11-23");
 assert.equal(assessPublicationSeoHttp2029(i,{status:404}).state,"FAIL");
 const r=assessPublicationSeoHttp2029(i,{status:200,body:html(i.path,'<meta name="robots" content="noindex">')});
 assert.equal(r.state,"FAIL");assert.ok(r.issues.includes("PUBLIC_SITEMAP_HAS_NOINDEX"));
});
test("wrong canonical and sitemap redirects are failures; content-only uncertainty stays UNKNOWN",()=>{
 const i=item("/book/hello",null);
 const bad=assessPublicationSeoHttp2029(i,{status:200,finalUrl:loc("/books/hello"),redirected:true,body:html("/book/other")});
 assert.equal(bad.state,"FAIL");assert.ok(bad.issues.includes("CANONICAL_MISMATCH"));
 const unknown=assessPublicationSeoHttp2029(i,{status:200,body:html(i.path).replace(/<main>[\s\S]*<\/main>/,"")});
 assert.equal(unknown.state,"UNKNOWN");
});
test("no sitemap / no recent content is UNKNOWN, not all green",async()=>{
 const a=await runPublicationSeoAudit2029({fetchPage:async()=>({status:503,body:""})});
 assert.equal(a.status,"UNKNOWN");
 const b=await runPublicationSeoAudit2029({fetchPage:async()=>({status:200,body:sitemap([])})});
 assert.equal(b.status,"UNKNOWN");
});
test("full read-only runner detects a specific actual Post failure without writing anything",async()=>{
 let calls=[];
 const fetchPage=async url=>{
  calls.push(url);
  if(url.includes("sitemap.xml"))return {status:200,body:sitemap([{path:"/post/published",date:"2026-11-23"},{path:"/codes/public-matrix",date:"2026-11-23"}])};
  return url.endsWith("/post/published")?{status:200,body:html("/post/published"),headers:{}}:{status:200,body:html("/codes/bad"),headers:{}};
 };
 const r=await runPublicationSeoAudit2029({fetchPage,now:"2026-11-23T10:00:00Z"});
 assert.equal(r.status,"FAIL");assert.equal(r.metrics.fail,1);assert.equal(calls.length,3);
 assert.equal(r.results.find(x=>x.family==="code").issues[0],"CANONICAL_MISMATCH");
});
test("the public /codes/מחקר research collection is not a saved cipher",()=>{
 const codeCollection="/codes/"+encodeURIComponent("מחקר");
 const xml=sitemap([{path:codeCollection,date:"2026-11-23"},{path:"/codes/real-code",date:"2026-11-23"}]);
 const r=parsePublicSitemapEntries2029(xml);
 assert.deepEqual(r.items.map(x=>x.path),["/codes/real-code"]);
 assert.equal(publicationFamily2029(codeCollection),null);
});
test("a sitemap-listed legacy root Post with lastmod is checked; static root categories stay excluded",()=>{
 const xml=sitemap([{path:"/legacy-old-post",date:"2026-11-23"},{path:"/privacy",date:"2026-11-23"}]);
 const parsed=parsePublicSitemapEntries2029(xml);
 assert.deepEqual(parsed.items.map(x=>x.path),["/legacy-old-post"]);
 const selected=selectPublicationSeoCandidates2029(parsed.items,{now:"2026-11-23T10:00:00Z"});
 assert.equal(selected.items.length,1);assert.equal(selected.items[0].family,"root-candidate");
});
test("quiet publication day is not a false-positive outage",async()=>{
 const r=await runPublicationSeoAudit2029({fetchPage:async()=>({status:200,body:sitemap([{path:"/post/old",date:"2026-01-01"}])}),now:"2026-11-23T10:00:00Z"});
 assert.equal(r.status,"NO_RECENT_PUBLICATION");assert.equal(r.metrics.selected,0);
});
test("an unreadable public source never becomes a zero-error pass",async()=>{
 const fetchPage=async url=>url.includes("sitemap.xml")?{status:200,body:sitemap([{path:"/post/abc",date:"2026-11-23"}])}:Promise.reject(Error("timeout"));
 const r=await runPublicationSeoAudit2029({fetchPage,now:"2026-11-23T10:00:00Z"});
 assert.equal(r.status,"PARTIAL");assert.equal(r.metrics.unknown,1);assert.equal(r.metrics.pass,0);
});


test("a busy publishing day rotates cohorts across hours, covering the whole backlog",()=>{
 const items=Array.from({length:15},(_,i)=>item("/post/recent-"+String(i).padStart(2,"0"),"2026-11-23"));
 const selected=new Set();
 for(let hour=0;hour<6;hour++){
  const run=selectPublicationSeoCandidates2029(items,{now:new Date(Date.UTC(2026,10,23,hour)),max:8,perFamily:8});
  assert.equal(run.items.length,8);
  assert.equal(run.coverage,"PARTIAL");
  run.items.forEach(x=>selected.add(x.url));
 }
 assert.equal(selected.size,15,"all 15 new Posts are audited by rotating bounded samples");
});
test("a busy Post family cannot starve books and public codes in the same run",()=>{
 const items=[
  ...Array.from({length:16},(_,i)=>item("/post/post-"+i,"2026-11-23")),
  ...Array.from({length:16},(_,i)=>item("/book/book-"+i,"2026-11-23")),
  ...Array.from({length:16},(_,i)=>item("/codes/code-"+i,"2026-11-23")),
  ...Array.from({length:6},(_,i)=>item("/historical-post-"+i,"2026-11-23")),
 ];
 const selected=selectPublicationSeoCandidates2029(items,{now:"2026-11-23T10:00:00Z",max:18,perFamily:8});
 assert.equal(selected.items.length,18);
 assert.deepEqual([...new Set(selected.items.map(x=>x.family))].sort(),["book","code","post","root-candidate"]);
 assert.equal(selected.coverage,"PARTIAL");
 assert.ok(selected.reasons.includes("TOTAL_BOUNDED"));
});
