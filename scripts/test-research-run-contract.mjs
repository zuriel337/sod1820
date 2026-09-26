// scripts/test-research-run-contract.mjs
//
// Unit-level acceptance for the bounded public Number Research Run runtime delta:
//   1. researchRunRequest.js contract validation (accepts numeric/numeric_operators, rejects others).
//   2. researchComposerW2.js's OPTIONAL executionObserver seam (timestamps/status/counts only).
//   3. researchPlanV2.js's OPTIONAL capabilityAllowlist seam (filters inferred hints, never widens
//      execution beyond what a validated request asked for, even when free-text `question` mentions
//      other capabilities).
//   4. Static acceptance that the research-run Edge transport wires the server gate + fail-closed
//      Operational Trace before any research RPC, and that canonical executors run with the CALLER
//      credential, never service-role.
//
// No live network/Edge calls. No DB. No model/provider call.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PUBLIC_NUMBER_RESEARCH_CAPABILITIES,
  normalizePublicNumberResearchRunRequest,
} from "../src/lib/research/researchRunRequest.js";
import { composeResearchW2 } from "../src/lib/research/researchComposerW2.js";

// ── 1. researchRunRequest.js contract validation ──────────────────────────────────────────────
assert.deepEqual(PUBLIC_NUMBER_RESEARCH_CAPABILITIES, ["numeric", "numeric_operators"]);

const req = normalizePublicNumberResearchRunRequest({
  number: "358",
  question: "תחקור את 358",
  visitor_id: "11111111-1111-4111-8111-111111111111",
  requested_capabilities: ["numeric", "numeric_operators"],
  surface: "number",
});
assert.equal(req.contract, "public-number-research-run-v1");
assert.equal(req.number, 358);
assert.equal(req.identity_candidates.length, 1);
assert.equal(req.identity_candidates[0].type, "number");
assert.equal(req.identity_candidates[0].value, 358);
assert.equal(req.identity_candidates[0].source, "numeric_literal");
assert.equal(req.identity_candidates[0].confidence, "exact");
assert.deepEqual(req.requested_capabilities, ["numeric", "numeric_operators"]);
assert.equal(req.surface_context.surface, "number");

// Default requested_capabilities (omitted) falls back to the full allowed set, never wider.
const defaulted = normalizePublicNumberResearchRunRequest({ number: "7" });
assert.deepEqual(defaulted.requested_capabilities, ["numeric", "numeric_operators"]);

// Deterministic numeric/numeric_operators only — every other capability kind is rejected.
assert.throws(
  () => normalizePublicNumberResearchRunRequest({ number: "358", requested_capabilities: ["research_objects"] }),
  /capability not allowed/,
);
assert.throws(
  () => normalizePublicNumberResearchRunRequest({ number: "358", requested_capabilities: ["els"] }),
  /capability not allowed/,
);
assert.throws(
  () => normalizePublicNumberResearchRunRequest({ number: "358", requested_capabilities: ["gematria", "sources", "graph"] }),
  /capability not allowed/,
);
assert.throws(() => normalizePublicNumberResearchRunRequest({ number: "-1" }), /canonical non-negative number/);
assert.throws(() => normalizePublicNumberResearchRunRequest({ number: "not-a-number" }), /canonical non-negative number/);
assert.throws(() => normalizePublicNumberResearchRunRequest({ number: "358", surface: "private-room" }), /unsupported surface/);
assert.throws(() => normalizePublicNumberResearchRunRequest({ number: "358", requested_capabilities: [] }), /at least one requested capability/);
assert.throws(() => normalizePublicNumberResearchRunRequest(null), /object body required/);
assert.throws(() => normalizePublicNumberResearchRunRequest([1, 2]), /object body required/);

console.log("PASS: researchRunRequest.js contract validation");

// ── 2. researchComposerW2.js executionObserver seam ───────────────────────────────────────────
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
assert.equal(events.length >= 2, true, "observer must see at least the requested capabilities");
for (const event of events) {
  assert.equal(event.type, "capability");
  assert.equal(typeof event.capability, "string");
  assert.equal(typeof event.started_at, "string");
  assert.equal(typeof event.ended_at, "string");
  assert.equal(typeof event.finding_count, "number");
  assert.equal(Object.prototype.hasOwnProperty.call(event, "findings"), false, "observer must never receive raw findings");
  assert.equal(Object.prototype.hasOwnProperty.call(event, "trace"), false, "observer must never receive raw capability trace/content");
}

// A throwing observer must never alter composition semantics (privacy-safe observability only).
const throwingBundle = await composeResearchW2({
  question: "358",
  identityCandidates: req.identity_candidates,
  requestedCapabilities: req.requested_capabilities,
  executors: { numeric: noFindings, numeric_operators: noFindings },
  executionObserver: () => { throw new Error("observer must be swallowed"); },
});
assert.equal(throwingBundle.plan.requested_capabilities.length > 0, true);

