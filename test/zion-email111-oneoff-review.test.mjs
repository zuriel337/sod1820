import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/proposed/20261121_zion_email111_community_oneoff_REVIEW_ONLY.sql",import.meta.url),"utf8");

test("the one-off import is not a new engine or cron and pins exact authentic source",()=>{
  assert.match(sql,/source_id constant bigint := 111/);
  assert.match(sql,/writer_id constant uuid := '9594ec7d-159d-4148-ad6d-0371ffca8282'/);
  assert.match(sql,/expected_body_hash constant text := 'dba3630ebc8b9b2003d6abbb34d41f0d'/);
  assert.match(sql,/expected_subject_hash constant text := '6a9687d86d6be756cf25bf7c5855847c'/);
  assert.match(sql,/expected_message_id_hash constant text := '1935cc3e5a59405373b60b697b5c2f3e'/);
  assert.match(sql,/m\.meta->>'provider'.*'resend'/);
  assert.match(sql,/m\.meta->>'verified_webhook'.*'true'/);
  assert.match(sql,/lower\(btrim\(coalesce\(m\.from_email,''\)\)\) <> lower\(btrim\(coalesce\(c\.email,''\)\)\)/);
  assert.match(sql,/m\.in_reply_to IS NOT NULL/);
  assert.match(sql,/coalesce\(c\.dossier_settings->>'visibility','public'\) <> 'public'/);
});
test("publication uses EXISTING canonical author and public community thread",()=>{
  assert.match(sql,/INSERT INTO public\.research_contributions/);
  assert.match(sql,/INSERT INTO public\.channel_updates/);
  assert.match(sql,/INSERT INTO public\.decision_ledger/);
  assert.match(sql,/writer_id,c\.display_name,'community_2029','approved'/);
  assert.match(sql,/'home','community',NULL,left\(btrim\(m\.subject\),160\)/);
  assert.match(sql,/m\.body_text,m\.received_at,new_at,new_at/);
  assert.match(sql,/'admin','gilui-yomi','live',false,new_at,card_href/);
  assert.match(sql,/source_body_md5/);
  assert.match(sql,/source_provider','resend'/);
  assert.doesNotMatch(sql,/create\s+(?:table|function|trigger)|drop\s+(?:table|function|trigger)|alter\s+table/i);
});
test("one-off stays idempotent, guards duplicates and keeps triggers intact",()=>{
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/SELECT \* INTO existing_ledger/);
  assert.match(sql,/IF FOUND THEN[\s\S]*RETURN; -- Exactly the previously approved one-off import/);
  assert.match(sql,/R\.author_contributor_id=writer_id/i);
  assert.match(sql,/md5\(coalesce\(r\.body,''\)\)=expected_body_hash/);
  assert.match(sql,/AND l\.evidence->>'inbound_email_id'=source_id::text/);
  assert.match(sql,/^BEGIN;/m);
  assert.match(sql,/^COMMIT;/m);
  assert.doesNotMatch(sql,/disable\s+trigger|enable\s+trigger|truncate|delete\s+from|update\s+public\./i);
});
test("public community title and text exclude source mailbox headers",()=>{
  assert.match(sql,/btrim\(m\.subject\)/);
  assert.match(sql,/coalesce\(m\.body_text,''\) ~\*/);
  assert.match(sql,/received_at',m.received_at/); // private receipt stores source time, not address
});
