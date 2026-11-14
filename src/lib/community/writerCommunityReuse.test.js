import test from "node:test";
import assert from "node:assert/strict";
import { fetchPublicAuthorActivityPage, fetchCommunityAuthorSummary, legacyLikeCount, normalizeCommunityRow, VERIFIED_ARCHIVE_PROFILES } from "./communityArchive.js";
import { REVIEWED_ESTHER_LINK } from "./communityCanonicalIdentity2029.js";
const contributorId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
function fixture({fail=false}={}) {
 const calls=[];
 const rows=[{id:"message",author_contributor_id:contributorId,author_name:"שם קיים",body:"הודעה עם לייקים",reactions:{likes:12,"👍":["one","two"]},created_at:"2020-01-01T00:00:00Z",status:"approved",origin:"community_2029"}];
 const client={from(table){let fields;const b={select(value,opts){fields=value;calls.push({table,method:"select",value,opts});return b;},
  eq(...args){calls.push({table,method:"eq",args});return b;},neq(...args){calls.push({table,method:"neq",args});return b;},not(...args){calls.push({table,method:"not",args});return b;},in(...args){calls.push({table,method:"in",args});return b;},
  is(...args){calls.push({table,method:"is",args});return b;},
  or(value){calls.push({table,method:"or",value});return b;},order(...args){calls.push({table,method:"order",args});return b;},
  maybeSingle:async()=>({data:{user_id:accountId},error:fail}),limit:async()=>({data:[{created_at:rows[0].created_at}],error:fail}),
  range:async(...args)=>{calls.push({table,method:"range",args});return {data:rows,count:30,error:fail};}};return b;}};
 return {client,calls};
}
test("writer activity reuses the community reader with an explicit anonymous client and exact contributor/account binding",async()=>{
 const {client,calls}=fixture();
 const value=await fetchPublicAuthorActivityPage(contributorId,{client,limit:20});
 assert.equal(value.rows[0].id,"message");assert.equal(value.count,30);assert.equal(value.nextOffset,1);
 assert.equal(legacyLikeCount(value.rows[0].reactions),14);
 assert.ok(calls.some(c=>c.table==="contributors"&&c.method==="eq"&&c.args[0]==="id"&&c.args[1]===contributorId));
 assert.ok(calls.some(c=>c.method==="or"&&c.value===`author_user_id.in.(${accountId}),author_contributor_id.in.(${contributorId})`));
 assert.ok(calls.some(c=>c.method==="eq"&&c.args[0]==="status"&&c.args[1]==="approved"));
 assert.deepEqual(calls.find(c=>c.method==="range").args,[0,19]);
 assert.deepEqual(calls.filter(c=>c.method==="order").map(c=>c.args[0]),["created_at","id"]);
 assert.equal(calls.some(c=>c.method==="in"&&c.args[0]==="origin"),false,"all activity uses the existing author page policy");
});
test("existing community summary policy is preserved; a page of messages is never presented as total author likes",async()=>{
 const {client,calls}=fixture();const summary=await fetchCommunityAuthorSummary(contributorId,{client});
 assert.deepEqual(summary,{firstAt:"2020-01-01T00:00:00Z",archiveLikes:null});
 assert.equal(calls.some(c=>c.method==="range"),false);
 assert.ok(calls.some(c=>c.method==="in"&&c.args[0]==="origin"));
 // the two visibility filters of the summary (a deleted message and a hidden thread never count): asked of research_contributions, with null
 for(const column of ["deleted_at","thread_hidden_at"]){
  assert.ok(calls.some(c=>c.table==="research_contributions"&&c.method==="is"&&c.args[0]===column&&c.args[1]===null),`the summary asks for ${column} is null`);
 }
});
test("failed and invalid existing author reads do not return fabricated empty activity",async()=>{
 await assert.rejects(()=>fetchPublicAuthorActivityPage(contributorId,{client:fixture({fail:true}).client}));
 const {client,calls}=fixture();await assert.rejects(()=>fetchPublicAuthorActivityPage("צבי",{client}));assert.equal(calls.length,0);
});

