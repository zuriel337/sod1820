// G3 D2 — public material path hardening: gate precedes provider spend, trace wraps the provider call,
// fail-closed negatives, public/auth contract preserved. No network; fetch is injected.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMaterialGate, conversationalLimit } from "../supabase/functions/_shared/materialGate.js";

// ── behaviour: helper against a scripted fetch ────────────────────────────────────────────────
function harness({ gate = { allowed: true }, gateStatus = 200, traceOk = true, usersRole = null, authUser = null } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const u = String(url);
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: u, body });
    const res = (data, ok = true, status = 200) => ({ ok, status, json: async () => data, text: async () => JSON.stringify(data) });
    if (u.includes("/rpc/fn_capability_execution_gate_v1")) return gateStatus === 200 ? res(gate) : res(null, false, gateStatus);
    if (u.includes("/rpc/op_trace_begin_v1")) return traceOk ? res({ trace_id: body.p_trace_id, root_span_id: body.p_root_span_id }) : res(null, false, 500);
    if (u.includes("/rpc/op_trace_")) return traceOk ? res({ ok: true }) : res(null, false, 500);
    if (u.includes("/auth/v1/user")) return authUser ? res({ id: authUser }) : res(null, false, 401);
    if (u.includes("/rest/v1/users?")) return res(usersRole ? [{ role: usersRole }] : []);
    if (u.includes("/rest/v1/ai_token_log")) return res([{ id: 77 }]);
    throw new Error(`unexpected fetch ${u}`);
  };
  const mg = createMaterialGate({ supabaseUrl: "https://x.supabase.co", serviceKey: "svc", anonKey: "anon", fetchImpl });
  return { mg, calls };
}
const req = (headers = {}) => ({ headers: new Headers(headers) });
const names = (calls) => calls.map((c) => c.url.split("/").pop().split("?")[0]);

// 1. allowed: gate is recorded and precedes the provider run; provider span + cost link follow.
{
  const { mg, calls } = harness();
  const caller = await mg.resolveCaller(req({ "x-forwarded-for": "1.2.3.4" }), { visitor_id: "vis1" });
  assert.deepEqual([caller.identity, caller.tier], ["v:vis1", "anon"]);
  const trace = await mg.beginTrace({ capability: "c", surface: "s", ownerRef: "o", identityClass: "anon", rootName: "r" });
  const g = await mg.runGate(trace, { capability: "c", caller, budgetKind: "ai_quota", budgetTier: "anon", budgetLimitOverride: conversationalLimit("anon"), budgetIdentity: "v:vis1:lt" });
  assert.equal(g.state, "allowed");
  let ran = false;
  const out = await mg.providerSpan(trace, { capability: "c", name: "m", ownerRef: "o", model: "mod", source: "src", kind: "k", caller, run: async () => { ran = true; return { text: "hi", usage: { input_tokens: 3, output_tokens: 4 } }; } });
  assert.ok(ran && out.text === "hi");
  const order = names(calls);
  assert.ok(order.indexOf("fn_capability_execution_gate_v1") < order.indexOf("op_trace_record_span_v1", order.indexOf("fn_capability_execution_gate_v1") + 1), "gate before provider span");
  assert.ok(order.includes("op_trace_link_ai_cost_v1"), "exact cost linked to the model span");
  const gateCall = calls.find((c) => c.url.includes("fn_capability_execution_gate_v1")).body;
  assert.equal(gateCall.p_budget_limit_override, 40);
  assert.equal(gateCall.p_visitor, "vis1");
  const tokenRow = calls.find((c) => c.url.includes("ai_token_log")).body;
  assert.ok(tokenRow.trace_id && tokenRow.span_id && tokenRow.input_tokens === 3, "token log carries trace/span correlation");
}

// 2. fail closed: gate RPC unavailable -> "unavailable" (callers must not run the provider).
{
  const { mg } = harness({ gateStatus: 500 });
  const trace = await mg.beginTrace({ capability: "c", surface: "s", ownerRef: "o", identityClass: "anon", rootName: "r" });
  const g = await mg.runGate(trace, { capability: "c", caller: { identity: "v:a", visitor: "a" } });
  assert.equal(g.state, "unavailable");
}

// 3. fail closed: denied by each sub-owner.
for (const [gate, want] of [
  [{ allowed: false, availability: { allowed: false } }, "availability"],
  [{ allowed: false, availability: { allowed: true }, entitlement: { allowed: false } }, "entitlement"],
  [{ allowed: false, availability: { allowed: true }, entitlement: { allowed: true }, budget: { allowed: false } }, "quota"],
]) {
  const { mg } = harness({ gate });
  const g = await mg.runGate(null, { capability: "c", caller: { identity: "v:a" } });
  assert.deepEqual([g.state, g.denial], ["denied", want]);
}

// 4. gate failing closed does not depend on trace: trace outage is fail-open, gate decision still honoured.
{
  const { mg } = harness({ traceOk: false, gate: { allowed: false, budget: { allowed: false } } });
  const trace = await mg.beginTrace({ capability: "c", surface: "s", ownerRef: "o", identityClass: "anon", rootName: "r" });
  assert.equal(trace, null);
  assert.equal((await mg.runGate(trace, { capability: "c", caller: {} })).state, "denied");
  const ok = harness({ traceOk: false });
  assert.equal((await ok.mg.runGate(null, { capability: "c", caller: {} })).state, "allowed");
}

// 5. no service key -> gate unavailable (never silently open).
{
  const mg = createMaterialGate({ supabaseUrl: "https://x", serviceKey: "", fetchImpl: async () => { throw new Error("no net"); } });
  assert.equal((await mg.runGate(null, { capability: "c", caller: {} })).state, "unavailable");
}

