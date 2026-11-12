// M0-B (ZURIEL 12.11.2026) end to end through the REAL Edge handlers (types stripped, imports replaced by the
// real shared modules, network replaced by recorders). No live project, no provider, no write.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";
import { randomUUID, webcrypto } from "node:crypto";
import { runAiAnalyze, UID, USER_JWT, SERVICE_KEY } from "./helpers/ai-analyze-handler.mjs";
import { isolatedResearchRun } from "./helpers/research-run-handler.mjs";
import { createMaterialGate, conversationalLimit } from "../supabase/functions/_shared/materialGate.js";
import { enforcePublicComputeLimits } from "../supabase/functions/_shared/edgeCallerLimits.js";

const src = (fn) => readFileSync(new URL(`../supabase/functions/${fn}/index.ts`, import.meta.url), "utf8");
const names = (run) => run.calls.map((c) => c.name);
const numberBody = { persona: "", kind: "number", subject: "776", facts: "", fast: true };

// ── ai-analyze generic (number page AI) ───────────────────────────────────────────────────
test("ai-analyze number path: guest -> 401 sign_in_required before limiter, gate, trace or model", async () => {
  const run = await runAiAnalyze({ allowed: true, genericProviderText: "x", body: { ...numberBody, visitor_id: "rotating-1" } });
  assert.equal(run.status, 401);
  assert.equal(run.result.error, "sign_in_required");
  for (const name of ["edge_rate_limit_check", "ai_quota_check", "fn_capability_execution_gate_v1", "op_trace_begin_v1"]) {
    assert.equal(names(run).includes(name), false, name);
  }
  assert.equal(run.calls.some((c) => c.url.startsWith("https://api.anthropic.com")), false);
});

test("ai-analyze guide: a guest gets 401 sign_in_required before quota, trace or model (paid AI only for signed-in users)", async () => {
  const run = await runAiAnalyze({ allowed: true, genericProviderText: "x", body: { kind: "guide", engine: "claude", subject: "איפה המחשבון", visitor_id: "rotating-2" } });
  assert.equal(run.status, 401);
  assert.equal(run.result.error, "sign_in_required");
  assert.equal(run.result.surface, "guide");
  for (const name of ["ai_quota_check", "op_trace_begin_v1"]) assert.equal(names(run).includes(name), false, name);
  assert.equal(run.calls.some((c) => c.url.startsWith("https://api.anthropic.com")), false);
});

test("ai-analyze number path: verified user passes account+global buckets, daily cap and the lock_number gate", async () => {
  const run = await runAiAnalyze({ allowed: true, bearer: USER_JWT, verifiedUid: UID, genericProviderText: "המספר שנבדק הוא 776.", body: numberBody });
  assert.equal(run.status, 200);
  assert.equal(run.result.analysis, "המספר שנבדק הוא 776.");
  const order = names(run);
  const gate = order.indexOf("fn_capability_execution_gate_v1");
  assert.deepEqual(order.filter((n) => ["edge_rate_limit_check", "ai_quota_check"].includes(n)), ["edge_rate_limit_check", "edge_rate_limit_check", "ai_quota_check"]);
  assert.ok(order.lastIndexOf("ai_quota_check") < gate && order.indexOf("op_trace_begin_v1") < gate);
  const gateCall = run.calls[gate].payload;
  assert.equal(gateCall.p_flag_key, "lock_number");
  assert.equal(gateCall.p_identity, `u:${UID}:f`);
  assert.match(run.calls.find((c) => c.name === "ai_quota_check").payload.p_identity, /^g:[0-9a-f]{64}$/);
});

test("ai-analyze number path: bucket denial -> 429, limiter outage -> 503; neither reaches gate or model", async () => {
  const denied = await runAiAnalyze({ allowed: true, edgeLimitAllowed: false, bearer: USER_JWT, verifiedUid: UID, genericProviderText: "x", body: numberBody });
  assert.equal(denied.status, 429);
  assert.equal(denied.result.error, "rate_limited");
  const down = await runAiAnalyze({ allowed: true, traceFailure: { rpc: "edge_rate_limit_check", mode: "http" }, bearer: USER_JWT, verifiedUid: UID, genericProviderText: "x", body: numberBody });
  assert.equal(down.status, 503);
  assert.equal(down.result.error, "rate_limit_unavailable");
  for (const run of [denied, down]) {
    assert.equal(names(run).includes("fn_capability_execution_gate_v1"), false);
    assert.equal(run.calls.some((c) => c.url.startsWith("https://api.anthropic.com")), false);
  }
});

