import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizePublicNumberResearchRunRequest } from "../src/lib/research/researchRunRequest.js";
import { composeResearchW2 } from "../src/lib/research/researchComposerW2.js";

const edge = readFileSync("supabase/functions/research-run/index.ts", "utf8");
const packager = readFileSync("scripts/package-research-run.mjs", "utf8");

const req = normalizePublicNumberResearchRunRequest({
  number: "358",
  question: "תחקור את 358",
  visitor_id: "11111111-1111-4111-8111-111111111111",
  requested_capabilities: ["numeric", "numeric_operators"],
  surface: "number",
});
assert.equal(req.number, 358);
assert.equal(req.identity_candidates[0].type, "number");
assert.equal(req.identity_candidates[0].source, "numeric_literal");
assert.equal(req.identity_candidates[0].confidence, "exact");
assert.deepEqual(req.requested_capabilities, ["numeric", "numeric_operators"]);

assert.throws(() => normalizePublicNumberResearchRunRequest({ number: "358", requested_capabilities: ["research_objects"] }), /capability not allowed/);
assert.throws(() => normalizePublicNumberResearchRunRequest({ number: "358", requested_capabilities: ["els"] }), /capability not allowed/);
assert.throws(() => normalizePublicNumberResearchRunRequest({ number: "-1" }), /canonical non-negative number/);
assert.throws(() => normalizePublicNumberResearchRunRequest({ number: "358", surface: "private-room" }), /unsupported surface/);

const events = [];
const noFindings = async ({ capability }) => ({
  owner: "test-owner",
  status: "executed",
  findings: [],
  trace: { capability },
});
await composeResearchW2({
  question: "358",
  identityCandidates: req.identity_candidates,
  requestedCapabilities: req.requested_capabilities,
  executors: {
    numeric: noFindings,
    numeric_operators: noFindings,
    graph: noFindings,
  },
  executionObserver: (event) => events.push(event),
});
assert.equal(events.length >= 3, true);
for (const event of events) {
  assert.equal(event.type, "capability");
  assert.equal(typeof event.started_at, "string");
  assert.equal(typeof event.ended_at, "string");
  assert.equal(Object.prototype.hasOwnProperty.call(event, "findings"), false, "observer must not receive raw findings");
}

// Free-text must never widen the public Number execution plan beyond the normalized allowlist.
// Route grammar may still inspect the original user wording, but capability execution stays bounded.
const hostileReq = normalizePublicNumberResearchRunRequest({
  number: "358",
  question: "בדוק ELS דילוג מקורות graph גימטריה של 358",
  visitor_id: "11111111-1111-4111-8111-111111111111",
  requested_capabilities: ["numeric", "numeric_operators"],
  surface: "heichal",
});
const hostileCalls = [];
const hostileExecutor = (key) => async () => {
  hostileCalls.push(key);
  return {
    owner: "test-owner",
    status: "executed",
    findings: [],
    sourceRefs: [],
    versionRefs: ["test:v1"],
  };
};
const hostileBundle = await composeResearchW2({
  question: hostileReq.question,
  intent: hostileReq.intent,
  identityCandidates: hostileReq.identity_candidates,
  rawInput: String(hostileReq.number),
  surfaceContext: hostileReq.surface_context,
  requestedCapabilities: hostileReq.requested_capabilities,
  capabilityAllowlist: hostileReq.requested_capabilities,
  executors: {
    numeric: hostileExecutor("numeric"),
    numeric_operators: hostileExecutor("numeric_operators"),
    graph: hostileExecutor("graph"),
    els: hostileExecutor("els"),
    gematria: hostileExecutor("gematria"),
    sources: hostileExecutor("sources"),
  },
});
assert.deepEqual(hostileCalls, ["numeric", "numeric_operators"]);
assert.deepEqual(hostileBundle.plan.requested_capabilities, ["numeric", "numeric_operators"]);
assert.deepEqual(hostileBundle.plan.check_order, ["numeric", "numeric_operators"]);
assert.deepEqual(hostileBundle.plan.capability_allowlist, ["numeric", "numeric_operators"]);
assert.equal(hostileBundle.plan.guards.capability_allowlist_applied_before_strategy, true);
assert.equal(hostileBundle.plan.route_grammar.surface, "heichal");

// Server gate and trace must precede/contain the real runtime boundary.
assert.match(edge, /fn_capability_execution_gate_v1/);
assert.match(edge, /capabilityAllowlist:\s*run\.requested_capabilities/);
assert.match(edge, /op_trace_begin_v1/);
assert.match(edge, /op_trace_record_span_v1/);
assert.match(edge, /op_trace_finish_v1/);
assert.equal(edge.indexOf("fn_capability_execution_gate_v1") < edge.indexOf("bundle = await composeResearchW2"), true);

// The canonical executors receive caller credentials, never service-role credentials.
assert.match(edge, /researchW2ExecutorsBase\.js/);
assert.doesNotMatch(edge, /researchW2Executors\.js/);
assert.match(edge, /const callerRpc = rpcTransport\(ANON, authHeader\)/);
assert.match(edge, /createCanonicalW2Executors\(\{[\s\S]*supabase: callerRpc,[\s\S]*serverContext: false/);
assert.doesNotMatch(edge, /createCanonicalW2Executors\(\{[\s\S]{0,300}SERVICE/);

// User identity is verified by Supabase Auth, never trusted from request JSON.
assert.match(edge, /\/auth\/v1\/user/);
assert.doesNotMatch(edge, /body\?\.user_ref|body\.user_ref/);

// This Golden is deterministic: no model/provider invocation belongs in the transport.
assert.doesNotMatch(edge, /ANTHROPIC|GEMINI|OPENAI|runClaude|runGemini/);
assert.match(packager, /verify_jwt:\s*true/);
assert.match(packager, /requires a clean committed tree/);

console.log("PASS: research-run public Number runtime contract");
