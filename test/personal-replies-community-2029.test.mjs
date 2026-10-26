import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the owner-only reader includes imported posts only through a canonical account edge", () => {
  const sql = read("supabase/migrations/20261026070000_replies_to_me_community_context_v1.sql");
  assert.match(sql, /c\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /a\.author_user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /edge\.legacy_id = 'contributor:' \|\| c\.id::text/);
  assert.match(sql, /person\.account_user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /coalesce\(r\.author_contributor_id in \(select id from my_contributors\), false\)/);
  assert.match(sql, /thread_root_id uuid/);
  assert.match(sql, /thread_path uuid\[\]/);
  assert.match(sql, /r\.origin/);
  assert.match(sql, /revoke all on function public\.replies_to_me\(integer, timestamptz\) from public, anon/);
  assert.doesNotMatch(sql, /display_name|author_name\s*=|email\s*=/i);
});

test("Replies to me describes both community and research and builds an exact community return", () => {
  const center = read("src/components/userCenter/UserCenter.jsx");
  assert.match(center, /אין עדיין תגובות לפוסטים או לתרומות שלך/);
  assert.match(center, /פוסט שפרסמת בקהילה/);
  assert.match(center, /חיבור מאומת של הפרופיל הישן לחשבון/);
  assert.match(center, /thread_root_id/);
  assert.match(center, /thread_path/);
  assert.match(center, /\/2029\?\$\{query\}/);
  assert.match(center, /הצ׳אט הוותיק/);
  assert.match(center, /מספר ומחקר/);
});

test("the community route uses the existing public readers for an exact old thread", () => {
  const archive = read("src/lib/community/communityArchive.js");
  const view = read("src/components/community2029/CommunityLive2029.jsx");
  assert.match(archive, /export async function fetchCommunityThread/);
  assert.match(archive, /\.eq\("status", "approved"\)[\s\S]*\.in\("origin", COMMUNITY_ORIGINS\)[\s\S]*\.is\("parent_id", null\)/);
  assert.match(archive, /export async function fetchCommunityReply/);
  assert.doesNotMatch(archive.slice(archive.indexOf("export async function fetchCommunityThread"), archive.indexOf("export async function fetchCommunityReplies")), /\.ilike\(|\.eq\("(?:display_name|author_name)"/);
  assert.match(view, /normalizeCommunityThreadFocus/);
  assert.match(view, /fetchCommunityThread\(threadFocus\.threadId\)/);
  assert.match(view, /focusPath=\{threadFocus\.path\}/);
  assert.match(view, /חזרה להודעות שלי/);
  assert.match(view, /לשרשור המלא/);
});