// Omitting the observer entirely must behave exactly as before this seam existed.
const withoutObserver = await composeResearchW2({
  question: "358",
  identityCandidates: req.identity_candidates,
  requestedCapabilities: req.requested_capabilities,
  executors: { numeric: noFindings, numeric_operators: noFindings },
});
assert.equal(withoutObserver.plan.requested_capabilities.length > 0, true);

console.log("PASS: researchComposerW2.js executionObserver seam");

// ── 3. researchPlanV2.js capabilityAllowlist seam ─────────────────────────────────────────────
// Free-text must never widen the public Number execution plan beyond the normalized allowlist.
// Route grammar may still inspect the ORIGINAL user wording, but capability execution stays bounded.
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
  return { owner: "test-owner", status: "executed", findings: [], sourceRefs: [], versionRefs: ["test:v1"] };
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
assert.deepEqual(hostileCalls.sort(), ["numeric", "numeric_operators"]);
assert.deepEqual(hostileBundle.plan.requested_capabilities, ["numeric", "numeric_operators"]);
assert.deepEqual(hostileBundle.plan.check_order, ["numeric", "numeric_operators"]);
assert.deepEqual(hostileBundle.plan.capability_allowlist, ["numeric", "numeric_operators"]);
assert.equal(hostileBundle.plan.guards.capability_allowlist_applied_before_strategy, true);
// route_grammar keeps reasoning over the ORIGINAL question/surface — it is never narrowed by the
// execution allowlist.
assert.equal(hostileBundle.plan.route_grammar.surface, "heichal");

// Backward compatibility: omitting capabilityAllowlist must reproduce today's unfiltered behavior.
const unfilteredBundle = await composeResearchW2({
  question: hostileReq.question,
  intent: hostileReq.intent,
  identityCandidates: hostileReq.identity_candidates,
  rawInput: String(hostileReq.number),
  surfaceContext: hostileReq.surface_context,
  requestedCapabilities: hostileReq.requested_capabilities,
  executors: {
    numeric: hostileExecutor("numeric"),
    numeric_operators: hostileExecutor("numeric_operators"),
  },
});
assert.equal(unfilteredBundle.plan.capability_allowlist, null);
assert.equal(unfilteredBundle.plan.guards.capability_allowlist_applied_before_strategy, false);

console.log("PASS: researchPlanV2.js capabilityAllowlist seam");

// ── 4. Static acceptance of the research-run Edge transport ──────────────────────────────────
const edge = readFileSync("supabase/functions/research-run/index.ts", "utf8");
const packager = readFileSync("scripts/package-research-run.mjs", "utf8");

// Server gate and fail-closed trace must precede/contain the real runtime boundary.
assert.match(edge, /fn_capability_execution_gate_v1/);
assert.match(edge, /capabilityAllowlist:\s*run\.requested_capabilities/);
assert.match(edge, /op_trace_begin_v1/);
assert.match(edge, /op_trace_record_span_v1/);
assert.match(edge, /op_trace_finish_v1/);
assert.equal(edge.indexOf("fn_capability_execution_gate_v1") < edge.indexOf("bundle = await composeResearchW2"), true, "server gate must be wired before the composer call");
assert.equal(edge.indexOf("op_trace_begin_v1") < edge.indexOf("fn_capability_execution_gate_v1"), true, "trace must begin before the gate runs");

// Fail-closed discipline: a gate/trace failure must suppress the Result Bundle, not just log it.
assert.match(edge, /trace_incomplete/);
assert.match(edge, /gate_unavailable/);
assert.doesNotMatch(edge, /catch\s*{\s*\/\*\s*trace fail-open/, "research-run must not reuse the fail-open trace pattern; it fails closed");

// The canonical executors receive caller credentials, never service-role credentials.
assert.match(edge, /researchW2ExecutorsBase\.js/);
assert.doesNotMatch(edge, /from ["']\.\.\/\.\.\/\.\.\/src\/lib\/research\/researchW2Executors\.js["']/);
assert.match(edge, /const callerRpc = rpcTransport\(ANON_KEY, authHeader\)/);
assert.match(edge, /createCanonicalW2Executors\(\{[\s\S]{0,80}supabase: callerRpc,[\s\S]{0,80}serverContext: false/);
assert.doesNotMatch(edge, /createCanonicalW2Executors\(\{[\s\S]{0,300}SERVICE_KEY/);

// User identity is verified by Supabase Auth, never trusted from request JSON.
assert.match(edge, /\/auth\/v1\/user/);
assert.doesNotMatch(edge, /body\?\.user_ref|body\.user_ref/);

// This Golden is deterministic: no model/provider invocation belongs in the transport.
assert.doesNotMatch(edge, /ANTHROPIC|GEMINI|OPENAI|runClaude|runGemini/);

// Packaging: verify_jwt must stay true, and packaging must refuse an uncommitted/untracked source.
assert.match(packager, /verify_jwt:\s*true/);
assert.match(packager, /clean committed tree/);
assert.doesNotMatch(packager, /ANTHROPIC|GEMINI|OPENAI/);

console.log("PASS: research-run Edge transport static acceptance");
console.log("PASS: research-run public Number runtime contract");
