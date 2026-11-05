import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const source = readFileSync("src/lib/supabase.js", "utf8");
const start = source.indexOf("const siteFlagPendingReads =");
const end = source.indexOf("// 🔥 המספרים החמים", start);
function reader() {
  const requests = [];
  const supabase = { from(table) {
    assert.equal(table, "site_flags");
    return { select(fields) {
      assert.equal(fields, "key,enabled,message,mode");
      return new Promise((resolve, reject) => requests.push({ resolve, reject }));
    } };
  } };
  const context = vm.createContext({ supabase });
  vm.runInContext(source.slice(start, end).replace("export async function", "async function"), context);
  return { read: context.getSiteFlags, requests };
}
const policy = (enabled) => ({ data: [{ key: "lock_world", enabled, mode: "all", message: "policy" }] });

test("concurrent 2029 projections share one pending public-policy request", async () => {
  const { read, requests } = reader();
  const calls = Array.from({ length: 12 }, () => read({ pendingScope: "anonymous:nav-a" }));
  assert.equal(requests.length, 1);
  requests[0].resolve(policy(true));
  for (const result of await Promise.all(calls)) assert.equal(result.lock_world.enabled, true);
});
test("settlement never caches policy: a later refresh observes a changed lock", async () => {
  const { read, requests } = reader();
  const first = read({ pendingScope: "anonymous:nav-a" });
  requests[0].resolve(policy(false));
  assert.equal((await first).lock_world.enabled, false);
  const refreshed = read({ pendingScope: "anonymous:nav-a" });
  assert.equal(requests.length, 2);
  requests[1].resolve(policy(true));
  assert.equal((await refreshed).lock_world.enabled, true);
});
test("navigation and principal boundaries cannot join an older pending response", async () => {
  const { read, requests } = reader();
  const a = read({ pendingScope: "anonymous:nav-a" });
  const b = read({ pendingScope: "anonymous:nav-b" });
  const c = read({ pendingScope: "account-b:nav-b" });
  assert.equal(requests.length, 3);
  requests[2].resolve(policy(true));
  requests[1].resolve(policy(true));
  requests[0].resolve(policy(false));
  assert.equal((await c).lock_world.enabled, true);
  assert.equal((await b).lock_world.enabled, true);
  assert.equal((await a).lock_world.enabled, false);
});
test("a rejected transport is released and the next call really retries", async () => {
  const { read, requests } = reader();
  const first = read({ pendingScope: "anonymous:nav-a" });
  requests[0].reject(new Error("synthetic offline"));
  assert.equal(Object.keys(await first).length, 0);
  const retry = read({ pendingScope: "anonymous:nav-a" });
  assert.equal(requests.length, 2);
  requests[1].resolve(policy(true));
  assert.equal((await retry).lock_world.enabled, true);
});
test("Legacy/no-scope callers retain independent reads with no shared snapshot", async () => {
  const { read, requests } = reader();
  const a = read(), b = read();
  assert.equal(requests.length, 2);
  requests.forEach((request) => request.resolve(policy(true)));
  await Promise.all([a, b]);
});
test("own-avatar wrapper admits the exact reviewed performance Preview only", () => {
  const code = readFileSync("preview-deploy/api/contributor-self.js", "utf8")
    .replace(/^import[^\n]+\n/, "")
    .replace("export default contributorSelfHandler", "globalThis.options = contributorSelfHandler");
  const branch = "gpt/2029-unified-performance-consolidation-20261031";
  for (const [ref, env, expected] of [[branch, "preview", true], [branch, "production", false], [branch + "-other", "preview", false], ["gpt/unreviewed", "preview", false]]) {
    const context = vm.createContext({ contributorSelfHandler: options => options, process: { env: { VERCEL_ENV: env, VERCEL_GIT_COMMIT_REF: ref } } });
    vm.runInContext(code, context);
    assert.equal(context.options.avatarUpdates, expected);
    assert.equal(context.options.previewReadOnly, true);
  }
});