// An in-memory research_contributions table that really applies the filters the summary reader chains (eq, in, is, not, neq, or, order, limit, range).
// It answers what the production client would, so a removed filter changes the result - which the call-recording mock above cannot show.
function memoryClient(rows) {
 const make=(source)=>{let list=source.slice();const ops=[];
  const b={select(){return b;},
   eq(c,v){list=list.filter(r=>r[c]===v);return b;},neq(c,v){list=list.filter(r=>r[c]!==v);return b;},
   in(c,v){list=list.filter(r=>v.includes(r[c]));return b;},
   is(c,v){list=list.filter(r=>(r[c]??null)===v);return b;},
   not(c,op,v){if(op==="is")list=list.filter(r=>(r[c]??null)!==v);return b;},
   or(text){const m=/author_user_id\.in\.\(([^)]*)\),author_contributor_id\.in\.\(([^)]*)\)/.exec(text);
    if(m){const users=m[1].split(","),contributors=m[2].split(",");list=list.filter(r=>users.includes(r.author_user_id)||contributors.includes(r.author_contributor_id));}return b;},
   order(c,{ascending=true}={}){ops.push([c,ascending]);return b;},
   limit:async(n)=>({data:sorted().slice(0,n),error:null}),
   range:async(from,to)=>({data:sorted().slice(from,to+1),error:null,count:list.length}),
   then(resolve,reject){return Promise.resolve({data:sorted(),error:null}).then(resolve,reject);}};
  const sorted=()=>list.slice().sort((x,y)=>{for(const [c,asc] of ops){if(x[c]<y[c])return asc?-1:1;if(x[c]>y[c])return asc?1:-1;}return 0;});
  return b;};
 return {from(table){return make(table==="research_contributions"?rows:[]);}};
}
const row=(id,created_at,extra={})=>({id,author_contributor_id:REVIEWED_ESTHER_LINK.contributorId,author_user_id:null,body:"הודעה",reactions:{likes:1},created_at,status:"approved",origin:"community_2029",deleted_at:null,thread_hidden_at:null,...extra});
test("the summary of a reviewed writer ignores a deleted message and a hidden thread: first message, likes and activity days count visible messages only",async()=>{
 const client=memoryClient([
  row("deleted","2019-01-01T10:00:00Z",{deleted_at:"2019-02-01T00:00:00Z",reactions:{likes:50}}),
  row("hidden","2019-06-01T10:00:00Z",{thread_hidden_at:"2019-07-01T00:00:00Z",reactions:{likes:70}}),
  row("visible-1","2020-01-01T10:00:00Z"),
  row("visible-2","2020-01-03T10:00:00Z"),
 ]);
 const summary=await fetchCommunityAuthorSummary(REVIEWED_ESTHER_LINK.contributorId,{client});
 assert.equal(summary.firstAt,"2020-01-01T10:00:00Z","the earliest VISIBLE message, not the deleted one of 2019");
 assert.equal(summary.archiveLikes,2,"the likes of the deleted and hidden messages are not added");
 assert.equal(summary.publicActivity.activeDays,2);
 assert.equal(summary.publicActivity.lastPublicActivityAt,"2020-01-03T10:00:00Z");
});
test("the same data counts the deleted and the hidden message when the filters are not applied (the test can fail)",async()=>{
 // proof that the fixture is sensitive: reading the table directly without the two filters sees the earlier, deleted message
 const client=memoryClient([row("deleted","2019-01-01T10:00:00Z",{deleted_at:"2019-02-01T00:00:00Z"}),row("visible","2020-01-01T10:00:00Z")]);
 const all=await client.from("research_contributions").select().eq("status","approved").order("created_at",{ascending:true}).limit(1);
 assert.equal(all.data[0].id,"deleted");
 const filtered=await client.from("research_contributions").select().eq("status","approved").is("deleted_at",null).is("thread_hidden_at",null).order("created_at",{ascending:true}).limit(1);
 assert.equal(filtered.data[0].id,"visible");
});
test("Esther26 stays the public name of the reviewed owner for old and new posts, and the reviewed account and contributor stay one pair",()=>{
 const account=REVIEWED_ESTHER_LINK.accountId, contributor=REVIEWED_ESTHER_LINK.contributorId;
 assert.equal(VERIFIED_ARCHIVE_PROFILES[contributor].name,"Esther26");
 assert.equal(VERIFIED_ARCHIVE_PROFILES[`user:${account}`].name,"Esther26");
 assert.equal(VERIFIED_ARCHIVE_PROFILES[contributor].accountUserId,account,"the contributor profile points at the reviewed account");
 assert.equal(VERIFIED_ARCHIVE_PROFILES[`user:${account}`].accountUserId,account);
 const old=normalizeCommunityRow({id:"old",origin:"openweb",author_name:"Esther26",author_contributor_id:contributor,body:"הודעה",created_at:"2020-01-01T00:00:00Z"});
 const current=normalizeCommunityRow({id:"new",origin:"community_2029",author_name:"Esther Gem",author_user_id:account,body:"הודעה",created_at:"2026-11-01T00:00:00Z"});
 assert.equal(old.authorName,"Esther26");
 assert.equal(current.authorName,"Esther26");
});
