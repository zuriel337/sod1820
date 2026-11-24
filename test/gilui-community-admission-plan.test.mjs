import test from "node:test";
import assert from "node:assert/strict";
import { planGiluiCommunitySource as plan } from "../supabase/functions/_shared/giluiCommunityAdmissionPlan.mjs";

const S="5ef157d9-cf90-4c9a-bc73-7aa58b512a0b";
const U="9594ec7d-159d-4148-ad6d-0371ffca8282";
const ROOT="0cb16c0a-de99-5d71-bb45-b7211d18af2e";
const ID="3EB08D930163C190D132FB", QUOTED="3EB068CF39A93ABC19D7CE";
const src={source:"auto",channel:"gilui-yomi",id:S,ext_msg_id:ID,group_source_intake_public:true,body:"Original author text",safePublicBody:true};
const proof={update_id:S,ext_msg_id:ID,channel:"gilui-yomi",incoming:true,identity_basis:"verified_phone_unique",identity_contributor_id:U,held_at:null,group_chat_id:"group@g.us"};
const writer={id:U,active:true,locked:false,building:false,visibility:"public",editoriallyApproved:true};
const evalPlan=(changes={})=>plan({source:src,proof,writer,...changes});

test("verified group writer creates candidate root, not publication",()=>{
  assert.deepEqual(evalPlan(),{state:"candidate_root",reason:"source_reviewed",sourceRef:`channel_updates:${S}`,parentRef:null});
});
test("quoted parent requires the exact proved same-group community parent",()=>{
 const source={...src,quoted_parent_ext_msg_id:QUOTED};
 assert.equal(evalPlan({source}).reason,"parent_not_proven");
 assert.deepEqual(evalPlan({source,parent:{group_chat_id:proof.group_chat_id,community_id:ROOT,publiclyAdmitted:true,cycleSafe:true}}),{
  state:"candidate_reply",reason:"parent_proven",sourceRef:`channel_updates:${S}`,parentRef:ROOT});
 for(const parent of [{group_chat_id:"other@g.us",community_id:ROOT,publiclyAdmitted:true,cycleSafe:true},
    {group_chat_id:proof.group_chat_id,community_id:ROOT,publiclyAdmitted:false,cycleSafe:true},
    {group_chat_id:proof.group_chat_id,community_id:ROOT,publiclyAdmitted:true,cycleSafe:false}])
   assert.equal(evalPlan({source,parent}).state,"held");
});
test("unverified author, spoofed identity, held source never publish",()=>{
 const variants=[
 {proof:{...proof,identity_basis:"unverified",identity_contributor_id:null}},
 {proof:{...proof,identity_contributor_id:ROOT}},
 {proof:{...proof,held_at:"2026-11-23T00:00:00Z"}},
 {proof:{...proof,incoming:false}},
 {proof:{...proof,group_chat_id:"other@g.us"},writer:{...writer,editoriallyApproved:false}},
 {writer:{...writer,active:false}},
 {writer:{...writer,editoriallyApproved:false}},
 {source:{...src,safePublicBody:false}},
 {source:{...src,channel:"sod-hachashmal"}},
 ];
 for(const variant of variants)assert.equal(evalPlan(variant).state,"held");
});
test("existing published source avoids duplicate",()=>{
 const x=evalPlan({existing:{sameSource:true}});
 assert.equal(x.state,"existing");
 assert.equal(x.reason,"already_imported");
});
test("verified Zion email is a candidate only with exact user/source binding",()=>{
 const email={source:"resend",channel:"gilui-yomi",id:S,inbound_email_id:113,verified_webhook:true,
    senderMatchesContributor:true,contributor_id:U,body:"Content",safePublicBody:true};
 assert.equal(evalPlan({source:email}).state,"candidate_root");
 assert.equal(evalPlan({source:{...email,senderMatchesContributor:false}}).state,"held");
 assert.equal(evalPlan({source:{...email,verified_webhook:false}}).state,"held");
});
