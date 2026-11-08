// Deploy-order contract for client-called RPCs (A6). A frontend that calls an RPC which only exists as an UNAPPLIED proposal breaks
// the moment it is deployed before the SQL (this is how DEF-001b's push_subscription_*_v1 would have broken subscribe).
//
// Every `.rpc('<name>')` literal in shipped code must be accounted for exactly once:
//   1. defined by CREATE FUNCTION in supabase/migrations, or
//   2. listed in supabase/proposed/APPLY-BEFORE-DEPLOY.json -> apply_before_deploy (SQL still a proposal), or
//      known_missing_dormant (missing in the live schema, unreachable or not wired), or
//   3. listed in supabase/rpc-live-baseline.json (live, but created outside the repo migration history; frozen).
// New names cannot hide in the baseline when their SQL is a proposal: see "a client RPC defined only in supabase/proposed".
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const readJson = (p) => JSON.parse(read(p));

// Code that is deployed to users: the 2029 app, the serverless API, the public-reading build transport, the server helpers, middleware.
// Scripts, tests and supabase/functions are not part of the frontend rollout and are out of scope.
const SHIPPED = ["src", "api", "public-reading-deploy", "server", "middleware.js"];
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["node_modules", "dist"].includes(e.name)) walk(rel, out); }
    else if (/\.(js|jsx|mjs|ts|tsx)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(rel);
  }
  return out;
};
const shippedFiles = () => SHIPPED.filter((p) => fs.existsSync(path.join(root, p)))
  .flatMap((p) => (fs.statSync(path.join(root, p)).isDirectory() ? walk(p) : [p]));

