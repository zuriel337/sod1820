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
  assert.equal(giluiYomiQuotedParent(msg,"torat-haremez"),null);
  assert.equal(giluiYomiQuotedText(msg,"torat-haremez"),"");
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
  assert.match(ingest,/\.eq\("channel", "gilui-yomi"\)/);
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
