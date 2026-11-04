import test from "node:test";
import assert from "node:assert/strict";
import sitemap from "../api/sitemap.js";
import og from "../api/og.js";
import { publicDocumentHandler } from "../preview-deploy/api/public-document.js";

const old = { id: 92, source: "wordpress", slug: "old-original", link: "https://sod1820.co.il/old-original/", tags: null, title: "Original source", content: "Original content", modified: "2026-10-01", date: "2015-01-01" };
const modern = { id: 5130, source: "uploaded_file", slug: "new-native", title: "New source", content: "New content", date: "2026-10-31", tags: [] };
function response() { return { code: null, body: "", headers: new Map(), setHeader(k,v) { this.headers.set(k.toLowerCase(),v); }, status(code) { this.code=code;return this; }, send(body) { this.body=body;return this; } }; }
async function withFetch(reader, run) { const previous=globalThis.fetch;globalThis.fetch=reader;try { return await run(); } finally { globalThis.fetch=previous; } }
test("XML uses the same historical/native policy including video primaries and published expressions", async () => {
  await withFetch(async raw => {
    const url=new URL(raw);let rows=[];
    if(url.pathname.endsWith("/posts")) { assert.match(url.searchParams.get("select"),/source,link,wp_id/);assert.match(url.searchParams.get("or"),/tags.is.null/);rows=[old,modern]; }
    if(url.pathname.endsWith("/video_media_assets_v1")) rows=[{primary_page_url:"https://sod1820.co.il/new-native",media_url:"https://media.invalid/v.mp4",video_kind:"selfhost",title:"New source"}];
    if(url.pathname.endsWith("/sitemap_phrases_v1")) rows=[{phrase:"בראשית"}];
    if(url.pathname.endsWith("/sitemap_numbers")) rows=[{value:1820}];
    return Response.json(rows);
  },async()=>{
    const res=response();await sitemap({publicFoundationPreview:true},res);assert.equal(res.code,200);
    assert.match(res.body,/<loc>https:\/\/sod1820.co.il\/old-original\/<\/loc>/);
    assert.equal((res.body.match(/<loc>https:\/\/sod1820.co.il\/post\/new-native<\/loc>/g)||[]).length,1);
    assert.match(res.body,/video:video/);assert.match(res.body,/number\/%D7%91%D7%A8%D7%90%D7%A9%D7%99%D7%AA/);
    assert.doesNotMatch(res.body,/<loc>https:\/\/sod1820.co.il\/(?:heichal|books|unsubscribe|updates|new-native)<\/loc>/);
  });
});
test("unavailable post inventory produces retryable status, never an apparently complete XML", async()=>{
  await withFetch(async()=>new Response("unavailable",{status:503}),async()=>{const res=response();await sitemap({publicFoundationPreview:true},res);assert.equal(res.code,503);assert.equal(res.headers.get("cache-control"),"no-store");assert.doesNotMatch(res.body,/<urlset/);});
});
test("actual metadata owner feeds canonical HTML, true 404 and retryable 503 into the protected SPA document",async()=>{
  for(const [record,path,expected,status] of [[old,"/old-original/","/old-original/",200],[modern,"/post/new-native","/post/new-native",200],[null,"/post/missing",null,404],["failure","/post/failed",null,503]]) {
    await withFetch(async raw=>{const u=new URL(raw);if(u.pathname.endsWith("/posts"))return record==="failure"?new Response("failed",{status:503}):Response.json(record?[record]:[]);return Response.json([]);},async()=>{
      const handler=publicDocumentHandler({env:{VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"gpt/2029-public-foundation-continuity-20261101"},metadataHandler:og,readDocument:async()=>'<html><head><title>Old</title><meta name="robots" content="index"><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>'});
      const res=response();await handler({method:"GET",query:{path},headers:{}},res);assert.equal(res.code,status);assert.match(res.headers.get("x-robots-tag"),/noindex/);assert.match(res.body,/src="\/assets\/app.js"/);assert.match(res.body,/<meta name="robots" content="noindex, nofollow"/);
      if(expected)assert.ok(res.body.includes('href="https://sod1820.co.il'+expected+'"'));
      assert.doesNotMatch(res.body, /http-equiv=["']refresh["']/i);
    });
  }
});
test("public document denies wrong branch, missing environment and Production before any metadata or inventory read",async()=>{
  for(const env of [{},{VERCEL_ENV:"production",VERCEL_GIT_COMMIT_REF:"gpt/2029-public-foundation-continuity-20261101"},{VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"gpt/unknown"}]){
    const handler=publicDocumentHandler({env,metadataHandler:()=>{throw Error("must not run");},readDocument:()=>{throw Error("must not read");}});const res=response();await handler({method:"GET",query:{path:"/"}},res);assert.equal(res.code,404);
  }
});
