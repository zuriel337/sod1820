import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { giluiYomiQuotedParent, giluiYomiQuotedText } from "../supabase/functions/_shared/giluiYomiQuotedParent.mjs";

const sql = readFileSync(new URL("../supabase/proposed/20261123_gilui_yomi_quoted_parent_proof_REVIEW_ONLY.sql", import.meta.url), "utf8");
const ingest = readFileSync(new URL("../supabase/functions/wa-channel-ingest/index.ts", import.meta.url), "utf8");
const A = "3EB08D930163C190D132FB", B = "3EB068CF39A93ABC19D7CE";

test("Green API quotedMessage parent is preserved exactly, never inferred", () => {
  const msg={ idMessage: A, typeMessage:"quotedMessage", extendedTextMessageData:{text:"תגובה",stanzaId:B}, quotedMessage:{stanzaId:B,participant:"972555123456@c.us"} };
  assert.equal(giluiYomiQuotedParent(msg,"gilui-yomi"),B);
  assert.equal(giluiYomiQuotedText(msg,"gilui-yomi"),"תגובה");
  // torat-haremez joined the same proof by ZURIEL's decision (24.11.2026); every other group stays closed.
  assert.equal(giluiYomiQuotedParent(msg,"torat-haremez"),B);
  assert.equal(giluiYomiQuotedText(msg,"torat-haremez"),"תגובה");
  for (const channel of ["blaze-888","or-geula","sod-hachashmal",""]) {
    assert.equal(giluiYomiQuotedParent(msg,channel),null,channel);
    assert.equal(giluiYomiQuotedText(msg,channel),"",channel);
  }
});
test("quote pointer fails closed for conflicting, malicious, absent, self or wrong source", () => {
  const base={idMessage:A};
  assert.equal(giluiYomiQuotedParent({...base,quotedMessage:{stanzaId:B},extendedTextMessageData:{stanzaId:A}},"gilui-yomi"),null);
  assert.equal(giluiYomiQuotedParent({...base,quotedMessage:{stanzaId:"not_valid/id"}},"gilui-yomi"),null);
  assert.equal(giluiYomiQuotedParent({...base,quotedMessage:{stanzaId:A}},"gilui-yomi"),null);
  assert.equal(giluiYomiQuotedParent({...base,quotedMessage:{participant:"972555123456@c.us"}},"gilui-yomi"),null);
  assert.equal(giluiYomiQuotedParent({...base,quotedMessage:{stanzaId:B}},"gilui-yomi"),B);
  assert.equal(giluiYomiQuotedParent({...base,quotedMessage:{stanzaId:B}},"blaze-888"),null);
  assert.equal(giluiYomiQuotedParent({...base,quotedMessage:{stanzaId:"3EB0\nDROP TABLE"}},"gilui-yomi"),null);
});
test("ingest adds only private source proof after existing validation, not Community writes", () => {
  assert.match(ingest,/record_channel_update_group_proof_v1/);
  assert.match(ingest,/record_channel_update_group_proof_v2/, "the reply proof and its parent are one server call (no separate provenance write)");
  assert.match(ingest,/giluiYomiQuotedParent\(m, src.channel\)/);
  assert.doesNotMatch(ingest,/\.from\("research_contributions"\)/);
  assert.doesNotMatch(ingest,/\.from\("posts"\)/);
});
test("proof proposal adds nullable field without opening new publication or historical imports", () => {
  assert.match(sql,/ALTER TABLE public.channel_update_group_proof/);
  assert.match(sql,/ADD COLUMN IF NOT EXISTS quoted_parent_ext_msg_id text/);
  assert.match(sql,/CHECK \(quoted_parent_ext_msg_id IS NULL OR/);
  assert.doesNotMatch(sql,/\bGRANT\b|\bCREATE\s+TABLE\b|\bINSERT\s+INTO\b|\bUPDATE\s+public\.|\bDELETE\s+FROM\b/i);
});

// Option 2 (ZURIEL 24.11.2026): replies are ingested with proof and quoted parent, but stay private until Community admission.
import { groupReplyPendingAdmission } from "../supabase/functions/_shared/giluiYomiQuotedParent.mjs";
test("a group reply is recognized for both groups, fail closed; plain messages and other groups are not replies", () => {
  const reply = { idMessage: A, typeMessage: "quotedMessage", extendedTextMessageData: { text: "תגובה", stanzaId: B } };
  for (const channel of ["gilui-yomi", "torat-haremez"]) {
    assert.equal(groupReplyPendingAdmission(reply, channel), true, channel);
    assert.equal(groupReplyPendingAdmission({ ...reply, extendedTextMessageData: { text: "x", stanzaId: "bad/id" } }, channel), true, "invalid parent id is still a reply");
    assert.equal(groupReplyPendingAdmission({ idMessage: A, typeMessage: "textMessage", textMessage: "שורש" }, channel), false, "a new message is not a reply");
  }
  for (const channel of ["blaze-888", "or-geula", ""]) assert.equal(groupReplyPendingAdmission(reply, channel), false, channel);
});
test("a reply is private from its first write: inserted closed, proven in one call, never opened or updated later", () => {
  // the reply decision is made before the insert, and the insert itself closes the marker for a reply
  assert.ok(ingest.indexOf("const groupReply = groupReplyPendingAdmission(m, src.channel);") < ingest.indexOf('sb.from("channel_updates").insert('));
  assert.match(ingest, /group_source_intake_public: groupReply \? false : waGroupIntakePublic\(route, imageUrl\),/);
  // one server call carries identity proof and quoted parent; no later write to the proof or to the marker
  const block = ingest.slice(ingest.indexOf("if (route.groupSource && !imageUrl) {"), ingest.indexOf("} else if (route.groupMedia"));
  assert.match(block, /groupReply\s*\?\s*await sb\.rpc\("record_channel_update_group_proof_v2", \{[\s\S]*?p_quoted_parent_ext_msg_id: giluiYomiQuotedParent\(m, src\.channel\),/);
  assert.match(block, /:\s*await sb\.rpc\("record_channel_update_group_proof_v1", \{/, "non-replies keep v1");
  assert.doesNotMatch(ingest, /\.from\("channel_update_group_proof"\)/, "no separate proof write");
  assert.doesNotMatch(ingest, /\.update\(\{ group_source_intake_public/, "the marker is never changed after insert");
  // a media reply never reaches the public media path
  assert.match(ingest, /\} else if \(route\.groupMedia && route\.kind && waIsPrivateMediaRef\(imageUrl\) && keep\.media && !groupReply\) \{/);
  assert.doesNotMatch(ingest, /group_source_intake_public: true/);
});
