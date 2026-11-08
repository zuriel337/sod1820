// DEF-001 / DEF-001b source contract: the client must not depend on the objects the security migrations close, and the
// RPC call shape must match the SQL signature. (The behaviour itself is covered by tests/sql/def001*.sql.)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["node_modules", "dist"].includes(e.name)) walk(rel, out); } else if (/\.(js|jsx|mjs|ts)$/.test(e.name)) out.push(rel);
  }
  return out;
};

test("no shipped code calls resolve_visitor_email (the function is server-side only after DEF-001)", () => {
  const offenders = ["src", "api", "public-reading-deploy", "middleware.js", "server"].flatMap((d) => (fs.statSync(path.join(root, d)).isDirectory() ? walk(d) : [d]))
    .filter((f) => !f.endsWith(".test.js") && /resolve_visitor_email/.test(read(f)));
  assert.deepEqual(offenders, []);
});

test("push subscriptions are written through the RPCs first, with the SQL parameter names; the direct table path is a gated rollout-order fallback only", () => {
  // push.js (the module the UI imports) has no table access and no raw rpc call: everything goes through the store.
  const push = read("src/lib/push.js");
  assert.doesNotMatch(push, /\.from\(\s*["']push_subscriptions["']\s*\)/, "direct table access must stay out of push.js");
  assert.doesNotMatch(push, /\.rpc\(/, "push.js must not call RPCs itself");
  assert.match(push, /upsertPushSubscription\(\s*supabase\b/);
  assert.match(push, /deletePushSubscription\(\s*supabase\b/);

  const store = read("src/lib/pushSubscriptionStore.js");
  const sql = read("supabase/proposed/20261106121000_def001b_visitor_id_exposure_step1.sql");
  for (const param of ["p_endpoint", "p_p256dh", "p_auth", "p_topics", "p_user_agent", "p_visitor"]) {
    assert.match(store, new RegExp(`${param}\\s*:`), `the store must send ${param}`);
    assert.match(sql, new RegExp(`\\b${param}\\b`), `SQL must declare ${param}`);
  }
  assert.match(store, /rpc\(\s*["']push_subscription_upsert_v1["']/);
  assert.match(store, /rpc\(\s*["']push_subscription_delete_v1["']\s*,\s*\{\s*p_endpoint/);

  // The only table access in the shipped client is the previous release's write inside two helpers, each reachable solely
  // after the RPC answered "function not found" (A6; behaviour is proven in push-subscription-rollout-order.test.mjs).
  assert.equal((store.match(/\.from\(\s*["']push_subscriptions["']\s*\)/g) || []).length, 2, "exactly two direct table statements (upsert, delete)");
  for (const [rpc, fallback] of [["push_subscription_upsert_v1", "tableUpsert"], ["push_subscription_delete_v1", "tableDelete"]]) {
    const gate = new RegExp(`rpc\\("${rpc}"[\\s\\S]*?if \\(!isRpcMissing\\(res\\)\\) return \\{[^\\n]*\\n\\s*return ${fallback}\\(client`);
    assert.match(store, gate, `${fallback} must only be reachable after isRpcMissing(res)`);
    assert.equal((store.match(new RegExp(`return ${fallback}\\(`, "g")) || []).length, 1, `${fallback} has a single call site`);
  }
});

test("no client code reads visitor_id from feedback or els_records", () => {
  for (const f of ["src", "api", "public-reading-deploy"].flatMap((d) => walk(d)).filter((x) => !/\.test\./.test(x))) {
    const text = read(f);
    for (const m of text.matchAll(/from\(\s*["'](feedback|els_records)["']\s*\)[\s\S]{0,400}?\.select\(([^)]*)\)/g)) {
      assert.doesNotMatch(m[2], /visitor_id|\*/, `${f}: ${m[1]} select must stay an explicit list without visitor_id`);
    }
  }
});

test("guest notification prefs UI never depends on an e-mail echoed back by the RPC", () => {
  for (const f of ["src/components/WatchButton.jsx", "src/components/community2029/CommunityPersonalActions2029.jsx"]) {
    assert.doesNotMatch(read(f), /prefs\??\.email/);
  }
});

test("DEF-001 migrations are not silently marked applied: they live in the migrations folder, the lockdown stays proposed", () => {
  assert.ok(fs.existsSync(path.join(root, "supabase/proposed/20261106120000_def001_revoke_resolve_visitor_email.sql")));
  assert.ok(fs.existsSync(path.join(root, "supabase/proposed/20261106121500_def001b_push_subscriptions_lockdown.sql")));
  assert.ok(!fs.existsSync(path.join(root, "supabase/migrations/20261106121500_def001b_push_subscriptions_lockdown.sql")));
});