// 6. provider throw is recorded as provider_error and re-thrown.
{
  const { mg, calls } = harness();
  const trace = await mg.beginTrace({ capability: "c", surface: "s", ownerRef: "o", identityClass: "anon", rootName: "r" });
  await assert.rejects(mg.providerSpan(trace, { capability: "c", name: "m", ownerRef: "o", model: "m", run: async () => { throw new Error("boom"); } }), /boom/);
  const span = calls.filter((c) => c.url.includes("op_trace_record_span_v1")).pop().body;
  assert.equal(span.p_outcome, "provider_error");
  assert.equal(span.p_detail.privacy.rawPrivatePayloadLogged, false);
}

// 7. identity: verified admin JWT; anon key is never treated as a user; run-key-less guest has no admin.
{
  const { mg } = harness({ authUser: "8f14e45f-ceea-467a-9575-8a4e2d5b7e0a", usersRole: "admin" });
  const admin = await mg.resolveCaller(req({ authorization: "Bearer usertoken" }), {});
  assert.deepEqual([admin.tier, admin.verified], ["admin", true]);
  const anonKey = await mg.resolveCaller(req({ authorization: "Bearer anon" }), {});
  assert.deepEqual([anonKey.tier, anonKey.verified], ["anon", false]);
  const bad = harness({ authUser: null });
  const guest = await bad.mg.resolveCaller(req({ authorization: "Bearer forged" }), {});
  assert.equal(guest.verified, false);
}

// ── wiring: per-function source assertions ───────────────────────────────────────────────────
const src = (n) => readFileSync(`supabase/functions/${n}/index.ts`, "utf8");
const before = (s, a, b, msg) => {
  const i = s.indexOf(a), j = s.indexOf(b, i);
  assert.ok(i >= 0, `${msg}: missing ${a}`);
  assert.ok(j > i, `${msg}: ${b} must come after ${a}`);
};

for (const fn of ["lab-teacher", "number-researcher", "journey-message", "gallery-ocr"]) {
  const s = src(fn);
  assert.ok(s.includes('from "../_shared/materialGate.js"'), `${fn} reuses shared canonical seam`);
  // gallery-ocr wraps the provider in scanImage() (defined above the handler); the handler call site is what must follow the gate
  const trigger = fn === "gallery-ocr" ? "await scanImage(" : "mg.providerSpan(";
  before(s, "mg.runGate(", trigger, `${fn} gate before provider`);
  before(s, 'g.state === "unavailable"', trigger, `${fn} fail-closed unavailable before provider`);
  before(s, 'g.state === "denied"', trigger, `${fn} fail-closed denied before provider`);
  assert.ok(s.includes("mg.finishTrace("), `${fn} finishes trace`);
  // the raw provider fetch must live only inside the providerSpan run()
  const call = s.indexOf("api.anthropic.com");
  const span = s.indexOf("mg.providerSpan(");
  if (fn === "lab-teacher" || fn === "number-researcher") {
    // provider helper (runClaude/callClaude) is defined above the handler and only invoked inside providerSpan.run
    assert.ok(call < span && /run: \(\) => (runClaude|callClaude)\(/.test(s), `${fn}: provider invoked via providerSpan.run`);
  } else {
    assert.ok(call > span, `${fn}: provider fetch sits inside providerSpan.run`);
  }
}

// budgets: metered conversational paths reuse ai_quota; Journey stays free; OCR is unmetered but gated.
assert.ok(src("lab-teacher").includes('budgetKind: "ai_quota"'));
assert.ok(src("number-researcher").includes('budgetKind: "ai_quota"'));
assert.ok(src("journey-message").includes('budgetKind: "none"'));
assert.ok(src("gallery-ocr").includes('budgetKind: "none"'));
// number-researcher: history op returns before the gate (no provider, no spend)
before(src("number-researcher"), 'body?.op === "history"', "mg.runGate(", "history op precedes gate");
// gate precedes the (DB) context load on number-researcher
before(src("number-researcher"), "mg.runGate(", 'rpc("fn_raziel_persona"', "number-researcher gate before context load");

// gallery-ocr: run-key semantics preserved; secret-optional fail-open closed to verified admin only.
const ocr = src("gallery-ocr");
assert.ok(ocr.includes('req.headers.get("x-run-key") !== RUN_KEY'), "run-key check preserved");
assert.ok(ocr.includes('caller.verified && caller.tier === "admin"'), "no-secret path requires verified admin");
before(ocr, "caller.verified && caller.tier", "mg.runGate(", "auth before gate");
before(ocr, "mg.runGate(", "for (const row of rows)", "gate before scan loop");

// field-router / raziel-attention: classified trace-only; bespoke controls untouched and precede spend.
const fr = src("field-router");
assert.equal(fr.includes("mg.runGate("), false, "field-router keeps bespoke gate (trace only)");
before(fr, "const g = await gate(req)", "mg.beginTrace(", "field-router bespoke gate before trace/provider");
assert.ok(fr.includes("mg.providerSpan(") && !fr.includes("async function logTokens"), "router tokens flow through traced cost link");
const ra = src("raziel-attention");
assert.equal(ra.includes("mg.runGate("), false, "raziel-attention keeps admin gate (trace only)");
before(ra, '"admin_only"', "mg.beginTrace(", "admin gate before trace/provider");
assert.ok(ra.includes("mg.providerSpan("));

console.log("g3-d2 public material path hardening: OK");
