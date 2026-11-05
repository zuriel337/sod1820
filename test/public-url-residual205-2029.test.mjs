import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicReadingCapability, publicReadingPath, publicReadingExternalSourceHref } from "../src/lib/publicReadingRelease2029.js";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";
const root=new URL("../docs/reviews/public-url-exceptions-20261103/",import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(name,root)));

test("all frozen205 receive a bounded live review; audio HTML is never accepted as recovered media",()=>{
  const data=read("reconciliation.json"),http=read("residual205/evidence/live-http.json");
  assert.equal(http.requestedCount,205);assert.equal(http.completedCount,205);
  assert.equal(new Set(http.rows.map(x=>x.sourceUrl)).size,205);
  const reviewed=data.rows.filter(x=>x.legacyReview);assert.equal(reviewed.length,205);
  for(const fact of http.rows){const row=reviewed.find(x=>x.sourceUrl===fact.sourceUrl);assert.ok(row);assert.equal(row.legacyReview.httpStatus,fact.status);}
  const audio=reviewed.filter(x=>x.sourceUrl.startsWith("/audio/"));assert.equal(audio.length,193);
  for(const row of audio){assert.equal(row.status,"deferred_post_launch");assert.equal(row.legacyReview.contentRestored,false);assert.match(row.legacyReview.cutover,/approved_by_zuriel_after_launch/);assert.equal(row.legacyReview.recoveryTaskKey,"PUBLIC_LEGACY_BROKEN_AUDIO_POST_RECOVERY_AFTER_LAUNCH");}
  const deferred=reviewed.filter(row=>row.status==="deferred_post_launch");assert.equal(deferred.length,195);
  assert.equal(deferred.filter(row=>!row.sourceUrl.startsWith("/audio/")).length,2);
  assert.equal(reviewed.filter(x=>x.reason==="exact_existing_restricted_draft_identity").length,4);
  assert.equal(reviewed.filter(x=>x.legacyReview.cutover.startsWith("blocker_")).length,0);
  assert.equal(reviewed.filter(x=>x.legacyReview.cutover.startsWith("possible_blocker_")).length,0);
  // The former assertion on the Legacy SearchTabs component (its /image tab was marked soon) was removed with that component (Legacy removal, 5.11).
});

test("only the three proven Facebook source aliases continue; no guessed video IDs or source-playback claim",async()=>{
  const entries=[
    ["/86AND26/videos/vb.103870716369907/801439149946390/","https://www.facebook.com/86AND26/videos/801439149946390/"],
    ["/k1820/videos/839307259461807/","https://www.facebook.com/k1820/videos/839307259461807/"],
    ["/k1820/videos/vb.617996338259568/839307259461807/","https://www.facebook.com/k1820/videos/839307259461807/"],
  ];
  const prior=globalThis.fetch;globalThis.fetch=()=>{throw Error("source continuation must not query private or unrelated content");};
  try{for(const [path,destination]of entries){
    assert.equal(publicReadingCapability(path.replace(/\/$/,"")).links[0][0],destination);
    assert.equal(publicReadingExternalSourceHref(destination),destination);
    const res={code:null,headers:{},body:"",setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(n){this.code=n;return this;},send(v){this.body=v;return this;}};
    await publicReadingDocumentHandler({authorized:()=>true,readDocument:async()=>"<html><head></head><body></body></html>"})({method:"GET",url:path,headers:{host:"sod1820.co.il"},query:{}},res);
    assert.equal(res.code,200);assert.match(res.headers["x-robots-tag"],/noindex/);
  }}finally{globalThis.fetch=prior;}
  for(const path of ["/k1820/videos/839307259461808/","/other/videos/839307259461807/","/k1820/videos/vb.999/839307259461807/"])assert.equal(publicReadingPath(path),"missing");
  for(const href of [null,"javascript:alert(1)","//facebook.com/k1820/videos/839307259461807/","https://www.facebook.com/k1820/videos/839307259461808/","https://www.facebook.com@evil.example/k1820/videos/839307259461807/","https://www.facebook.com.evil.example/k1820/videos/839307259461807/","https://www.facebook.com/k1820/videos/839307259461807/?redirect=other"])assert.equal(publicReadingExternalSourceHref(href),null);
});
