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

// torat-haremez (ZURIEL 24.11.2026): the same rules, and only Shimon Haimov and the site owner, proven by phone.
const SHIMON="c0459430-6ba0-44a9-b1be-b5952344e74d", OWNER="fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf", TZVI="c66f0464-0928-490e-be9b-66d8a87e7fc8";
const tSrc={...src,channel:"torat-haremez"};
const tProof=(id)=>({...proof,channel:"torat-haremez",identity_contributor_id:id});
const tWriter=(id)=>({...writer,id});
test("torat-haremez: Shimon and the site owner become candidates; any other verified member stays held",()=>{
  for (const id of [SHIMON,OWNER])
    assert.deepEqual(plan({source:tSrc,proof:tProof(id),writer:tWriter(id)}),{state:"candidate_root",reason:"source_reviewed",sourceRef:`channel_updates:${S}`,parentRef:null});
  for (const id of [TZVI,U]) assert.equal(plan({source:tSrc,proof:tProof(id),writer:tWriter(id)}).reason,"writer_not_in_group_allowlist");
});
test("torat-haremez: a reply joins only a proven, published parent from the same group",()=>{
  const source={...tSrc,quoted_parent_ext_msg_id:QUOTED};
  const parent={group_chat_id:proof.group_chat_id,community_id:ROOT,publiclyAdmitted:true,cycleSafe:true};
  assert.equal(plan({source,proof:tProof(SHIMON),writer:tWriter(SHIMON)}).reason,"parent_not_proven");
  assert.deepEqual(plan({source,proof:tProof(SHIMON),writer:tWriter(SHIMON),parent}),{state:"candidate_reply",reason:"parent_proven",sourceRef:`channel_updates:${S}`,parentRef:ROOT});
  assert.equal(plan({source,proof:tProof(SHIMON),writer:tWriter(SHIMON),parent:{...parent,group_chat_id:"other@g.us"}}).state,"held");
});
test("torat-haremez: no unverified identity, no name-only credit, no proof from another group, no email path",()=>{
  assert.equal(plan({source:tSrc,proof:{...tProof(SHIMON),identity_basis:"unverified",identity_contributor_id:null},writer:tWriter(SHIMON)}).state,"held");
  assert.equal(plan({source:tSrc,proof:{...tProof(SHIMON),channel:"gilui-yomi"},writer:tWriter(SHIMON)}).reason,"unverified_group_proof");
  assert.equal(plan({source:tSrc,proof:tProof(SHIMON),writer:tWriter(OWNER)}).reason,"writer_identity_mismatch");
  const email={source:"resend",channel:"torat-haremez",id:S,inbound_email_id:113,verified_webhook:true,senderMatchesContributor:true,contributor_id:SHIMON,body:"x",safePublicBody:true};
  assert.equal(plan({source:email,writer:tWriter(SHIMON)}).reason,"unknown_source_type");
});
