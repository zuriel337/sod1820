import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const nav = fs.readFileSync("src/components/layout/Navbar.jsx", "utf8");
const map = fs.readFileSync("src/lib/knowledgeMap.js", "utf8");
const helper = fs.readFileSync("src/lib/analytics2029.js", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260919224500_g3_2029_analytics_one_tree_v1.sql", "utf8");
const fix = fs.readFileSync("supabase/migrations/20260919225200_g3_2029_analytics_one_tree_v1_uuid_fix.sql", "utf8");

test("legacy Navbar no longer promotes World", () => {
  assert.doesNotMatch(nav, /label:\s*"העולם"[^\n]*to:\s*"\/world"/);
  assert.doesNotMatch(nav, /l:\s*"העולם"[^\n]*to:\s*"\/world"/);
  const quick = map.slice(map.indexOf("export const QUICK_NAV_GROUPS"));
  assert.doesNotMatch(quick, /label:"העולם"[^\n]*to:"\/world"/);
});

test("Analytics 2029 is a projection over canonical telemetry and identity", () => {
  assert.match(migration, /from public\.events e/i);
  assert.match(migration, /public\.persons/i);
  assert.match(migration, /public\.users/i);
  assert.match(migration, /fn_ti_clean_classification/i);
  assert.match(migration, /engaged_ms/i);
  assert.match(migration, /internal_admin/i);
  assert.match(migration, /legacy_analytics_changed', false/i);
  assert.doesNotMatch(migration, /create\s+table/i);
  assert.doesNotMatch(migration, /alter\s+table/i);
  assert.match(fix, /max\(b\.person_id::text\)::uuid/);
  assert.match(fix, /max\(b\.account_user_id::text\)::uuid/);
});

test("2029 client adapter consumes only the new admin projection", () => {
  assert.match(helper, /admin_2029_analytics/);
  assert.match(helper, /INTERNAL_ADMIN/);
  assert.match(helper, /KNOWN_USER/);
  assert.match(helper, /ANONYMOUS/);
});