// Static literals only: `.rpc("name"` and `.rpc(SOME_RPC_CONST` where the constant is a string literal. Calls routed through a
// generic helper (rpc(name, args) wrappers such as the community archive and message-action modules, the cardcom API helpers)
// are not visible to this scan; the names they pass must be verified by hand.
function clientRpcs() {
  const texts = new Map(shippedFiles().map((f) => [f, read(f)]));
  const consts = new Map();
  for (const t of texts.values()) for (const m of t.matchAll(/\b([A-Z][A-Z0-9_]*RPC[A-Z0-9_]*)\s*=\s*(["'`])([A-Za-z0-9_]+)\2/g)) consts.set(m[1], m[3]);
  const names = new Map();
  const add = (n, f) => { if (!names.has(n)) names.set(n, new Set()); names.get(n).add(f); };
  for (const [f, t] of texts) {
    for (const m of t.matchAll(/\.rpc\(\s*(["'`])([A-Za-z0-9_]+)\1/g)) add(m[2], f);
    for (const m of t.matchAll(/\.rpc\(\s*([A-Z][A-Z0-9_]*)\s*[,)]/g)) if (consts.has(m[1])) add(consts.get(m[1]), f);
  }
  return names;
}

const FUNCTION_DEF = /create\s+(?:or\s+replace\s+)?function\s+(?:"?public"?\.)?"?([A-Za-z0-9_]+)"?\s*\(/gi;
const definedIn = (files) => {
  const defs = new Set();
  for (const f of files) for (const m of read(f).matchAll(FUNCTION_DEF)) defs.add(m[1].toLowerCase());
  return defs;
};
const sqlFiles = (dir) => fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith(".sql")).map((f) => path.join(dir, f));

const manifest = readJson("supabase/proposed/APPLY-BEFORE-DEPLOY.json");
const baseline = readJson("supabase/rpc-live-baseline.json");
const migrationFns = definedIn(sqlFiles("supabase/migrations"));
const proposedFns = definedIn(sqlFiles("supabase/proposed"));
const applyBefore = new Map(manifest.apply_before_deploy.map((e) => [e.rpc, e]));
const dormant = new Map(manifest.known_missing_dormant.map((e) => [e.rpc, e]));
const live = new Set(baseline.rpcs);

test("the scan sees the calls it is meant to guard (sanity: it cannot pass by finding nothing)", () => {
  const names = clientRpcs();
  assert.ok(names.size > 250, `expected the shipped code to call 250+ RPCs, found ${names.size}`);
  assert.deepEqual([...names.get("push_subscription_upsert_v1") || []], ["src/lib/pushSubscriptionStore.js"]);
  assert.deepEqual([...names.get("push_subscription_delete_v1") || []], ["src/lib/pushSubscriptionStore.js"]);
  assert.ok(names.has("strongest_crossings"), "RPC names held in *_RPC constants must be resolved");
  assert.ok(migrationFns.size > 100 && migrationFns.has("els_search_v1"), "migration function scan must see the repo migrations");
});

test("every RPC the shipped client calls is defined in a migration or listed in a deploy-order manifest", () => {
  const unaccounted = [];
  for (const [name, files] of clientRpcs()) {
    if (migrationFns.has(name.toLowerCase()) || applyBefore.has(name) || dormant.has(name) || live.has(name)) continue;
    unaccounted.push(`${name}  (called from ${[...files].join(", ")})`);
  }
  assert.deepEqual(unaccounted, [], [
    "These RPCs are not defined in supabase/migrations and not in any manifest, so deploying this code could call a function that does not exist.",
    "  - SQL exists only as a proposal in supabase/proposed/  -> add it to supabase/proposed/APPLY-BEFORE-DEPLOY.json (apply_before_deploy) and make the caller degrade when the RPC answers PGRST202/404.",
    "  - SQL is not written yet                              -> write it (migration or proposal) before calling it from shipped code.",
    "  - the function is already live                        -> add its CREATE FUNCTION to supabase/migrations; do not extend supabase/rpc-live-baseline.json (frozen).",
  ].join("\n"));
});

test("a client RPC defined only in supabase/proposed must be in apply_before_deploy (the baseline cannot hide an unapplied proposal)", () => {
  const hidden = [];
  for (const name of clientRpcs().keys()) {
    const n = name.toLowerCase();
    if (proposedFns.has(n) && !migrationFns.has(n) && !applyBefore.has(name)) hidden.push(name);
  }
  assert.deepEqual(hidden, []);
});

test("apply_before_deploy entries point at a real proposal, a real caller and a tested degradation", () => {
  assert.ok(applyBefore.size >= 2 && applyBefore.size === manifest.apply_before_deploy.length, "rpc names in apply_before_deploy must be unique");
  const names = clientRpcs();
  for (const e of manifest.apply_before_deploy) {
    assert.match(e.sql, /^supabase\/proposed\/[\w.]+\.sql$/, `${e.rpc}: sql must be a file under supabase/proposed`);
    assert.ok(fs.existsSync(path.join(root, e.sql)), `${e.rpc}: ${e.sql} does not exist (was the proposal moved to supabase/migrations? then delete this entry)`);
    assert.ok(definedIn([e.sql]).has(e.rpc.toLowerCase()), `${e.rpc}: ${e.sql} does not CREATE FUNCTION ${e.rpc}`);
    assert.ok(!migrationFns.has(e.rpc.toLowerCase()), `${e.rpc} is already defined in supabase/migrations: remove it from apply_before_deploy`);
    assert.ok(e.rollback_sql && fs.existsSync(path.join(root, e.rollback_sql)), `${e.rpc}: rollback_sql must exist`);
    assert.ok(Array.isArray(e.callers) && e.callers.length > 0, `${e.rpc}: callers required`);
    for (const c of e.callers) assert.ok(names.get(e.rpc)?.has(c), `${e.rpc}: ${c} does not call it as .rpc("${e.rpc}")`);
    assert.ok(["degrades_gracefully", "breaks_until_applied"].includes(e.deployed_before_sql), `${e.rpc}: deployed_before_sql must be declared`);
    if (e.deployed_before_sql === "degrades_gracefully") {
      assert.ok(e.degradation_test && fs.existsSync(path.join(root, e.degradation_test)), `${e.rpc}: degradation_test must exist`);
      assert.ok(read(e.degradation_test).includes(e.rpc), `${e.rpc}: degradation_test must exercise this RPC`);
      for (const c of e.callers) assert.match(read(c), /PGRST202/, `${c} must handle "function not found" (PGRST202) for ${e.rpc}`);
    }
  }
});

test("the push lockdown stays last: the manifest names the step order and the lockdown file stays a proposal", () => {
  assert.equal(manifest.rollout_order.length, 3);
  assert.match(manifest.rollout_order[2], /20261106121500_def001b_push_subscriptions_lockdown\.sql/);
  assert.ok(fs.existsSync(path.join(root, "supabase/proposed/20261106121500_def001b_push_subscriptions_lockdown.sql")));
  assert.ok(!fs.existsSync(path.join(root, "supabase/migrations/20261106121500_def001b_push_subscriptions_lockdown.sql")));
});

test("known_missing_dormant entries carry a reason and a caller; the live baseline is frozen, sorted and disjoint from the manifest", () => {
  for (const e of manifest.known_missing_dormant) {
    assert.ok(typeof e.reason === "string" && e.reason.length >= 40, `${e.rpc}: a concrete reason is required`);
    assert.ok(Array.isArray(e.callers) && e.callers.length > 0, `${e.rpc}: callers required`);
    assert.ok(!applyBefore.has(e.rpc), `${e.rpc} cannot be both apply_before_deploy and dormant`);
  }
  assert.equal(dormant.size, manifest.known_missing_dormant.length, "rpc names in known_missing_dormant must be unique");
  assert.deepEqual(baseline.rpcs, [...new Set(baseline.rpcs)].sort(), "baseline must be sorted and unique");
  for (const n of baseline.rpcs) {
    assert.ok(!applyBefore.has(n) && !dormant.has(n), `${n} is listed in the baseline and in the manifest`);
    assert.ok(!proposedFns.has(n.toLowerCase()) || migrationFns.has(n.toLowerCase()), `${n}: a function defined only as an unapplied proposal is not live; it cannot be in the baseline`);
  }
  assert.equal(baseline.verified_against_live.project, "linswmnnkjxvweumprav");
});

test("stale manifest entries are reported (diagnostic only; they never hide a call)", (t) => {
  const names = clientRpcs();
  const stale = [];
  for (const n of baseline.rpcs) {
    if (!names.has(n)) stale.push(`baseline ${n}: no longer called by shipped code`);
    else if (migrationFns.has(n.toLowerCase())) stale.push(`baseline ${n}: now defined in supabase/migrations`);
  }
  for (const e of manifest.known_missing_dormant) if (!names.has(e.rpc)) stale.push(`dormant ${e.rpc}: no longer called by shipped code`);
  t.diagnostic(stale.length ? `stale entries (safe to delete): ${stale.join("; ")}` : "no stale entries");
});