test("ai-analyze number path: admin keeps working and is not counted against the global daily cap", async () => {
  const run = await runAiAnalyze({ allowed: true, role: "admin", bearer: USER_JWT, verifiedUid: UID, genericProviderText: "ok", body: numberBody });
  assert.equal(run.status, 200);
  assert.equal(names(run).filter((n) => n === "edge_rate_limit_check").length, 2);
  assert.equal(names(run).includes("ai_quota_check"), false);
});

test("ai-analyze generic path: a trusted service-role server call keeps its historical path (no sign-in gate, no buckets)", async () => {
  const run = await runAiAnalyze({ allowed: true, bearer: SERVICE_KEY, genericProviderText: "ok", body: numberBody });
  assert.equal(run.status, 200);
  assert.equal(names(run).includes("edge_rate_limit_check"), false);
  const gate = run.calls.find((c) => c.name === "fn_capability_execution_gate_v1").payload;
  assert.equal(gate.p_identity, "v:fixture-visitor:f", "trusted server path: identity resolution unchanged");
});

// ── ai-analyze Raziel quota identity + fail closed ───────────────────────────────────────
test("ai-analyze Raziel guest quota: changed visitor_id -> same quota identity; no platform address -> refused without counting", async () => {
  const ids = [];
  for (const visitor of ["rotating-a", "rotating-b"]) {
    const run = await runAiAnalyze({ allowed: true, body: { visitor_id: visitor } });
    ids.push(run.calls.find((c) => c.name === "ai_quota_check").payload.p_identity);
  }
  assert.equal(ids[0], ids[1]);
  assert.match(ids[0], /^ip:[0-9a-f]{64}$/);
  const none = await runAiAnalyze({ allowed: true, clientIp: "", body: { visitor_id: "rotating-c" } });
  assert.equal(names(none).includes("ai_quota_check"), false, "empty identity never reaches the counter");
  assert.equal(none.models.length, 0);
});

test("ai-analyze Raziel site: quota RPC failure refuses the model call (fail CLOSED)", async () => {
  const run = await runAiAnalyze({ allowed: true, traceFailure: { rpc: "ai_quota_check", mode: "http" } });
  assert.equal(run.models.length, 0);
  assert.equal(run.result.error, "quota_unavailable");
});

test("ai-analyze trusted WhatsApp channel: quota RPC failure keeps its historical fail-open (unchanged)", async () => {
  const run = await runAiAnalyze({ allowed: true, bearer: SERVICE_KEY, trustedUid: UID, traceFailure: { rpc: "ai_quota_check", mode: "http" },
    body: { surface: "whatsapp", visitor_id: undefined, trusted_channel: { channel: "whatsapp", sender: "15550001234", depth: false } } });
  assert.notEqual(run.result.error, "quota_unavailable");
  assert.ok(run.models.length >= 1, "the trusted channel still reaches synthesis");
  assert.equal(names(run).includes("edge_rate_limit_check"), false);
});

// ── number-researcher / lab-teacher ──────────────────────────────────────────────────────
function loadMaterialHandler(fn, extraCtx = {}) {
  const source = src(fn);
  const calls = [];
  const fetchImpl = async (input, init = {}) => { calls.push(String(input)); throw new Error(`unexpected ${input}`); };
  let handler;
  const env = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "svc", SUPABASE_ANON_KEY: "anon", ANTHROPIC_API_KEY: "synthetic-model-key" };
  runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\n/gm, "")), {
    Deno: { env: { get: (k) => env[k] }, serve: (f) => { handler = f; } },
    createMaterialGate: (o) => createMaterialGate({ ...o, fetchImpl }), conversationalLimit,
    createRazielInterview: () => ({ handle: async () => ({ ok: false, status: 503 }), context: async () => ({ ok: false, status: 503 }) }),
    fetch: fetchImpl, Request, Response, Headers, URL, AbortController, AbortSignal, TextEncoder, TextDecoder, crypto: webcrypto, setTimeout, clearTimeout,
    ...extraCtx,
  });
  return { handler, calls };
}

