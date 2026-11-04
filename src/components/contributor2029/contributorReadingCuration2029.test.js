import test from "node:test";
import assert from "node:assert/strict";
import { contributorCurationHandler } from "../../../api/contributor-curation.js";
import { writerFeaturedItems, writerReadingEntity, writerReadingProjection } from "./contributorReading2029Model.js";
import { writerPinEntry } from "./contributorCuration2029Model.js";
import { applyResearchOps, emptyResearchState, makeResearchOp } from "../../lib/research/researchSyncState.js";

const UID="11111111-1111-4111-8111-111111111111", OTHER="22222222-2222-4222-8222-222222222222";
const identity={id:"contributor-id",slug:"writer",user_id:UID,public_visibility:"public"};
const item={id:"channel_updates:00000000-0000-4000-8000-000000000001",sourceRef:"channel_updates:00000000-0000-4000-8000-000000000001",title:"כתב מקור",href:"/world?sourceRef=channel_updates%3A00000000-0000-4000-8000-000000000001#source-occurrence-00000000-0000-4000-8000-000000000001",linkedSourceRefs:["native-image","native-text"]};
const view={kind:"source_catalog",canonicalHref:"/community/researcher/writer",catalog:{sourcesAvailable:true,items:[item]}};
const pin={id:"native-studio-pin",contributor_id:identity.id,...writerPinEntry(item)};
const res=()=>({code:200,setHeader(){},status(c){this.code=c;return this;},json(v){this.body=v;return this;}});
const req=(body={action:"feature",itemId:item.id,enabled:true})=>({method:"POST",headers:{host:"preview.example",origin:"https://preview.example",authorization:"Bearer synthetic_verified_token_12345"},body:{slug:"writer",...body}});
function setup({user=UID,person=identity,pins=[],owners=[{id:identity.id,page_config:{version:1,sections:[{id:"posts",visible:false}],highlights:[{type:"post",ref:"kept"}],links:[{label:"מקור",url:"/world"}],accent:"#9c7a1e"}}],rpcOK=true,publicView=view}={}) {
  const calls=[];
  const publicClient=()=>({from(){const b={select(){return b;},eq(){return b;},maybeSingle:async()=>({data:person})};return b;}});
  const authenticatedClient=()=>({auth:{getUser:async()=>user?{data:{user:{id:user}}}:{error:true}},
    from(){const b={select(){return b;},eq(){return b;},limit:async()=>({data:owners})};return b;},
    rpc:async(name,params)=>{calls.push({name,params});return name==="studio_list"?{data:pins}:rpcOK?{data:name==="studio_upsert"?"native-studio-id":{ok:true}}:{error:true};}});
  return {calls,handler:contributorCurationHandler({publicClient,authenticatedClient,loadView:async(_key,options)=>{assert.equal(options.publicClient,publicClient);return publicView;}})};
}

