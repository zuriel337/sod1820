// G3_RELIABILITY_PRECLOSE — focused contract + behaviour tests.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  createRuntimeErrorCapture, RUNTIME_ERROR_LIMITS, installRuntimeErrorCapture, getSharedCapture,
  sanitizeText, sanitizeRoute, buildIncidentMeta, _resetSharedCaptureForTests,
} from "../src/lib/runtimeErrorCapture.js";
import { runCanary, reportCanary, takeSlot } from "../scripts/post-deploy-canary.mjs";
import { checkGate } from "../scripts/release-canary-gate.mjs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const SHA = "a".repeat(40);
const ENV = { SUPABASE_SERVICE_KEY: "k", GITHUB_RUN_ID: "42", GITHUB_REPOSITORY: "zuriel337/sod1820" };

test("capture: dedupe, per-minute and per-session caps, never throws", () => {
  const got = []; let t = 1_000_000;
  const cap = createRuntimeErrorCapture((k, m) => got.push([k, m]), () => t);
  assert.equal(cap("window_error", "boom", { source: "a.js" }), true);
  assert.equal(cap("window_error", "boom", { source: "a.js" }), false);
  assert.equal(cap("window_error", "ResizeObserver loop limit exceeded"), false);
  cap("window_error", "e2"); cap("window_error", "e3");
  assert.equal(cap("window_error", "e4"), false, "per-minute cap");
  t += 61000;
  assert.equal(cap("window_error", "e4"), true);
  const many = []; let t2 = 0;
  const c2 = createRuntimeErrorCapture((k, m) => many.push(m), () => (t2 += 61000));
  for (let i = 0; i < 50; i++) c2("unhandled_rejection", "m" + i);
  assert.equal(many.length, RUNTIME_ERROR_LIMITS.perSession);
  assert.doesNotThrow(() => createRuntimeErrorCapture(() => { throw new Error("x"); })("window_error", "y"));
});

test("privacy: query/hash, emails, tokens, long numbers never leave the browser", () => {
  assert.equal(sanitizeRoute("https://sod1820.co.il/number/1237?email=a@b.com#x"), "/number/1237");
  assert.equal(sanitizeRoute("/p?q=secret"), "/p");
  const t = sanitizeText("fail https://x.co/a?token=abc mail me@x.com jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijkl id 1234567890 page?k=v&u=1");
  assert.ok(!/me@x|token=|eyJ|1234567890|k=v/.test(t), t);
  const m = buildIncidentMeta("e", { name: "N", source: "https://x/y.js?a=1", line: 3, evil: "PRIVATE", user: { email: "a@b.c" } });
  assert.deepEqual(Object.keys(m).sort(), ["line", "message", "name", "source"], "allowlist only");
  assert.equal(m.source, "/y.js");
  assert.ok(sanitizeText("x".repeat(5000)).length <= 240);
  assert.ok(buildIncidentMeta("e", { component_stack: "at A (https://x/y?z=1) ".repeat(200) }).component_stack.length <= 600);
});

test("one incident tree: window.error + unhandledrejection + ErrorBoundary share one capture and one surface", () => {
  _resetSharedCaptureForTests();
  const l = {}; const win = { location: { pathname: "/p", search: "?secret=1" }, addEventListener: (n, f) => { l[n] = f; } };
  const sent = [];
  const report = (...a) => sent.push(a);
  assert.equal(installRuntimeErrorCapture(report, win), true);
  assert.equal(installRuntimeErrorCapture(() => {}, win), false, "idempotent");
  l.error({ message: "bad", filename: "https://x/a.js?u=1", lineno: 1, colno: 2, error: new TypeError("bad") });
  l.error({ target: {} });
  l.unhandledrejection({ reason: new Error("rej") });
  getSharedCapture(report, win)("error_boundary", "boundary boom", { name: "Error", component_stack: "at X" });
  assert.deepEqual(sent.map((s) => [s[0], s[1], s[2]]),
    [["runtime_error", "/p", "window_error"], ["runtime_error", "/p", "unhandled_rejection"], ["runtime_error", "/p", "error_boundary"]]);
  assert.ok(sent.every((s) => !JSON.stringify(s[3]).includes("secret=1") && !JSON.stringify(s[3]).includes("u=1")));
  _resetSharedCaptureForTests();
});

