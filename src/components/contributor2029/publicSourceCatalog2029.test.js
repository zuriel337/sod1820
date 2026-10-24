import test from "node:test";
import assert from "node:assert/strict";
import { appendSourceCatalogWritings2029,publicSourceCatalog2029,selectSourceCatalog2029 } from "./publicSourceCatalog2029Model.js";
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

test("native live publication state survives the public adapter without broadening off/unknown states",()=>{
  const c=sourceCatalogFixture();
  assert.ok(c.items.length>20);
  assert.ok(c.items.every(item=>item.publicationState==="live"));
  const extra=["off","private","candidate","public_candidate","unexpected"].map((state,index)=>({...c.items[0],id:`blocked-${index}`,publicationState:state}));
  const view=publicSourceCatalog2029({...c,items:[...c.items,...extra]});
  assert.equal(view.catalog.items.length,c.items.length);
  assert.equal(view.catalog.recentItems.length,20);
  assert.ok(view.catalog.items.every(item=>item.publicationState==="live"));
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

test("five native articles join the full catalogue once, preserving the exact twenty recent sources",()=>{
  const base=sourceCatalogFixtureView(1054);
  const rows=Array.from({length:5},(_,i)=>({id:5000+i,slug:`article-${i}`,title:`Article ${i}`,date:"2026-08-01T12:00:00Z"}));
  const view=appendSourceCatalogWritings2029(base,{rows:[...rows,rows[0]],complete:true,availability:"ok"},{slug:"tzvi-opoc"});
  assert.equal(view.catalog.items.length,base.catalog.items.length+5);
  assert.strictEqual(view.catalog.recentItems,base.catalog.recentItems);
  assert.deepEqual(selectSourceCatalog2029(view,"").rows,base.catalog.recentItems);
  for(const row of rows){
    const selection=selectSourceCatalog2029(view,`section=all&item=post%3A${row.id}`);
    const item=selection.rows.find(item=>item.id===`post:${row.id}`);
    assert.equal(item.sourceRef,`posts:${row.id}`);
    assert.equal(new URL(item.href,"https://example.test").searchParams.get("source"),"tzvi-opoc");
    assert.equal(new URL(item.href,"https://example.test").searchParams.get("sourceRef"),`posts:${row.id}`);
    assert.deepEqual(item.linkedSourceRefs,[`posts:${row.id}`]);
  }
  assert.equal(view.publicationCoverage.posts.count,5);
  assert.equal(view.community,base.community);
});

test("article load failure keeps native sources and signals incomplete catalogue rather than zero",()=>{
  const base=sourceCatalogFixtureView();
  const view=appendSourceCatalogWritings2029(base,{rows:[],complete:false,availability:"unavailable"},{slug:"tzvi-opoc"});
  assert.equal(view.publicationCoverage.posts.count,null);
  assert.equal(view.catalog.truncated,true);
  assert.deepEqual(view.catalog.items,base.catalog.items);
});

test("Tzvi loader composes only post metadata alongside the canonical source catalogue",async()=>{
  const identity={...catalogFixtureIdentity,public_visibility:"public"};
  const client={from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:identity})};return q;}};
  const view=await loadPublicContributor2029("tzvi-opoc",{publicClient:()=>client,
    projectionReader:async()=>({mode:"public_view",contributor:identity,availability:{},sourceGroups:[]}),
    catalogReader:async(slug,options)=>{await options.findingsReader(slug,{mode:"public_view"});return sourceCatalogFixture();},
    publicationReader:async(row,options)=>{
      assert.equal(row.id,identity.id);assert.equal(options.client,client);assert.deepEqual(options.families,["posts"]);
      return{posts:{rows:[{id:5000,slug:"article",title:"Article",date:"2026-01-01"}],complete:true,availability:"ok"}};
    }});
  assert.ok(view.catalog.items.some(item=>item.sourceRef==="posts:5000"));
  assert.equal(view.catalog.recentItems.length,20);
});
