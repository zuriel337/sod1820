import test from "node:test";
import assert from "node:assert/strict";
import { publicSourceCatalog2029,selectSourceCatalog2029 } from "./publicSourceCatalog2029Model.js";
import { sourceCatalogFixture,sourceCatalogFixtureView,catalogFixtureIdentity,catalogFixtureSources } from "./publicSourceCatalog2029Fixtures.js";
import { loadPublicContributor2029 } from "./loadPublicContributor2029.js";

test("only catalog.recentItems opens, capped at 20; all items remain reachable with bounded pages",()=>{
  const view=sourceCatalogFixtureView(1054);
  const recent=selectSourceCatalog2029(view,"");
  assert.equal(recent.rows.length,20);
  assert.deepEqual(recent.rows,view.catalog.recentItems);
  const seen=new Set();
  for(let page=1;page<=Math.ceil(view.catalog.items.length/20);page++){
    const selected=selectSourceCatalog2029(view,`section=all&page=${page}`);
    assert.ok(selected.rows.length<=20);
    selected.rows.forEach(item=>seen.add(item.id));
  }
  assert.equal(seen.size,view.catalog.items.length);
  const last=view.catalog.items.at(-1);
  assert.ok(selectSourceCatalog2029(view,`section=all&item=${encodeURIComponent(last.id)}`).rows.some(item=>item.id===last.id));
});

test("paired image/text remains one publication and retains both native source refs",()=>{
  const view=sourceCatalogFixtureView();
  const paired=view.catalog.items.filter(item=>item.paired);
  assert.equal(paired.length,1);
  assert.equal(paired[0].sourceRecordCount,2);
  assert.equal(paired[0].linkedSourceRefs.length,2);
  assert.equal(view.catalog.items.length,24);
  assert.equal(selectSourceCatalog2029(view,"section=media").rows.length,1);
  assert.ok(paired[0].href.includes("sourceRef="));
  assert.ok(paired[0].href.includes("#source-occurrence-"));
});

test("categories need source-owned topic evidence; text and strength never infer categories",()=>{
  const c=sourceCatalogFixture();
  const items=c.items.map((item,index)=>({...item,sourceTopics:["שפה","גימטריה מרחבית"],evidence:{categoryBasis:index===0?"channel_updates.topics":null}}));
  const view=publicSourceCatalog2029({...c,items,recentItems:items.slice(0,20)});
  assert.equal(view.catalog.items.filter(item=>item.sourceTopics.length).length,1);
  assert.equal(selectSourceCatalog2029(view,"section=all&format=explicit_topics").total,1);
  assert.ok(view.catalog.items.every(item=>!Object.hasOwn(item,"strength")));
});

test("off/private/candidate sources stay closed; unavailable source count stays unknown",()=>{
  const c=sourceCatalogFixture();
  const hidden=["off","private","candidate","public_candidate"].map((state,index)=>({...c.items[0],id:`hidden-${index}`,publicationState:state}));
  const view=publicSourceCatalog2029({...c,items:[...c.items,...hidden],availability:{sources:"unavailable"}});
  assert.equal(view.catalog.sourcesAvailable,false);
  assert.equal(view.catalog.items.some(item=>item.id.startsWith("hidden-")),false);
  assert.equal(Object.hasOwn(view.catalog,"count"),false);
});

test("Tzvi loader calls the canonical SOURCE_LIBRARY wrapper; never queries research on entry",async()=>{
  const calls=[];const identity={...catalogFixtureIdentity,public_visibility:"public"};
  const sources=catalogFixtureSources();
  const client={from(table){
    calls.push(table);
    if(table.includes("research")&&table!=="research_contributions")throw new Error("full_research_was_requested");
    let filters=[];
    const b={select:()=>b,eq:(k,v)=>{filters.push(r=>String(r[k])===String(v));return b;},
      in:(k,v)=>{filters.push(r=>v.includes(r[k]));return b;},is:(k,v)=>{filters.push(r=>r[k]==null&&v===null);return b;},order:()=>b,
      maybeSingle:()=>Promise.resolve({data:identity}),
      range:()=>{const data=table==="channel_updates"?sources.filter(r=>filters.every(f=>f(r))):[];return Promise.resolve({data,count:data.length});}};
    return b;
  }};
  const view=await loadPublicContributor2029("tzvi-opoc",{publicClient:()=>client});
  assert.equal(view.kind,"source_catalog");
  assert.equal(view.catalog.researchDeferred,true);
  assert.equal(view.catalog.recentItems.length,20);
  assert.equal(calls.some(table=>table==="research_objects"||table==="world_contributor_research_v1"),false);
  assert.equal(calls.filter(table=>table==="channel_updates").length,3);
});