test("source saves reuse ResearchProvider library and stable references; paired native refs survive",()=>{
  const entity=writerReadingEntity(item,view.canonicalHref);
  assert.equal(entity.type,"source");assert.equal(entity.ref,item.sourceRef);assert.equal(entity.link,item.href);
  assert.deepEqual(entity.metadata.linkedSourceRefs,item.linkedSourceRefs);
  let state=applyResearchOps(emptyResearchState(),[makeResearchOp("item_upsert",{bucket:"library",entity}),makeResearchOp("history_add",{entity})]);
  state=applyResearchOps(state,[makeResearchOp("item_upsert",{bucket:"library",entity})]);
  assert.equal(state.saved.length,1);assert.deepEqual(writerReadingProjection(view,state).resume,{title:item.title,href:item.href});
  assert.equal(writerReadingProjection({...view,canonicalHref:"/community/researcher/other"},state).resume,null);
  assert.equal(writerReadingProjection({...view,catalog:{items:[]}},state).savedCount,0);
});
test("featured content resolves only current public exact links, deduplicates and excludes authored/non-source studio blocks",()=>{
  const projected={...pin,href:pin.link_url,refType:"source",imageUrl:null,media:[]};
  const result=writerFeaturedItems(view,[projected,{...projected,id:"duplicate"},{...projected,id:"private-locator",href:"/private"},{...projected,id:"authored",body:"original author notes"}]);
  assert.equal(result.length,1);assert.equal(result[0].id,item.id);assert.equal(result[0].studioId,pin.id);
  assert.equal(writerReadingEntity({...item,href:"javascript:alert(1)"},view.canonicalHref),null);
});
test("owner selection resolves caller item ID against anonymous canonical content and stores references only",async()=>{
  const {handler,calls}=setup();const r=res();await handler(req({action:"feature",itemId:item.id,enabled:true,title:"FORGED",href:"https://evil.invalid",sourceRef:"private"}),r);
  assert.deepEqual(r.body,{state:"saved"});const entry=calls.find(c=>c.name==="studio_upsert").params;
  assert.deepEqual(entry,{p_slug:"writer",p_code:null,p_entry:writerPinEntry(item)});
  assert.equal(entry.p_entry.body,null);assert.deepEqual(entry.p_entry.media,[]);
  assert.doesNotMatch(JSON.stringify(entry),/FORGED|evil|private/);
});
test("repeat selection updates same native pin; deselection unpublishes pointer without deleting original source",async()=>{
  for(const enabled of [true,false]){const{handler,calls}=setup({pins:[pin]});const r=res();await handler(req({action:"feature",itemId:item.id,enabled}),r);
    const entry=calls.find(c=>c.name==="studio_upsert").params.p_entry;
    assert.equal(entry.id,pin.id);assert.equal(entry.is_public,enabled);assert.equal(entry.ref,item.href);
    assert.equal(calls.some(c=>c.name==="studio_delete"),false);
  }
});
test("private/locked/self-unlinked/other-account and fabricated IDs cannot curate",async()=>{
  for(const options of [{user:OTHER},{user:null},{person:{...identity,locked:true}},{person:{...identity,user_id:null}},{person:{...identity,public_visibility:"private"}}]){
    const{handler,calls}=setup(options);const r=res();await handler(req(),r);assert.ok([401,403,404].includes(r.code));assert.equal(calls.length,0);
  }
  const{handler,calls}=setup();const r=res();await handler(req({action:"feature",itemId:"private-source",enabled:true}),r);assert.equal(r.code,404);assert.equal(calls.length,0);
});
test("feature limit and missing source reader fail without writes",async()=>{
  const pins=Array.from({length:3},(_,i)=>({...pin,id:`pin${i}`,link_url:`/source/${i}`,ref:`/source/${i}`}));
  const withExisting={...view,catalog:{...view.catalog,items:[item,...pins.map((pin)=>({...item,id:pin.id,href:pin.link_url}))]}};
  for(const options of [{pins,publicView:withExisting},{publicView:{...view,catalog:{...view.catalog,sourcesAvailable:false}}}]){
    const{handler,calls}=setup(options);const r=res();await handler(req(),r);assert.ok([409,503].includes(r.code));assert.equal(calls.some(c=>c.name==="studio_upsert"),false);
  }
  const withdrawn=setup({pins});const r=res();await withdrawn.handler(req(),r);assert.equal(r.code,200,"unavailable old sources must not silently consume visible selection quota");
});
test("introduction preserves existing config sections/highlights/links; ambiguous account binding never updates another writer",async()=>{
  const{handler,calls}=setup();const r=res();await handler(req({action:"introduction",bio:"  הקדמה ציבורית  "}),r);
  assert.deepEqual(r.body,{state:"saved"});const config=calls.find(c=>c.name==="update_my_page_config").params.p_config;
  assert.deepEqual(config.highlights,[{type:"post",ref:"kept"}]);assert.equal(config.sections[0].visible,false);assert.equal(config.links.length,1);assert.equal(config.bio,"הקדמה ציבורית");
  const ambiguous=setup({owners:[{id:identity.id,page_config:{}},{id:"second",page_config:{}}]});const a=res();await ambiguous.handler(req({action:"introduction",bio:"הקדמה"}),a);
  assert.equal(a.code,409);assert.equal(ambiguous.calls.length,0);
});
test("empty/oversize introductions, cross-origin and unsupported methods are rejected; RPC errors stay bounded",async()=>{
  for(const bio of [""," ","א".repeat(601),null]){const{handler,calls}=setup();const r=res();await handler(req({action:"introduction",bio}),r);assert.equal(r.code,400);assert.equal(calls.length,0);}
  const{handler,calls}=setup();const a=res();await handler({...req(),headers:{...req().headers,origin:"https://evil.invalid"}},a);assert.equal(a.code,403);assert.equal(calls.length,0);
  const b=res();await handler({...req(),method:"GET"},b);assert.equal(b.code,405);
  const failed=setup({rpcOK:false});const c=res();await failed.handler(req(),c);assert.deepEqual(c.body,{state:"error"});
});
