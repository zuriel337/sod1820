import test from "node:test";
import assert from "node:assert/strict";
import { fetchPublicAuthorActivityPage, fetchCommunityAuthorSummary, legacyLikeCount } from "./communityArchive.js";
const contributorId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
function fixture({fail=false}={}) {
 const calls=[];
 const rows=[{id:"message",author_contributor_id:contributorId,author_name:"שם קיים",body:"הודעה עם לייקים",reactions:{likes:12,"👍":["one","two"]},created_at:"2020-01-01T00:00:00Z",status:"approved",origin:"community_2029"}];
 const client={from(table){let fields;const b={select(value,opts){fields=value;calls.push({table,method:"select",value,opts});return b;},
  eq(...args){calls.push({table,method:"eq",args});return b;},neq(...args){calls.push({table,method:"neq",args});return b;},not(...args){calls.push({table,method:"not",args});return b;},in(...args){calls.push({table,method:"in",args});return b;},
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
});
test("failed and invalid existing author reads do not return fabricated empty activity",async()=>{
 await assert.rejects(()=>fetchPublicAuthorActivityPage(contributorId,{client:fixture({fail:true}).client}));
 const {client,calls}=fixture();await assert.rejects(()=>fetchPublicAuthorActivityPage("צבי",{client}));assert.equal(calls.length,0);
});
