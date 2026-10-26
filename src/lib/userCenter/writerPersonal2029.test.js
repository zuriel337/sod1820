import test from "node:test";
import assert from "node:assert/strict";
import { contributorSelfHandler } from "../../../api/contributor-self.js";
import { personalReturnHref, writerPersonalHref, publicWriterFollowLinks, loadOwnWriterIdentity } from "./writerPersonal2029.js";
import { publicContributorAvatar } from "../../components/contributor2029/publicContributor2029Model.js";
const UID="11111111-1111-4111-8111-111111111111", OTHER="22222222-2222-4222-8222-222222222222";
const person={id:"writer-id",user_id:UID,slug:"writer",code:"2042",display_name:"שם קנוני",bio:"הקדמה",active:true,visibility:"public",avatar_url:null};
const accountAvatar="https://example.invalid/account-avatar.jpg";
const response=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(v){this.body=v;return this;}});
const request=(method="GET",body={},query={})=>({method,headers:{authorization:"Bearer synthetic_verified_session_123",host:"preview.invalid",origin:"https://preview.invalid"},body,query});
function setup({rows=[person],user=UID,inbox=[{counterpart:OTHER}],pub=[{...person,user_id:OTHER}],photo=accountAvatar,readError=false,nameCollision=false,previewReadOnly=false}={}) {
 const calls=[];
 function builder(table,anon=false){let nameCheck=false;const b={select(fields){calls.push({table,anon,fields});return b;},eq(key,value){calls.push({key,value,table,anon});return b;},in(key,value){calls.push({key,value,table,anon});return b;},ilike(key,value){nameCheck=true;calls.push({key,value,table,anon,operator:"ilike"});return b;},
  then(resolve){return Promise.resolve({data:anon?pub:rows,error:readError}).then(resolve);},limit:async()=>({data:nameCheck?(nameCollision?[person]:[]):anon?pub:rows,error:readError}),maybeSingle:async()=>({data:table==="users"?{avatar_url:photo}:table==="profiles"?{xp:120,credits:4,streak:2,tier:"free"}:pub[0]||null,error:readError})};return b;}
 const client={auth:{getUser:async()=>user?{data:{user:{id:user,user_metadata:{role:"admin"}}}}:{error:true}},from:(table)=>builder(table),
  rpc:async(name,params)=>{calls.push({rpc:name,params});return {data:name==="research_level_of"?{level:5,label:"חוקר היכל",private_count:999}:name==="dm_inbox"?inbox:{ok:true}};}};
 const publicClient=()=>({from:(table)=>builder(table,true)});
 return {calls,client,publicClient,handler:contributorSelfHandler({authenticatedClient:()=>client,publicClient,previewReadOnly})};
}
test("self GET verifies account and scopes reads, never creates a contributor or mutates a profile",async()=>{
 const{handler,calls}=setup();const r=response();await handler(request("GET",{}, {user_id:OTHER,mode:"admin_all"}),r);
 assert.equal(r.code,200);assert.equal(r.body.writer.href,"/community/researcher/2042");assert.equal(r.body.rank.level,5);
 assert.equal(r.headers["Cache-Control"],"private, no-store");assert.match(r.headers["X-Robots-Tag"],/noindex/);
 assert.ok(calls.some(c=>c.table==="contributors"&&c.key==="user_id"&&c.value===UID));
 assert.ok(calls.some(c=>c.table==="profiles"&&c.key==="user_id"&&c.value===UID));
 assert.deepEqual(calls.filter(c=>c.rpc).map(c=>c.rpc),["research_level_of"]);
 assert.doesNotMatch(JSON.stringify(r.body),/11111111|22222222|private_count|999/);
 assert.equal(r.body.writer.avatar,null,"account photo is never implicitly projected publicly");
});
test("guests/invalid sessions cannot read private self data or create records",async()=>{
 for(const options of [{user:null},{}]){const f=setup(options),r=response();const req=request();if(options.user!==null)delete req.headers.authorization;await f.handler(req,r);assert.equal(r.code,401);assert.equal(f.calls.length,0);assert.deepEqual(r.body,{state:"login_required"});}
});
test("no writer/ambiguous/failed reads stay distinct; GET never invokes a creation RPC",async()=>{
 for(const[rows,readError,state]of [[[],false,"unlinked"],[[person,{...person,id:"duplicate"}],false,"ambiguous"],[[person],true,"unavailable"]]){
  const f=setup({rows,readError}),r=response();await f.handler(request(),r);assert.equal(r.body.writer.state,state);assert.equal(f.calls.some(c=>c.rpc?.startsWith("update_")),false);
 }
});
test("creation requires explicit public consent and validated name/bio, existing/ambiguous bindings are protected",async()=>{
 const f=setup({rows:[]}),r=response();await f.handler(request("POST",{action:"create",displayName:" שם ציבורי ",bio:"הקדמה",ack:true,user_id:OTHER}),r);
 assert.deepEqual(r.body,{state:"saved"});assert.equal(f.calls.find(c=>c.rpc==="update_my_page_config").params.p_config.display_name,"שם ציבורי");
 for(const change of [{ack:false},{displayName:"mail@example.invalid"},{displayName:"א".repeat(61)},{bio:"א".repeat(601)}]){
  const x=setup({rows:[]}),q=response();await x.handler(request("POST",{action:"create",displayName:"שם",bio:"",ack:true,...change}),q);assert.equal(q.code,400);assert.equal(x.calls.some(c=>c.rpc==="update_my_page_config"),false);
 }
 const bound=setup(),q=response();await bound.handler(request("POST",{action:"create",displayName:"שם",bio:"",ack:true}),q);assert.equal(q.code,409);
});
test("new pages cannot borrow an existing canonical author's name or use wildcard matching",async()=>{
 const f=setup({rows:[],nameCollision:true}),r=response();
 await f.handler(request("POST",{action:"create",displayName:"שם קנוני",bio:"",ack:true}),r);
 assert.equal(r.code,409);assert.equal(r.body.state,"name_taken");assert.equal(f.calls.some(c=>c.rpc==="update_my_page_config"),false);
 const x=setup({rows:[]}),q=response();await x.handler(request("POST",{action:"create",displayName:"שם_100%",bio:"",ack:true}),q);
 assert.equal(x.calls.find(c=>c.operator==="ilike").value,"שם\\_100\\%");assert.equal(q.body.state,"saved");
});
test("public portrait uses only this verified account's photo and explicit consent, preserving other dossier fields",async()=>{
 const f=setup(),r=response();await f.handler(request("POST",{action:"portrait",enabled:true,ack:true,url:"https://evil.invalid/forged.jpg",user_id:OTHER}),r);
 assert.deepEqual(r.body,{state:"saved"});const settings=f.calls.find(c=>c.rpc==="update_my_dossier").params.p_settings;
 assert.deepEqual(settings,{public_avatar:{enabled:true,url:accountAvatar}});
 assert.deepEqual(Object.keys(settings),["public_avatar"]);
 const hidden=setup(),h=response();await hidden.handler(request("POST",{action:"portrait",enabled:false,ack:true}),h);
 assert.deepEqual(hidden.calls.find(c=>c.rpc==="update_my_dossier").params.p_settings,{public_avatar:{enabled:false,url:null}});
 for(const options of [{rows:[]},{rows:[person,{...person,id:"duplicate"}]},{photo:"javascript:alert(1)"}]){
  const x=setup(options),a=response();await x.handler(request("POST",{action:"portrait",enabled:true,ack:true}),a);assert.equal(a.code,400);assert.equal(x.calls.some(c=>c.rpc==="update_my_dossier"),false);
 }
});
test("avatar preference is explicit, revocable and never falls back after opt-out",()=>{
 const legacy={avatar_url:"https://example.invalid/legacy.jpg"};
 assert.equal(publicContributorAvatar(legacy),legacy.avatar_url);
 assert.equal(publicContributorAvatar({...legacy,public_avatar:{enabled:false,url:accountAvatar}}),null);
 assert.equal(publicContributorAvatar({...legacy,public_avatar:{enabled:true,url:accountAvatar}}),accountAvatar);
 assert.equal(publicContributorAvatar({...legacy,public_avatar:{enabled:true,url:"javascript:alert(1)"}}),null);
});
test("conversation lookup resolves only existing own-inbox counterpart to anonymous public writer",async()=>{
 const f=setup(),r=response();await f.handler(request("GET",{}, {action:"conversation",writer:"writer"}),r);
 assert.deepEqual(r.body,{state:"ready",counterpart:OTHER,writerHref:"/community/researcher/2042"});
 const x=setup({inbox:[]}),a=response();await x.handler(request("GET",{}, {action:"conversation",counterpart:OTHER}),a);assert.equal(a.code,404);assert.equal(x.calls.some(c=>c.anon),false);
 const privateWriter=setup({pub:[{...person,user_id:OTHER,visibility:"private"}]}),b=response();await privateWriter.handler(request("GET",{}, {action:"conversation",writer:"writer"}),b);assert.equal(b.code,404);
});
test("cross-origin and unsupported self writes cannot run any product RPC",async()=>{
 const f=setup(),a=response();await f.handler({...request("POST",{action:"portrait",enabled:true,ack:true}),headers:{...request().headers,origin:"https://evil.invalid"}},a);assert.equal(a.code,403);assert.equal(f.calls.length,0);
 const b=response();await f.handler(request("DELETE"),b);assert.equal(b.code,405);
});
test("read-only Preview serves the existing verified GET and blocks every profile write before authentication or product RPC",async()=>{
 const f=setup({previewReadOnly:true}),read=response();await f.handler(request("GET"),read);
 assert.equal(read.code,200);assert.equal(read.body.state,"ready");assert.equal(read.headers["X-Preview-Read-Only"],"true");
 const before=f.calls.length,write=response();await f.handler(request("POST",{action:"portrait",enabled:false,ack:true}),write);
 assert.equal(write.code,403);assert.deepEqual(write.body,{state:"preview_read_only"});assert.equal(write.headers["X-Preview-Write-Blocked"],"true");assert.equal(f.calls.length,before);
});
test("legacy follow label links need exact unambiguous anonymous public identity; no display-name slug fabrication",async()=>{
 const f=setup();const links=await publicWriterFollowLinks(["author:שם קנוני","number:1820"],{client:f.publicClient()});
 assert.deepEqual(links,{"author:שם קנוני":"/community/researcher/2042"});
 const ambiguous=setup({pub:[person,{...person,slug:"other",code:"99"}]});assert.deepEqual(await publicWriterFollowLinks(["author:שם קנוני"],{client:ambiguous.publicClient()}),{});
 const hidden=setup({pub:[{...person,visibility:"private"}]});assert.deepEqual(await publicWriterFollowLinks(["author:שם קנוני"],{client:hidden.publicClient()}),{});
});
test("native personal routes preserve exact allowed return and refuse external/internal redirects",()=>{
 const original="/world?sourceRef=channel_updates%3Aabc#source-occurrence-abc";
 const href=writerPersonalHref("messages",{returnTo:original,writer:"writer"});const params=new URL(href,"https://example.invalid").searchParams;
 assert.equal(params.get("returnTo"),original);assert.equal(params.get("writer"),"writer");
 for(const value of ["https://evil.invalid","//evil.invalid","/admin","/2029/%2f%2fevil","/2029/%252fadmin","/\\evil.invalid"]){assert.equal(personalReturnHref(value),null);}
});
