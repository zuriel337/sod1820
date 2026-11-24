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
  assert.match(ingest,/else \{\s*\/\/ Source provenance only/);
  assert.match(ingest,/giluiYomiQuotedParent\(m, src.channel\)/);
  assert.match(ingest,/from\("channel_update_group_proof"\)/);
  assert.match(ingest,/\.eq\("update_id", ins.data.id\)/);
  assert.match(ingest,/\.eq\("source_id", src.id\)/);
  assert.match(ingest,/\.eq\("channel", src\.channel\)/);
  assert.match(ingest,/\.eq\("ext_msg_id", msgId\)/);
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
test("ingest closes the intake marker of a text reply only, on its exact row, after the proof step", () => {
  const block = ingest.slice(ingest.indexOf("if (route.groupSource && !imageUrl) {"), ingest.indexOf("} else if (route.groupMedia"));
  assert.match(block, /if \(groupReplyPendingAdmission\(m, src\.channel\)\) \{/);
  const close = block.slice(block.indexOf("groupReplyPendingAdmission(m, src.channel)"));
  assert.match(close, /\.from\("channel_updates"\)\s*\.update\(\{ group_source_intake_public: false \}\)\s*\.eq\("id", ins\.data\.id\)\s*\.eq\("channel", src\.channel\)\s*\.eq\("ext_msg_id", msgId\)/);
  assert.ok(block.indexOf("record_channel_update_group_proof_v1") < block.indexOf("groupReplyPendingAdmission(m"), "the proof is recorded first (it needs the open marker)");
  assert.equal((ingest.match(/group_source_intake_public: false/g) || []).length, 1, "no other row is closed");
  assert.doesNotMatch(ingest, /group_source_intake_public: true\b(?!,)/, "nothing is opened");
});
