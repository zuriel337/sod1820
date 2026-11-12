import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/components/community2029/CommunityLive2029.jsx", import.meta.url), "utf8");
const lib = readFileSync(new URL("../src/lib/community/communityPresence.js", import.meta.url), "utf8");
const sql = readFileSync(new URL("../supabase/migrations/20261112100000_community_thread_bump_staff_v1.sql", import.meta.url), "utf8");

test("staff chip is wired to the public staff RPC and degrades to nothing", () => {
  assert.match(lib, /rpc\("community_staff_user_ids_v1"\)/);
  assert.match(lib, /if \(error \|\| !Array\.isArray\(data\)\) return \[\]/);
  assert.match(page, /staffIdsHolder\.current\.has\(accountId\)/);
  assert.match(page, /sod29-community-staff-chip[^>]*>צוות</);
});

test("thread bump only counts registered, approved, live replies and never reactions", () => {
  assert.match(sql, /new\.author_user_id is null/);
  assert.match(sql, /new\.status is distinct from 'approved'/);
  assert.match(sql, /new\.deleted_at is not null/);
  assert.doesNotMatch(sql, /set last_activity_at/);
});
