// G3_RELIABILITY_PRECLOSE — focused contract + behaviour tests.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  createRuntimeErrorCapture, RUNTIME_ERROR_LIMITS, installRuntimeErrorCapture, getSharedCapture,
  sanitizeText, sanitizeRoute, buildIncidentMeta, _resetSharedCaptureForTests,
} from "../src/lib/runtimeErrorCapture.js";
import { runCanary, readHeartbeat } from "../scripts/post-deploy-canary.mjs";
import { checkGate, CANARY_STATUS_CONTEXT } from "../scripts/release-canary-gate.mjs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const SHA = "a".repeat(40);
const ENV = { GH_TOKEN: "gh", GITHUB_REPOSITORY: "zuriel337/sod1820", SUPABASE_ANON_KEY: "anon" };

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
  const l = {}; const win = { location: { pathname: "/p", search: "?secret=1" }, addEventListener: (n, fn) => { l[n] = fn; } };
  const sent = [];
  const report = (...a) => sent.push(a);
  assert.equal(installRuntimeErrorCapture(report, win), true);
  assert.equal(installRuntimeErrorCapture(() => {}, win), false, "idempotent");
  l.error({ message: "bad", filename: "https://x/a.js?u=1", lineno: 1, colno: 2, error: new TypeError("bad") });
  l.error({ target: {} });
  l.unhandledrejection({ reason: new Error("rej") });
  getSharedCapture(report, win)("error_boundary", "boundary boom", { name: "Error", component_stack: "at X" });
  assert.deepEqual(sent.map((x) => [x[0], x[1], x[2]]),
    [["runtime_error", "/p", "window_error"], ["runtime_error", "/p", "unhandled_rejection"], ["runtime_error", "/p", "error_boundary"]]);
  assert.ok(sent.every((x) => !JSON.stringify(x[3]).includes("secret=1") && !JSON.stringify(x[3]).includes("u=1")));
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

