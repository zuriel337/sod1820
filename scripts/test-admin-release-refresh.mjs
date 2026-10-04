import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildIdentity, releaseRelations, sameVersion, RELEASE_CONTRACT } from "../src/lib/admin/releaseProjection.js";
import { adminBuildMetadata } from "./admin-build-metadata.mjs";
import { createReleaseReader } from "../server/adminReleaseStatus.js";
import { createAdminReleaseHandler } from "../api/admin-release-status.js";
import { verifyAdmin } from "../api/vercel-insights.js";
import { createVisibleRefresh, dueRefreshKeys } from "../src/lib/admin/controlPlaneRefresh.js";
import { CANARY_STATUS_CONTEXT } from "./release-canary-gate.mjs";

const A = "a".repeat(40), B = "b".repeat(40), C = "c".repeat(40);
const at = "2026-10-04T03:00:00.000Z";
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const env = { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_SHA: A, VERCEL_GIT_COMMIT_REF: "feature/admin", VERCEL_API_TOKEN: "server-vercel-secret", GITHUB_TOKEN: "server-github-secret" };
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
function providers(options = {}) {
  const calls = [];
  const fetchImpl = async (url, args) => {
    calls.push({ url: String(url), args });
    assert.equal(args.method, "GET"); assert.equal(args.redirect, "error");
    if (String(url).includes("api.vercel.com")) return response({ project: { id: "prj_43q7k7QFAcWnin1tcBjce5xOi7Cq" }, target: "production", readyState: "READY", id: "dpl_example", meta: { githubCommitSha: B }, ...options.live }, options.liveStatus || 200);
    if (String(url).endsWith("branches/main")) return response({ commit: { sha: C } }, options.mainStatus || 200);
    if (String(url).includes("check-runs")) return response({ total_count: 0, check_runs: [], ...options.checks });
    if (String(url).includes("/statuses")) return response(options.statuses || [{ context: CANARY_STATUS_CONTEXT, state: "success", created_at: at }]);
    throw new Error("unexpected provider");
  };
  return { calls, fetchImpl };
}
function resMock() {
  return { code: null, body: null, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test("build metadata is a whitelist and version comparisons never infer unknown or newer from unequal SHA", () => {
  const identity = buildIdentity({ sha: A.toUpperCase(), branch: "feature", environment: "preview", builtAt: at, deploymentId: "dpl_good", secret: "hidden" });
  assert.equal(identity.sha, A); assert.equal(identity.secret, undefined);
  assert.equal(sameVersion(A, B), "different"); assert.equal(sameVersion(A, A), "same"); assert.equal(sameVersion(null, A), "unknown");
  assert.equal(buildIdentity({ sha: "main", branch: "bad\nbranch", environment: "random", deploymentId: "secret" }).sha, null);
  assert.equal(buildIdentity({ branch: "bad\nbranch" }).branch, null);
  const metadata = adminBuildMetadata({ ...env, VERCEL_API_TOKEN: "never client-side" }, at);
  assert.equal(metadata.sha, A); assert.equal(metadata.environment, "preview"); assert.equal(metadata.builtAt, at);
  assert.doesNotMatch(JSON.stringify(metadata), /server-vercel-secret|server-github-secret|never client-side/);
});
test("main and preview success do not become production proof; canary must target the exact live SHA", () => {
  const data = { identity: { sha: A }, main: { status: "ready", data: { sha: C } }, live: { status: "ready", data: { sha: B } }, canary: { status: "ready", data: { sha: A, state: "success" } } };
  assert.deepEqual(releaseRelations({ sha: A }, data), { browserServer: "same", mainLive: "different", serverLive: "different", liveVerification: "unknown" });
  data.canary.data.sha = B; assert.equal(releaseRelations({ sha: A }, data).liveVerification, "success");
  data.live.status = "unavailable"; assert.equal(releaseRelations({ sha: A }, data).mainLive, "unknown");
});
test("release endpoint rejects anonymous callers and writes before any provider read and stays no-store", async () => {
  let called = 0;
  const handler = createAdminReleaseHandler({ verify: async () => false, read: async () => { called++; }, env });
  const denied = resMock(); await handler({ method: "GET", query: {} }, denied);
  assert.equal(denied.code, 401); assert.equal(called, 0); assert.equal(denied.headers["Cache-Control"], "private, no-store");
  assert.match(denied.headers["X-Robots-Tag"], /noindex/);
  const write = resMock(); await handler({ method: "POST" }, write); assert.equal(write.code, 405); assert.equal(called, 0);
});
test("lightweight authorized version check never queries providers, and endpoint does not accept arbitrary lookup modes", async () => {
  let called = 0;
  const handler = createAdminReleaseHandler({ verify: async () => true, read: async () => { called++; return { contract: RELEASE_CONTRACT }; }, env });
  const out = resMock(); await handler({ method: "GET", query: { mode: "identity" } }, out);
  assert.equal(out.code, 200); assert.equal(out.body.identity.sha, A); assert.equal(called, 0);
  assert.doesNotMatch(JSON.stringify(out.body), /server-vercel-secret|server-github-secret/);
  const invalid = resMock(); await handler({ method: "GET", query: { mode: "https://example.invalid" } }, invalid);
  assert.equal(invalid.code, 400); assert.equal(called, 0);
});
test("existing server authorization requires verified Auth user and database admin role using the canonical public key", async () => {
  const expected = read("src/lib/supabase.js").match(/export const SUPABASE_ANON = '([^']+)'/)[1];
  let count = 0;
  assert.equal(await verifyAdmin({ headers: {} }, { fetchImpl: () => { count++; } }), false); assert.equal(count, 0);
  for (const role of ["member", "admin"]) {
    const calls = [];
    const okay = await verifyAdmin({ headers: { authorization: "Bearer user-access" } }, { fetchImpl: async (url, args) => {
      calls.push(url); assert.equal(args.headers.apikey, expected); assert.equal(args.headers.Authorization, "Bearer user-access");
      return response(url.includes("auth/v1/user") ? { id: "verified-user", user_metadata: { role: "admin" } } : [{ role }]);
    } });
    assert.equal(okay, role === "admin"); assert.equal(calls.length, 2);
  }
  assert.equal(await verifyAdmin({ headers: { authorization: "Bearer invalid" } }, { fetchImpl: async () => response({}, 401) }), false);
});
test("production identity is read from the actual alias, independently of main and current preview", async () => {
  const p = providers(); const data = await createReleaseReader({ ...p, env, now: () => Date.parse(at) })();
  assert.equal(data.identity.sha, A); assert.equal(data.main.data.sha, C); assert.equal(data.live.data.sha, B); assert.equal(data.canary.data.sha, B);
  assert.ok(p.calls.find(c => c.url.includes(`/commits/${B}/statuses`)));
  assert.ok(p.calls.find(c => c.url.includes("/deployments/sod1820.co.il?")));
  assert.doesNotMatch(JSON.stringify(data), /server-vercel-secret|server-github-secret/);
});
test("a failed provider cannot erase other evidence or substitute main for an unavailable live alias", async () => {
  const p = providers({ mainStatus: 403 }); const data = await createReleaseReader({ ...p, env, now: () => Date.parse(at) })();
  assert.equal(data.main.status, "unavailable"); assert.equal(data.live.status, "ready"); assert.equal(data.checks.status, "ready");
  const disconnected = providers(); const missing = await createReleaseReader({ ...disconnected, env: { ...env, VERCEL_API_TOKEN: null }, now: () => Date.parse(at) })();
  assert.equal(missing.live.status, "unavailable"); assert.equal(missing.canary.status, "unavailable"); assert.equal(missing.main.data.sha, C);
  assert.equal(disconnected.calls.some(c => c.url.includes("/statuses")), false);
});
test("wrong project, non-production target and not-ready alias all fail closed", async () => {
  for (const live of [{ project: { id: "other" } }, { target: null }, { readyState: "BUILDING" }, { meta: { githubCommitSha: null } }]) {
    const p = providers({ live }); const data = await createReleaseReader({ ...p, env })();
    assert.equal(data.live.status, "unavailable"); assert.equal(data.canary.status, "unavailable");
  }
});
test("checks select latest rerun of the same app/name and retain partial coverage without foreign-SHA results", async () => {
  const check = (id, name, conclusion, head_sha = A) => ({ id, name, conclusion, head_sha, app: { id: 1 }, status: "completed" });
  const p = providers({ checks: { total_count: 101, check_runs: [check(1, "Gate", "success"), check(2, "Gate", "failure"), check(3, "Foreign", "success", B)] } });
  const data = await createReleaseReader({ ...p, env })();
  assert.equal(data.checks.data.checks.length, 1); assert.equal(data.checks.data.checks[0].conclusion, "failure"); assert.equal(data.checks.data.partial, true);
});
test("latest canonical canary failure is never replaced by older success or another context", async () => {
  const p = providers({ statuses: [{ context: CANARY_STATUS_CONTEXT, state: "success", created_at: "2026-10-03T00:00:00Z" },
    { context: CANARY_STATUS_CONTEXT, state: "failure", created_at: at }, { context: "different", state: "success", created_at: at }] });
  const data = await createReleaseReader({ ...p, env })(); assert.equal(data.canary.data.state, "failure");
});
test("provider cache coalesces concurrent reads and preserves observation time until expiration", async () => {
  let clock = Date.parse(at); const p = providers(); const reader = createReleaseReader({ ...p, env, now: () => clock });
  const [first, second] = await Promise.all([reader(), reader()]); assert.strictEqual(first, second); assert.equal(p.calls.length, 4);
  clock += 60000; assert.strictEqual(await reader(), first); assert.equal(p.calls.length, 4); assert.equal(first.generated_at, at);
  clock += 60000; const fresh = await reader(); assert.notEqual(fresh.generated_at, first.generated_at); assert.equal(p.calls.length, 8);
});
test("refresh eligibility is per-source, deduplicated, bounded by backoff and never overlaps a loading request", () => {
  const sources = { health: { status: "error" }, build: { status: "ready" }, worklog: { status: "loading" } };
  const attempts = { health: { at: 0, failures: 2 }, build: { at: 0, failures: 0 } };
  assert.deepEqual(dueRefreshKeys(["health", "build", "build", "worklog"], sources, attempts, 120000, 120000), ["build"]);
  assert.deepEqual(dueRefreshKeys(["health", "build"], sources, attempts, 480000, 120000), ["health", "build"]);
  attempts.health.failures = 50; assert.deepEqual(dueRefreshKeys(["health"], sources, attempts, 900000, 120000), ["health"]);
});
function refreshRig(run) {
  class Surface extends EventTarget {}
  const doc = new Surface(); doc.visibilityState = "visible";
  const win = new Surface(); win.navigator = { onLine: true };
  let next = 0; const timers = new Map(), states = [];
  const stop = createVisibleRefresh({ doc, win, intervalMs: 120000, run, onState: state => states.push(state),
    setTimer: fn => { timers.set(++next, fn); return next; }, clearTimer: id => timers.delete(id) });
  const tick = async () => { const [id, fn] = timers.entries().next().value || []; if (fn) { timers.delete(id); await fn(); } };
  const flush = () => new Promise(resolve => setImmediate(resolve));
  return { doc, win, timers, states, stop, tick, flush };
}
test("hidden and offline dashboards stop polling; foreground resume and disposal obey the same policy", async () => {
  let calls = 0; const r = refreshRig(async () => { calls++; });
  assert.equal(calls, 0); await r.tick(); assert.equal(calls, 1);
  r.doc.visibilityState = "hidden"; r.doc.dispatchEvent(new Event("visibilitychange")); assert.equal(r.timers.size, 0); assert.equal(r.states.at(-1), "paused");
  r.win.navigator.onLine = false; r.doc.visibilityState = "visible"; r.doc.dispatchEvent(new Event("visibilitychange")); assert.equal(r.states.at(-1), "offline"); assert.equal(calls, 1);
  r.win.navigator.onLine = true; r.win.dispatchEvent(new Event("online")); await r.flush(); assert.equal(calls, 2); assert.equal(r.timers.size, 1);
  r.stop(); r.win.dispatchEvent(new Event("online")); await r.flush(); assert.equal(calls, 2); assert.equal(r.timers.size, 0);
});
test("foreground event bursts never overlap an in-flight refresh or resurrect a disposed timer", async () => {
  let finish; let calls = 0; const r = refreshRig(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const tick = r.tick(); r.win.dispatchEvent(new Event("online")); r.doc.dispatchEvent(new Event("visibilitychange")); assert.equal(calls, 1);
  r.stop(); finish(); await tick; assert.equal(r.timers.size, 0);
});
test("release projection stays inside the existing guard/frame and read-only boundaries with automatic build wiring", () => {
  const page = read("src/pages/ControlPlane2029Page.jsx"), component = read("src/components/experience2029/AdminRelease2029.jsx"), readers = read("src/lib/admin/controlPlaneReads.js");
  assert.match(page, /if \(!isAdmin\) return <Navigate replace to="\/2029" \/>/); assert.match(page, /createVisibleRefresh/);
  assert.match(page, /requestIds\.current\[key\] !== id/); assert.match(page, /refreshAttempts\.current = \{\}/);
  assert.match(readers, /rpc\("get_work_log_current"\)\.select\("id,topic,status,created_at"\)/); assert.match(readers, /\.limit\(8\)/);
  assert.doesNotMatch(component, /\bfetch\s*\(|\.rpc\(|\.from\(|localStorage|createClient|service_role/);
  assert.match(read("vite.config.js"), /__SOD_ADMIN_BUILD__: JSON\.stringify\(adminBuildMetadata\(\)\)/);
  assert.doesNotMatch(read("server/adminReleaseStatus.js"), /method: "(?:POST|PATCH|DELETE)"|service_role/);
  const rewrite = JSON.parse(read("vercel.json")).rewrites.find(r => r.source === "/api/admin-release-status");
  assert.equal(rewrite.destination, "/api/admin-release-status");
});
