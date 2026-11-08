// DEF-005 guard: the proposed grants migration may only revoke functions that no client, middleware or public API calls.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const sql = fs.readFileSync(path.join(root, "supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql"), "utf8");
const arrays = [...sql.matchAll(/array\s*\[([^\]]+)\]/g)].map((m) => [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]));
assert.equal(arrays.length, 2, "migration has Set A and Set B");
const [setA, setB] = arrays;

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

test("no revoked (Set A) function has a client / middleware / API caller", () => {
  const offenders = setA.filter((n) => callers(n).length).map((n) => `${n}: ${callers(n).join(", ")}`);
  assert.deepEqual(offenders, []);
});

test("Set B (anon-only revoke) has no anonymous caller in shipped code", () => {
  assert.deepEqual(setB.filter((n) => callers(n).length), []);
});

test("the functions that must stay public are still called by shipped code, i.e. the list is real, not stale", () => {
  const kept = { ingest_event: 1, track_visit: 1, log_crawl: 1, log_edge: 1, log_security: 1, propose_community_word: 1, lang_link_add: 1, ai_signal: 1, increment_post_share: 1, add_wall_word: 1 };
  for (const n of Object.keys(kept)) assert.ok(callers(n).length > 0, `${n} should have a caller (if not, revisit the keep list)`);
  assert.ok(!setA.includes("fn_els_search") && !setB.includes("fn_els_search"), "fn_els_search is used by an INVOKER function and must stay executable");
});