test("migration: additive one-tree reliability + narrow public readers; no public write", () => {
  const mig = read("supabase/migrations/20260929170000_g3_reliability_preclose_v1.sql");
  assert.ok(!/create\s+table|cron\.schedule|drop\s+table|detect_suggestions/i.test(mig.replace(/^--.*$/gm, "")), "no new store/cron; detect_suggestions untouched");
  assert.match(mig, /perform public\.fn_reliability_watch\(\)/);
  assert.match(mig, /c_dead_man_minutes constant int := 90/);
  assert.match(mig, /p99\.9=17\.7m/);
  assert.match(mig, /surface not in \('runtime_error', 'canary'\)/);
  assert.match(mig, /fn_reliability_heartbeat_status/);
  assert.match(mig, /fn_release_canary_override_status/);
  assert.match(mig, /grant execute on function public\.fn_reliability_heartbeat_status\(\) to anon, authenticated, service_role/);
  assert.match(mig, /grant execute on function public\.fn_release_canary_override_status\(\) to anon, authenticated, service_role/);
  assert.match(mig, /revoke all on function public\.fn_release_canary_override\(text, int\) from public, anon, authenticated/);
  assert.ok(!/fn_release_canary_report|fn_release_canary_slot|fn_release_canary_gate\(/.test(mig), "no CI service-role report/gate RPCs");
  assert.match(mig, /github_status:sod1820\/post-deploy-canary/);
  assert.match(mig, /'release_canary_auto_rollback', false/);
});

test("canary: pass / non-200 / network failure", async () => {
  const wrap = (fn) => async (u) => { const r = await fn(u); return { status: r.status, text: async () => r.text }; };
  const ok = wrap(async (u) => ({ status: 200, text: u.endsWith("/") ? '<div id="root"></div><script src="/assets/index-abc.js"></script>' : u.endsWith("sitemap.xml") ? "<urlset></urlset>" : "x".repeat(2000) }));
  assert.equal((await runCanary("https://e.test/", { fetchImpl: ok })).ok, true);
  const bad = wrap(async (u) => ({ status: u.endsWith("robots.txt") ? 500 : 200, text: (u.endsWith("/") ? '<div id="root"></div><script src="/assets/i.js"></script>' : "x".repeat(2000)) }));
  assert.equal((await runCanary("https://e.test", { fetchImpl: bad })).ok, false);
  assert.equal((await runCanary("https://e.test", { fetchImpl: async () => { throw new Error("net"); } })).ok, false);
});
test("heartbeat reader is public-read transport and fails closed on non-2xx", async () => {
  let seen;
  const out = await readHeartbeat({
    env: { SUPABASE_URL: "https://sb.test", SUPABASE_ANON_KEY: "anon" },
    fetchImpl: async (u, o) => { seen = { u, o }; return { ok: true, status: 200, json: async () => ({ healthy: true, age_minutes: 3, max_age_minutes: 45 }) }; },
  });
  assert.equal(out.healthy, true);
  assert.match(seen.u, /rpc\/fn_reliability_heartbeat_status$/);
  assert.equal(seen.o.headers.apikey, "anon");
  await assert.rejects(() => readHeartbeat({ env: { SUPABASE_URL: "https://sb.test", SUPABASE_ANON_KEY: "anon" }, fetchImpl: async () => ({ ok: false, status: 404 }) }), /non-2xx: 404/);
});

function gateFetch({ override = { allowed: false }, overrideStatus = 200, statuses = [], githubStatus = 200 } = {}) {
  return async (url) => {
    if (url.includes("fn_release_canary_override_status")) return { ok: overrideStatus >= 200 && overrideStatus < 300, status: overrideStatus, json: async () => override };
    if (url.includes("api.github.com")) return { ok: githubStatus >= 200 && githubStatus < 300, status: githubStatus, json: async () => statuses };
    throw new Error("unexpected URL " + url);
  };
}

test("release gate: exact-SHA GitHub status, bounded bootstrap, override, and fail-closed transport", async () => {
  assert.equal((await checkGate("", { env: ENV })).reason, "production_sha_missing_or_invalid");
  assert.equal((await checkGate(SHA, { env: { ...ENV, GH_TOKEN: "" } })).reason, "github_token_missing");
  assert.equal((await checkGate(SHA, { env: ENV, fetchImpl: gateFetch({ overrideStatus: 500 }) })).reason, "override_rpc_non_2xx_500");
  assert.equal((await checkGate(SHA, { env: ENV, allowBootstrap: true, fetchImpl: gateFetch({ overrideStatus: 404, statuses: [] }) })).reason, "bootstrap_no_prior_canary");
  const ov = await checkGate(SHA, { env: ENV, fetchImpl: gateFetch({ override: { allowed: true, reason: "human_gate_override" } }) });
  assert.equal(ov.allowed, true); assert.equal(ov.reason, "human_gate_override");
  const none = await checkGate(SHA, { env: ENV, fetchImpl: gateFetch({ statuses: [] }) });
  assert.equal(none.allowed, false); assert.equal(none.reason, "no_canary_evidence");
  const first = await checkGate(SHA, { env: ENV, allowBootstrap: true, fetchImpl: gateFetch({ statuses: [] }) });
  assert.equal(first.allowed, true); assert.equal(first.reason, "bootstrap_no_prior_canary");
  const failed = await checkGate(SHA, { env: ENV, allowBootstrap: true, fetchImpl: gateFetch({ statuses: [{ context: CANARY_STATUS_CONTEXT, state: "failure" }] }) });
  assert.equal(failed.allowed, false); assert.equal(failed.reason, "latest_canary_failure");
  const passed = await checkGate(SHA, { env: ENV, fetchImpl: gateFetch({ statuses: [{ context: CANARY_STATUS_CONTEXT, state: "success" }] }) });
  assert.equal(passed.allowed, true); assert.equal(passed.reason, "latest_canary_success");
});

test("workflows: exact-SHA commit status, sparse budget, no service-role CI secret", () => {
  const w = read(".github/workflows/post-deploy-canary.yml");
  assert.match(w, /cron: "17 1,7,13,19 \* \* \*"/);
  assert.match(w, /statuses: write/);
  assert.match(w, /sod1820\/post-deploy-canary/);
  assert.match(w, /steps\.target\.outputs\.sha/);
  assert.match(w, /COUNT=.*workflow_runs/);
  assert.match(w, /\[ "\$COUNT" -gt 4 \]/);
  assert.ok(!/SUPABASE_SERVICE_KEY|SUPABASE_SERVICE_ROLE_KEY/.test(w));
  assert.match(w, /continue-on-error: true/);
  assert.match(w, /Enforce canary outcome/);
  assert.match(w, /Re-confirm exact Production SHA after smoke/);
  assert.match(w, /steps\.target_post\.outcome/);
  assert.match(w, /Production SHA changed during canary/);
  assert.ok(w.includes('URL="https://sod1820.co.il"'));
  assert.ok(w.includes('CURRENT_PRODUCTION_SHA="$(resolve_latest_production_sha)"'));
  assert.ok(w.includes('if [ "$CURRENT_PRODUCTION_SHA" != "$SHA" ]; then'));
  assert.ok(!w.includes('SHA="$EVENT_SHA"; URL="$EVENT_URL"'), "protected unique deployment URL is not the canary target");


  const g = read(".github/workflows/release-visual-gate.yml");
  assert.match(g, /statuses: read/);
  assert.match(g, /scripts\/release-canary-gate\.mjs --production-sha/);
  assert.match(g, /github\.event\.pull_request\.base\.sha/);
  assert.match(g, /contents\/scripts\/release-canary-gate\.mjs\?ref=\$BASE_SHA/);
  assert.match(g, /--allow-bootstrap/);
  assert.match(g, /cannot resolve current successful Production deployment SHA/);
  assert.match(g, /HTTP 404/);
  assert.ok(!/SUPABASE_SERVICE_KEY|SUPABASE_SERVICE_ROLE_KEY/.test(g));
});

test("canary truth includes external health-watch heartbeat before GitHub status can pass", () => {
  const sc = read("scripts/post-deploy-canary.mjs");
  assert.match(sc, /fn_reliability_heartbeat_status/);
  assert.match(sc, /heartbeat\?\.healthy === true/);
  assert.match(sc, /name: "health_watch_heartbeat"/);
  assert.match(sc, /checks\.every\(\(c\) => c\.ok\)/);
  const wf = read(".github/workflows/post-deploy-canary.yml");
  assert.match(wf, /STATE="failure"/);
  assert.match(wf, /STATE="success"/);
  assert.match(wf, /statuses\/\$\{\{ steps\.target\.outputs\.sha \}\}/);
});
