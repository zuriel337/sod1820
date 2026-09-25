import assert from "node:assert/strict";
import fs from "node:fs";

const uniq = fs.readFileSync(
  "supabase/migrations/20260925140500_g3_account_person_uniqueness_v1.sql",
  "utf8",
);
const writers = fs.readFileSync(
  "supabase/migrations/20260925141000_g3_account_person_writer_lock_v1.sql",
  "utf8",
);
const backfill = fs.readFileSync(
  "supabase/migrations/20260925141500_g3_account_person_backfill_v1.sql",
  "utf8",
);

// One account -> at most one Person. NULL remains available for historical/anonymous Persons.
assert.match(uniq, /unique\s+index\s+if\s+not\s+exists\s+persons_account_user_id_unique/i);
assert.match(uniq, /\(account_user_id\)/i);
assert.match(uniq, /where\s+account_user_id\s+is\s+not\s+null/i);
assert.match(uniq, /having\s+count\(\*\)\s*>\s*1/i);
assert.match(uniq, /production.*concurrently/is);

// Self resolver: auth-owned only, same account lock namespace, deterministic reselect.
assert.match(writers, /create or replace function public\.fn_get_or_create_my_person\(\)/i);
assert.match(writers, /auth\.uid\(\)/i);
assert.match(writers, /hashtextextended\('person_account:'\s*\|\|\s*v_uid::text,\s*1820\)/i);
assert.match(writers, /where\s+p\.account_user_id\s*=\s*v_uid/i);
assert.match(writers, /order by\s+p\.created_at,\s*p\.person_id/i);

// Login bridge keeps its ownership gate and uses the byte-identical account lock key.
assert.match(writers, /p_user_id\s+is\s+distinct\s+from\s+auth\.uid\(\)/i);
assert.match(writers, /hashtextextended\('person_account:'\s*\|\|\s*p_user_id::text,\s*1820\)/i);
assert.match(writers, /v_person\s*:=\s*public\.resolve_person\(p_sod_id\)/i);
const resolvePos = writers.indexOf("v_person := public.resolve_person(p_sod_id)");
const accountLockPos = writers.indexOf("hashtextextended('person_account:' || p_user_id::text, 1820)");
const claimedPos = writers.indexOf("select (p.account_user_id is not null");
assert.ok(resolvePos >= 0 && accountLockPos > resolvePos, "login order must be resolve_person lock then account lock");
assert.ok(claimedPos > accountLockPos, "account lock must precede claimed/existing account decisions");

// Existing merge semantics stay bounded; no name/email inference or new identity store.
assert.match(writers, /update public\.identity_edges\s+set person_id = v_existing/is);
assert.match(writers, /delete from public\.persons\s+where person_id = v_old/is);
assert.doesNotMatch(writers, /display_name|email/i);
assert.doesNotMatch(writers, /create\s+table/i);

// Backfill covers ALL missing accounts, not just active accounts.
assert.match(backfill, /from\s+public\.users\s+u/i);
assert.match(backfill, /not\s+exists\s*\(\s*select\s+1\s+from\s+public\.persons/is);
assert.doesNotMatch(backfill, /where[^;]*(?:user_activity|research_contributions)[^;]*(?:exists|count)/is);
assert.match(backfill, /on\s+conflict\s*\(account_user_id\)\s+where\s+account_user_id\s+is\s+not\s+null\s+do\s+nothing/is);

// Account backfill is conservative about historical identity.
assert.match(backfill, /coalesce\(u\.created_at,\s*now\(\)\)\s+as\s+first_seen/i);
assert.match(backfill, /max\(ua\.created_at\)/i);
assert.match(backfill, /max\(rc\.created_at\)/i);
assert.doesNotMatch(backfill, /min\(rc\.created_at\)|min\(ua\.created_at\)/i);
assert.match(backfill, /'account_backfill_2029'/i);

// Account-only materialization never fabricates identity edges and never merges accounts.
assert.doesNotMatch(backfill, /identity_edges/i);
assert.doesNotMatch(backfill, /update\s+public\.persons/i);
assert.doesNotMatch(backfill, /delete\s+from/i);

console.log("account person completeness foundation: PASS");
