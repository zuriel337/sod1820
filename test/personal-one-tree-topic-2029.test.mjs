import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const MIGRATION = path.join(
  ROOT,
  "supabase/migrations/20261026130000_personal_one_tree_topic_branch_v1.sql",
);
const TOPIC_READER = path.join(ROOT, "src/lib/research/topicConvergence.js");

const sql = fs.readFileSync(MIGRATION, "utf8");
const reader = fs.readFileSync(TOPIC_READER, "utf8");

test("personal Topic access is owner-bound and public projections fail closed", () => {
  assert.match(sql, /add column if not exists access_scope text not null default 'public'/i);
  assert.match(sql, /access_scope in \('public', 'person_only'\)/i);
  assert.match(sql, /access_scope = 'person_only' and owner_person_id is not null/i);
  assert.match(sql, /p\.account_user_id = \(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(sql, /fn_current_user_owns_person_ref\([^)]*account_user/i);

  const publicView = sql.slice(
    sql.indexOf("create or replace view public.topic_cards_public"),
    sql.indexOf("alter view public.topic_cards_public owner"),
  );
  assert.match(publicView, /t\.access_scope = 'public'/i);
  assert.match(publicView, /t\.status = 'approved'/i);
  assert.match(publicView, /_do_not_publish/i);

  assert.match(sql, /revoke all on function public\.my_personal_topic_cards_2029\(text\[\]\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.my_personal_topic_cards_2029\(text\[\]\) to authenticated/i);
  assert.doesNotMatch(sql, /my_personal_topic_cards_2029\([^)]*user/i);
});

test("888/Yeshua remains in the canonical tree but is private, inactive and attributed", () => {
  assert.match(sql, /where slug = '888-yeshua'/i);
  assert.match(sql, /set status = 'draft'/i);
  assert.match(sql, /access_scope = 'person_only'/i);
  assert.match(sql, /'writer', 'עמית בליז'/);
  assert.match(sql, /'source', 'הכתב עמית בליז'/);
  assert.match(sql, /'canonical_contributor_slug', 'amit-mike-rob'/);
  assert.match(sql, /'attribution_is_not_verification', true/i);
  assert.match(sql, /set is_active = false/i);
  assert.match(sql, /jsonb_build_object\('space', 'private', 'access', v_access\)/i);
  assert.match(sql, /'attributed_to'/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.topic_cards/i);
});

test("personal research keeps candidate/verification truth and is excluded from general readers", () => {
  assert.match(sql, /meta #>> '\{ext,personal_scope,scope\}' = 'person_only'/i);
  assert.match(sql, /privacy_scope = 'private'/i);
  const researchSeed = sql.slice(
    sql.indexOf("update public.research_objects r"),
    sql.indexOf("get diagnostics v_research_count"),
  );
  assert.doesNotMatch(researchSeed, /status\s*=/i);
  assert.doesNotMatch(researchSeed, /engine_verified\s*=/i);
  assert.match(sql, /v_research_count <> 4/i);
  assert.match(sql, /coalesce\(meta #>> '\{ext,personal_scope,scope\}', ''\) <> 'person_only'/i);
});

test("Topic→Graph sync and public number_map cannot reopen the personal branch", () => {
  assert.match(sql, /c\.status = 'approved' and c\.access_scope = 'public'/i);
  assert.match(sql, /when c\.access_scope = 'person_only' then 'private'/i);
  assert.match(sql, /values\(v_node, num_node, 'contains', jsonb_build_object\('space', v_space\) \|\| v_access\)/i);

  const numberMap = sql.slice(
    sql.indexOf("create or replace function public.number_map"),
    sql.indexOf("create or replace function public.sync_convergence"),
  );
  assert.match(numberMap, /fn_graph_space_is_public\(e\.metadata\)/i);
  assert.match(numberMap, /fn_graph_space_is_public\(n2\.metadata\)/i);
});

test("SECURITY DEFINER number dossier applies the same owner gate", () => {
  const dossier = sql.slice(
    sql.indexOf("create or replace function public.fn_number_dossier"),
    sql.indexOf("create or replace function public.number_map"),
  );
  assert.match(dossier, /from public\.topic_cards tc/i);
  assert.match(dossier, /tc\.access_scope = 'person_only'[\s\S]*fn_current_user_owns_person_ref\(tc\.owner_person_id::text\)/i);
  assert.match(dossier, /from public\.topic_cards_public/i);
  assert.doesNotMatch(dossier, /from public\.topic_cards,\s*unnest/i);
});

test("2029 client remains public-first and uses only the owner RPC as fallback", () => {
  const publicRead = reader.indexOf('.from("topic_cards_public")');
  const personalRead = reader.indexOf("supabase.rpc(PERSONAL_TOPIC_RPC");
  assert.ok(publicRead >= 0 && personalRead > publicRead);
  assert.match(reader, /const PERSONAL_TOPIC_RPC = "my_personal_topic_cards_2029"/);
  assert.match(reader, /p_slugs: candidates/);
  assert.doesNotMatch(reader, /owner_person_id\s*:/);
  assert.match(reader, /tier: card\?\.access_scope === "person_only" \? "personal" : null/);
});
