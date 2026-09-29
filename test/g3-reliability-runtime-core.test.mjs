// G3_RELIABILITY_RUNTIME_CORE_V1 — focused contract + behaviour tests (slices A, B, D).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRuntimeErrorCapture, RUNTIME_ERROR_LIMITS, installRuntimeErrorCapture } from "../src/lib/runtimeErrorCapture.js";
import { runCanary } from "../scripts/post-deploy-canary.mjs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

// ── A. capture: dedupe + rate limit + session cap ───────────────────────────
{
  const got = []; let t = 1_000_000;
  const cap = createRuntimeErrorCapture((k, m) => got.push([k, m]), () => t);
  assert.equal(cap("window_error", "boom", { source: "a.js" }), true);
  assert.equal(cap("window_error", "boom", { source: "a.js" }), false, "same fingerprint deduped");
  assert.equal(cap("window_error", "ResizeObserver loop limit exceeded"), false, "noise ignored");
  cap("window_error", "e2"); cap("window_error", "e3");
  assert.equal(cap("window_error", "e4"), false, "per-minute cap");
  t += 61000;
  assert.equal(cap("window_error", "e4"), true, "window resets");
  const many = []; let t2 = 0;
  const c2 = createRuntimeErrorCapture((k, m) => many.push(m), () => (t2 += 61000));
  for (let i = 0; i < 50; i++) c2("unhandled_rejection", "m" + i);
  assert.equal(many.length, RUNTIME_ERROR_LIMITS.perSession, "per-session cap");
  assert.doesNotThrow(() => createRuntimeErrorCapture(() => { throw new Error("x"); })("window_error", "y"));
}
// install: uses existing surface, listeners registered once
{
  const l = {}; const win = { location: { pathname: "/p" }, addEventListener: (n, f) => { l[n] = f; } };
  const sent = [];
  assert.equal(installRuntimeErrorCapture((...a) => sent.push(a), win), true);
  assert.equal(installRuntimeErrorCapture(() => {}, win), false, "idempotent");
  l.error({ message: "bad", filename: "x.js", lineno: 1, colno: 2, error: new TypeError("bad") });
  l.error({ target: {} }); // resource error without message — ignored
  l.unhandledrejection({ reason: new Error("rej") });
  assert.deepEqual(sent.map(s => [s[0], s[1], s[2]]), [["runtime_error", "/p", "window_error"], ["runtime_error", "/p", "unhandled_rejection"]]);
}
const tracking = read("src/lib/tracking.js");
assert.match(tracking, /initRuntimeErrorCapture\s*=\s*\(\)\s*=>\s*installRuntimeErrorCapture\(track\)/, "goes through existing track()");
assert.match(read("src/main.jsx"), /initRuntimeErrorCapture\(\)/);
assert.match(read("src/main2029.jsx"), /initRuntimeErrorCapture\(\)/);

// ── B. migration: additive, one-tree ────────────────────────────────────────
const mig = read("supabase/migrations/20260929140000_g3_reliability_runtime_core_v1.sql");
assert.ok(!/create\s+table|cron\.schedule/i.test(mig), "no new store and no new cron");
assert.match(mig, /create or replace function public\.detect_suggestions\(/i);
assert.match(mig, /create or replace function public\.fn_health_watch\(/i);
assert.match(mig, /surface = 'runtime_error'/);
assert.match(mig, /reliability_heartbeat:health_watch/);
for (const k of ["events-ingest", "canary", "notify"]) assert.ok(mig.includes(k + ":"), `dead-man covers ${k}`);
// preserved bodies
for (const s of ["dependency_upgrade_radar", "Node LTS radar", "infra_egress_hour:%", "getStateInstance", "mod(extract(minute from now())::int, 10) = 0", "sensor_stale"])
  assert.ok(mig.includes(s), `preserved: ${s}`);
assert.match(mig, /revoke all on function public\.fn_health_watch\(\) from public, anon, authenticated/i);
assert.ok(!/wa_send\(/.test(mig.split("create or replace function public.fn_health_watch")[1].replace(/perform public\.wa_admin[^;]*;/g, "")), "alerts terminate in notify_admin");

// ── D. canary: workflow shape + deterministic behaviour ─────────────────────
const wf = read(".github/workflows/post-deploy-canary.yml");
assert.equal((wf.match(/- cron:/g) || []).length, 1);
assert.match(wf, /cron: "\d+ \d+,\d+,\d+,\d+ \* \* \*"/, "max 4/day");
assert.match(wf, /deployment_status/);
assert.match(wf, /deployment\.sha/);
assert.ok(!/vercel (rollback|promote)|ANTHROPIC|OPENAI|claude/i.test(wf), "no rollback / no AI");
{
  const ok = async (u) => ({ status: 200, text: async () => u.endsWith(".js") ? "x".repeat(2000) : u.endsWith("/") ? '<div id="root"></div><script src="/assets/index-abc.js"></script>' : "ok" });
  const good = await runCanary("https://e.test/", { fetchImpl: ok });
  assert.equal(good.ok, true);
  const bad = await runCanary("https://e.test", { fetchImpl: async (u) => ({ status: u.endsWith("robots.txt") ? 500 : 200, text: (await ok(u)).text }) });
  assert.equal(bad.ok, false);
  const boom = await runCanary("https://e.test", { fetchImpl: async () => { throw new Error("net"); } });
  assert.equal(boom.ok, false);
}
console.log("g3-reliability-runtime-core: PASS");