test("wiring: boundary + window handlers go through track(); entries install once", () => {
  const tr = read("src/lib/tracking.js");
  assert.match(tr, /initRuntimeErrorCapture\s*=\s*\(\)\s*=>\s*installRuntimeErrorCapture\(track\)/);
  assert.match(tr, /reportRuntimeIncident\s*=.*getSharedCapture\(track\)/);
  const eb = read("src/components/ErrorBoundary.jsx");
  assert.match(eb, /reportRuntimeIncident\("error_boundary"/);
  assert.ok(!/track\("runtime_error"/.test(eb), "boundary no longer bypasses the shared capture");
  assert.match(read("src/main.jsx"), /initRuntimeErrorCapture\(\)/);
  assert.match(read("src/main2029.jsx"), /initRuntimeErrorCapture\(\)/);
});

test("migration: additive, one-tree, on the 15m path, measured threshold, service_role-only", () => {
  const mig = read("supabase/migrations/20260929170000_g3_reliability_preclose_v1.sql");
  assert.ok(!/create\s+table|cron\.schedule|drop\s+table|detect_suggestions/i.test(mig.replace(/^--.*$/gm, "")), "no new store/cron; detect_suggestions untouched");
  assert.match(mig, /perform public\.fn_reliability_watch\(\)/, "reliability watch is invoked from fn_health_watch");
  assert.match(mig, /c_dead_man_minutes constant int := 90/);
  assert.match(mig, /p99\.9=17\.7m/, "threshold documented with measured evidence");
  assert.match(mig, /surface not in \('runtime_error', 'canary'\)/, "canary/runtime_error never prove ingest alive");
  assert.match(mig, /v_last is null or v_gap > c_dead_man_minutes/, "no data alerts");
  for (const f of ["fn_release_canary_slot", "fn_release_canary_report", "fn_release_canary_gate", "fn_release_canary_override"]) {
    assert.match(mig, new RegExp(`grant execute on function public\\.${f}\\([^)]*\\) to service_role`));
    assert.match(mig, new RegExp(`revoke all on function public\\.${f}\\([^)]*\\) from public, anon, authenticated`));
  }
  assert.match(mig, /rule_id = 'deploy_on_request'/);
  assert.match(mig, /'release_canary_auto_rollback', false/);
});

const okFetch = async (u) => ({ status: 200, text: async () => (u.endsWith("/") ? '<div id="root"></div><script src="/assets/index-abc.js"></script>' : u.endsWith("sitemap.xml") ? "<urlset></urlset>" : "x".repeat(2000)) });

test("canary: pass / non-200 / network failure", async () => {
  const wrap = (f) => async (u) => { const r = await f(u); return { status: r.status, text: async () => r.text }; };
  const ok = wrap(async (u) => ({ status: 200, text: u.endsWith("/") ? '<div id="root"></div><script src="/assets/index-abc.js"></script>' : u.endsWith("sitemap.xml") ? "<urlset></urlset>" : "x".repeat(2000) }));
  assert.equal((await runCanary("https://e.test/", { fetchImpl: ok })).ok, true);
  const bad = wrap(async (u) => ({ status: u.endsWith("robots.txt") ? 500 : 200, text: (u.endsWith("/") ? '<div id="root"></div><script src="/assets/i.js"></script>' : "x".repeat(2000)) }));
  assert.equal((await runCanary("https://e.test", { fetchImpl: bad })).ok, false);
  assert.equal((await runCanary("https://e.test", { fetchImpl: async () => { throw new Error("net"); } })).ok, false);
});

test("canary reporting fails closed: missing authority/identity/sha, non-2xx", async () => {
  const good = { ok: true, sha: SHA, kind: "deploy", checks: [] };
  await assert.rejects(() => reportCanary(good, { env: { ...ENV, SUPABASE_SERVICE_KEY: "" }, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }), /authority missing/);
  await assert.rejects(() => reportCanary(good, { env: { ...ENV, GITHUB_RUN_ID: "" }, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }), /run identity/);
  await assert.rejects(() => reportCanary({ ...good, sha: "abc" }, { env: ENV, fetchImpl: async () => ({ ok: true }) }), /40 hex/);
  await assert.rejects(() => reportCanary(good, { env: ENV, fetchImpl: async () => ({ ok: false, status: 401 }) }), /non-2xx: 401/);
  let seen;
  await reportCanary({ ...good, ok: false, checks: [{ name: "home_200", ok: false }] }, { env: ENV, fetchImpl: async (u, o) => { seen = { u, o }; return { ok: true, json: async () => ({ recorded: true }) }; } });
  const body = JSON.parse(seen.o.body);
  assert.match(seen.u, /rpc\/fn_release_canary_report$/);
  assert.equal(body.p_sha, SHA); assert.equal(body.p_run_id, "42");
  assert.equal(body.p_run_url, "https://github.com/zuriel337/sod1820/actions/runs/42");
  assert.deepEqual(body.p_failed, ["home_200"]);
  assert.match(seen.o.headers.Authorization, /^Bearer k$/);
  assert.ok(!/ingest_event/.test(seen.u), "never anon event rows");
  await assert.rejects(() => takeSlot("x", { env: { ...ENV, SUPABASE_SERVICE_KEY: "" } }), /authority missing/);
});

test("release gate script: blocks on missing config, non-2xx, and not-allowed; passes only on allowed", async () => {
  assert.equal((await checkGate(SHA, { env: {} })).allowed, false);
  assert.equal((await checkGate(SHA, { env: ENV, fetchImpl: async () => ({ ok: false, status: 404 }) })).allowed, false);
  assert.equal((await checkGate(SHA, { env: ENV, fetchImpl: async () => ({ ok: true, json: async () => ({ allowed: false, reason: "latest_canary_failed" }) }) })).reason, "latest_canary_failed");
  assert.equal((await checkGate(SHA, { env: ENV, fetchImpl: async () => ({ ok: true, json: async () => ({ allowed: true, reason: "latest_canary_success" }) }) })).allowed, true);
});

test("workflows: canary is sparse (<=4 cron/day), exact SHA, service key; gate is a PR job", () => {
  const w = read(".github/workflows/post-deploy-canary.yml");
  assert.match(w, /cron: "17 1,7,13,19 \* \* \*"/);
  assert.match(w, /SUPABASE_SERVICE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_KEY \}\}/);
  assert.ok(!/SUPABASE_ANON_KEY/.test(w));
  assert.match(w, /--sha "\$\{\{ steps\.target\.outputs\.sha \}\}"/);
  const g = read(".github/workflows/release-visual-gate.yml");
  assert.match(g, /release-canary-gate:/);
  assert.match(g, /scripts\/release-canary-gate\.mjs --production-sha/);
});
