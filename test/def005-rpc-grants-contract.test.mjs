// DEF-005 guard: the proposed grants migration may only revoke functions that no client, middleware or public API calls.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
// Revised 12.11.2026 (M0): DEF-005 holds exactly the twelve system functions of the permissions map (§3.4-A). The other fifteen
// 6.11 names (the optional DEF-005b proposal) are NOT part of this package; they stay out until a separate decision.
// Revised 13.11.2026 (extraction): the file and its rollback work on the exact signatures; the signature lists must agree.
const APPLY = "supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql";
const ROLLBACK = "supabase/proposed/ROLLBACK_20261106131000_def005.sql";
const sigsIn = (file) => {
  const sql = fs.readFileSync(path.join(root, file), "utf8");
  const arrays = [...sql.matchAll(/array\s*\[([^\]]+)\]/g)].map((m) => [...m[1].matchAll(/'(public\.[a-z0-9_]+\([a-z0-9_, ]*\))'/g)].map((x) => x[1]));
  assert.equal(arrays.length, 1, `${file} has exactly one signature list`);
  return arrays[0];
};
const setA = sigsIn(APPLY).map((s) => s.replace(/^public\.|\(.*$/g, ""));
const MAP_SYSTEM_FUNCTIONS = ["fn_edge_grant_audit", "fn_rls_grant_audit", "check_security_spike", "snapshot_seo_wave", "fn_detect_patterns",
  "fn_detect_pattern_contradictions", "fn_scan_reeval", "fn_outbox_bump", "fn_raziel_claim", "fn_raziel_claims_gc", "ai_quota_check", "router_rate_check"];

const SCAN = ["src", "api", "public-reading-deploy", "server", "public", "middleware.js", "middleware-core.js"];
const walk = (p, out = []) => {
  const full = path.join(root, p);
  if (!fs.existsSync(full)) return out;
  const stat = fs.statSync(full);
  if (stat.isFile()) { if (/\.(js|jsx|mjs|ts|html)$/.test(p) && !/\.test\./.test(p)) out.push(p); return out; }
  for (const e of fs.readdirSync(full)) { if (e !== "node_modules" && e !== "dist") walk(path.join(p, e), out); }
  return out;
};
const files = SCAN.flatMap((p) => walk(p));
const callers = (name) => files.filter((f) => {
  const text = fs.readFileSync(path.join(root, f), "utf8");
  return new RegExp(`rpc\\(\\s*["'\`]${name}["'\`]|/rpc/${name}\\b`).test(text);
});

test("no DEF-005 (M0) function has a client / middleware / API caller", () => {
  const offenders = setA.filter((n) => callers(n).length).map((n) => `${n}: ${callers(n).join(", ")}`);
  assert.deepEqual(offenders, []);
});

test("DEF-005 is exactly the twelve system functions of the permissions map; DEF-005b is not part of the package", () => {
  assert.deepEqual([...setA].sort(), [...MAP_SYSTEM_FUNCTIONS].sort());
  assert.equal(fs.existsSync(path.join(root, "supabase/proposed/20261112132000_def005b_revoke_uncalled_client_rpcs_OPTIONAL.sql")), false);
});

test("apply and rollback hold the same twelve exact signatures, selected by signature and never by name (review findings F1/F2)", () => {
  const a = sigsIn(APPLY), r = sigsIn(ROLLBACK);
  assert.equal(a.length, 12);
  assert.deepEqual([...a].sort(), [...r].sort());
  assert.deepEqual(a.map((s) => s.replace(/^public\.|\(.*$/g, "")).sort(), [...MAP_SYSTEM_FUNCTIONS].sort());
  for (const f of [APPLY, ROLLBACK]) {
    const sql = fs.readFileSync(path.join(root, f), "utf8");
    assert.match(sql, /to_regprocedure\(/, `${f} resolves signatures`);
    assert.doesNotMatch(sql, /proname\s*=\s*any\s*\(\s*v_expected|proname\s+in\s*\(/, `${f} must not select the functions to change by name`);
  }
  assert.match(fs.readFileSync(path.join(root, APPLY), "utf8"), /unreviewed function\(s\) with a reviewed name/, "the apply refuses an unreviewed overload");
  assert.match(fs.readFileSync(path.join(root, ROLLBACK), "utf8"), /outside the reviewed set changed its ACL/, "the rollback proves it left other overloads alone");
});

test("the functions that must stay public are still called by shipped code, i.e. the list is real, not stale", () => {
  const kept = { ingest_event: 1, track_visit: 1, log_crawl: 1, log_edge: 1, log_security: 1, propose_community_word: 1, lang_link_add: 1, ai_signal: 1, increment_post_share: 1, add_wall_word: 1 };
  for (const n of Object.keys(kept)) assert.ok(callers(n).length > 0, `${n} should have a caller (if not, revisit the keep list)`);
  assert.ok(!setA.includes("fn_els_search"), "fn_els_search is used by an INVOKER function and must stay executable");
});