for (const [fn, body, field] of [
  ["number-researcher", { values: [787], visitor_id: "v-guest" }, "answer"],
  ["lab-teacher", { messages: [{ role: "user", content: "שלום" }], visitor_id: "v-guest" }, "reply"],
]) {
  test(`${fn}: a guest gets 401 sign_in_required with zero I/O (no limiter, gate, trace, context or model)`, async () => {
    const { handler, calls } = loadMaterialHandler(fn);
    const res = await handler(new Request(`https://fixture.invalid/${fn}`, { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.7" }, body: JSON.stringify(body) }));
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.error, "sign_in_required");
    assert.equal(json[field], null);
    assert.deepEqual(calls, []);
  });
}

// ── field-router fail closed ─────────────────────────────────────────────────────────────
function fieldRouter({ profile = [{ tier: 3 }], profileStatus = 200, rate = true, rateStatus = 200 } = {}) {
  const calls = [];
  const fetch = async (input, init = {}) => {
    const url = String(input); calls.push(url);
    if (url.endsWith("/auth/v1/user")) return Response.json({ id: "22222222-2222-4222-8222-222222222222" });
    if (url.includes("/rest/v1/profiles?")) return new Response(JSON.stringify(profile), { status: profileStatus });
    if (url.endsWith("/rpc/router_rate_check")) return new Response(JSON.stringify(rate), { status: rateStatus });
    if (url.includes("/rest/v1/rpc/op_trace_")) return Response.json({ trace_id: randomUUID(), root_span_id: randomUUID() });
    if (url.startsWith("https://api.anthropic.com")) return Response.json({ content: [{ type: "text", text: "{\"summary\":\"s\"}" }], usage: {} });
    throw new Error(`unexpected ${url}`);
  };
  let handler;
  const env = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "svc", SUPABASE_ANON_KEY: "anon", ANTHROPIC_API_KEY: "synthetic-model-key" };
  runInNewContext(stripTypeScriptTypes(src("field-router").replace(/^import .*;\n/gm, "")), {
    Deno: { env: { get: (k) => env[k] }, serve: (f) => { handler = f; } },
    createMaterialGate: (o) => createMaterialGate({ ...o, fetchImpl: fetch }),
    fetch, Request, Response, Headers, URL, crypto: webcrypto,
  });
  return async () => {
    const res = await handler(new Request("https://fixture.invalid/field-router", { method: "POST", headers: { authorization: "Bearer user-jwt", "content-type": "application/json" }, body: JSON.stringify({ input: { a: 1 }, lenses: ["journey"] }) }));
    return { body: await res.json(), calls };
  };
}

test("field-router: missing profile, unreadable profiles, missing tier or unavailable limiter all refuse before spend", async () => {
  for (const [opts, reason] of [
    [{ profile: [] }, "tier"],
    [{ profile: [{ tier: null }] }, "tier"],
    [{ profile: [{ tier: 2 }] }, "tier"],
    [{ profileStatus: 400 }, "tier_unavailable"],
    [{ rateStatus: 500 }, "rate_unavailable"],
    [{ rate: null }, "rate_unavailable"],
    [{ rate: false }, "rate"],
  ]) {
    const { body, calls } = await fieldRouter(opts)();
    assert.equal(body.gated, true, JSON.stringify(opts));
    assert.equal(body.reason, reason, JSON.stringify(opts));
    assert.equal(calls.some((u) => u.startsWith("https://api.anthropic.com")), false);
  }
  const ok = await fieldRouter()();
  assert.equal(ok.body.gated, undefined);
  assert.ok(ok.calls.some((u) => u.startsWith("https://api.anthropic.com")), "tier>=3 + explicit true still admits");
});

// ── public compute fails OPEN ────────────────────────────────────────────────────────────
test("els-search-bridge: limiter outage fails OPEN (request proceeds to trace), an explicit denial is 429", async () => {
  const run = async (limiter) => {
    const calls = [];
    const fetch = async (input) => {
      const url = String(input); calls.push(url);
      if (url.endsWith("/rpc/edge_rate_limit_check")) return limiter();
      if (url.endsWith("/rpc/op_trace_begin_v1")) return new Response("down", { status: 503 });
      throw new Error(`unexpected ${url}`);
    };
    let handler;
    const env = { SUPABASE_URL: "http://127.0.0.1:1", SUPABASE_SERVICE_ROLE_KEY: "svc" };
    runInNewContext(stripTypeScriptTypes(src("els-search-bridge").replace(/^import .*;\n/gm, "")), {
      Deno: { env: { get: (k) => env[k] }, serve: (f) => { handler = f; } }, enforcePublicComputeLimits,
      fetch, Request, Response, Headers, URL, TextEncoder, TextDecoder, atob, crypto: webcrypto,
    });
    const res = await handler(new Request("http://127.0.0.1:1/functions/v1/els-search-bridge", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.7" }, body: JSON.stringify({ op: "page", term: "תורה", skip_max: 100 }) }));
    return { status: res.status, body: await res.json(), calls };
  };
  const open = await run(() => new Response("down", { status: 503 }));
  assert.equal(open.body.error, "trace_unavailable", "passed the limiter and reached the trace root");
  assert.equal(open.calls.filter((u) => u.endsWith("/rpc/edge_rate_limit_check")).length, 2);
  const denied = await run(() => Response.json({ allowed: false, count: 61, limit: 60, window_seconds: 3600 }));
  assert.equal(denied.status, 429);
  assert.equal(denied.body.error, "rate_limited");
  assert.equal(denied.calls.some((u) => u.endsWith("/rpc/op_trace_begin_v1")), false);
});

const researchRequest = (runtime) => runtime.fetch(`${runtime.origin}/functions/v1/research-run`, {
  method: "POST",
  headers: { authorization: `Bearer ${runtime.anon}`, "content-type": "application/json", "cf-connecting-ip": "198.51.100.7" },
  body: JSON.stringify({ number: "878", question: "מה זה 878?", visitor_id: "vm0bguest01", interaction_id: randomUUID(), requested_capabilities: ["numeric", "numeric_operators"], surface: "heichal" }),
});

test("research-run: limiter outage fails OPEN (public research still runs); denial is 429 before trace", async () => {
  const open = isolatedResearchRun({ failure: { name: "edge_rate_limit_check" } });
  const ok = await researchRequest(open);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).status, "ok");
  const denied = isolatedResearchRun({ rateAllowed: false });
  const res = await researchRequest(denied);
  assert.equal(res.status, 429);
  assert.equal((await res.json()).error, "rate_limited");
  assert.equal(denied.roots.size, 0, "no trace root after a denial");
  for (const runtime of [open, denied]) runtime.assertNoUnexpected();
  const keys = denied.calls.filter((c) => c.name === "edge_rate_limit_check").map((c) => JSON.stringify(c.body));
  assert.ok(keys.every((k) => !k.includes("vm0bguest01") && !k.includes("198.51.100.7")), "visitor_id and raw address are never limiter keys");
});

// ── wa-raziel PII removal ────────────────────────────────────────────────────────────────
test("wa-raziel: no phone number or group id literal remains in source; identifiers come from runtime env", () => {
  const s = src("wa-raziel");
  assert.doesNotMatch(s, /\b972\d{8,9}\b/, "no Israeli phone literal");
  assert.doesNotMatch(s, /\d{12,}@g\.us/, "no WhatsApp group id literal");
  assert.doesNotMatch(s, /"\d{9,15}@c\.us"/, "no contact id literal");
  for (const name of ["WA_RAZIEL_CHRISTINA_PHONE", "WA_RAZIEL_AMIT_GROUP", "WA_RAZIEL_GILUI_GROUP", "WA_RAZIEL_OPEN_GROUPS", "ZURIEL_WA"]) {
    assert.match(s, new RegExp(`envText\\("${name}"\\)`), name);
  }
  assert.match(s, /const GROUPS_ENABLED = false;/, "group handling stays disabled");
  assert.doesNotMatch(src("ai-analyze"), /\/\/ \S+@\S+\.\w+/, "no personal address in ai-analyze comments");
});
