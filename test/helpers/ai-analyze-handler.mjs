import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import { selectRazielIntelligence, RAZIEL_LEVELS } from "../../supabase/functions/_shared/razielIntelligence.js";
import { whatsappSurfaceProfileText, continuationHrefFromSurface } from "../../supabase/functions/_shared/waRazielRender.ts";
import { supabaseServiceHeaders } from "../../supabase/functions/_shared/supabaseServiceHeaders.js";
import { buildRazielResultBundleConsumer } from "../../src/lib/research/razielResultBundleConsumer.js";
import { buildRazielGroundedSourceComposer } from "../../src/lib/research/razielGroundedSourceComposer.js";
import {
  RAZIEL_SEMANTIC_INTENT_VERSION,
  resolveExplicitNumericPairResearchSubject,
  resolveExplicitNumericResearchSubject,
  resolveRazielConversationalAct,
  validateRazielSemanticIntent,
} from "../../src/lib/research/razielSemanticIntentGate.js";

export const UID = "11111111-2222-4333-8444-555555555555";
export const OTHER_UID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
export const USER_JWT = "synthetic-user-jwt";
export const SERVICE_KEY = "synthetic-service-key";
export const PRIVATE = "PRIVATE-PAYLOAD-SENTINEL";

export const toolAnswer = () => ({
  enabled: true, mode: "tool_research", needs_synthesis: true,
  capability_class: "general_synthesis", minimum_intelligence: "L3_DEEP",
  signals: { route_intent: "multi_domain" },
  tool_research: {
    contract: "tool_research_v1", status: "complete", subject: PRIVATE,
    specialists: [
      { capability: "gematria", status: "ok", ms: 7 },
      { capability: "els", status: "ok", ms: 9 },
    ],
    findings_by_capability: { gematria: { value: 358 }, els: { els_count: 292, private_text: PRIVATE } },
    evidence_by_capability: { gematria: { source_of_truth: "fixture-g" }, els: { source_of_truth: "fixture-e" } },
  },
});
export const personalAnswer = () => ({
  enabled: true, availability: "personal_research_read",
  capability_class: "personal_research", minimum_intelligence: "L0_DETERMINISTIC",
  trace: { personal: { capability: "personal_saved" } },
});
export const personalSnapshot = () => ({
  saved: [{ type: "post", ref: "fixture-post", title: "Saved fixture", metadata: PRIVATE }],
  cart: [], pinned: [], history: [], collections: [], journeys: [], context: PRIVATE,
});

// Execute the complete Edge handler, erasing types and replacing only its imports.
// A separate VM per request has synthetic env + fetch, never native network access.
// Unexpected I/O is also asserted AFTER the handler (which has fail-open catches).
export async function runAiAnalyze({
  answer = toolAnswer(), allowed = false, siteAllowed = true, bearer = "", verifiedUid = null,
  trustedUid = null, snapshot = personalSnapshot(), body = {}, traceFailure = null,
  modelResult = null, modelResults = null, numberContextByNumber = {}, researchBundleByNumber = {},
  researchBundleByExpression = {},
  researchRunFailure = null, legacyContext = null, genericProviderText = null,
  source = readFileSync(new URL("../../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8"),
} = {}) {
  const calls = [], models = [], unexpected = [];
  const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
  const fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const name = url.pathname.split("/").at(-1);
    const payload = init.body ? JSON.parse(init.body) : null;
    const call = { name, url: url.href, method: init.method || "GET", headers: Object.fromEntries(new Headers(init.headers)), payload };
    calls.push(call);
    if (url.origin === "https://api.anthropic.com" && genericProviderText != null) {
      return response({
        content: [{ type: "text", text: String(genericProviderText) }],
        usage: { input_tokens: 9, output_tokens: 3 },
      });
    }
    if (url.origin === "https://fixture.invalid") {
      if (url.pathname === "/functions/v1/research-run") {
        if (researchRunFailure) return response({ status: "error", error: researchRunFailure }, 200);
        const expressionContract = payload?.contract === "public-expression-crossing-run-v1";
        const bundle = expressionContract
          ? researchBundleByExpression[payload?.expression]
          : researchBundleByNumber[payload?.number];
        return bundle
          ? response({ status: "ok", contract: payload?.contract, trace_id: randomUUID(), bundle })
          : response({ status: "error", error: "research_fixture_missing" }, 200);
      }
      if (url.pathname === "/auth/v1/user") return response(verifiedUid ? { id: verifiedUid } : {}, verifiedUid ? 200 : 401);
      if (url.pathname === "/rest/v1/users") return response([{ role: "user" }]);
      if (url.pathname === "/rest/v1/ai_token_log") return response([{ id: 1 }]);
      if (url.pathname.startsWith("/rest/v1/rpc/")) {
        if (traceFailure?.rpc === name) {
          if (traceFailure.mode === "throw") throw new Error("synthetic trace outage");
          return response({ error: "synthetic trace outage" }, 503);
        }
        switch (name) {
          case "fn_capability_execution_gate_v1":
            if (payload.p_capability === "ai-analyze:raziel:site") {
              assert.equal(payload.p_flag_key, "lock_raziel_site");
              assert.equal(payload.p_required_entitlement, "public");
              assert.equal(payload.p_budget_kind, "none");
              return response({ allowed: siteAllowed, availability: {
                state: siteAllowed ? "open" : "closed", allowed: siteAllowed,
                message: siteAllowed ? "" : "Synthetic site availability closure",
              } });
            }
            assert.equal(payload.p_flag_key, null);
            assert.equal(payload.p_required_entitlement, "public");
            assert.equal(payload.p_budget_kind, "ai_quota");
            return response({
              allowed,
              availability: { allowed: true },
              entitlement: { allowed: true },
              budget: { allowed, used: allowed ? 0 : 15, limit: 30, tier: payload.p_budget_tier },
            });
          case "fn_raziel_answer": return response(answer);
          case "fn_raziel_plan": return response(null);
          case "number_map": return response(numberContextByNumber[payload?.n]?.map ?? null,
            numberContextByNumber[payload?.n]?.map ? 200 : 404);
          case "number_dossier_json": return response(numberContextByNumber[payload?.n]?.dossier ?? null,
            numberContextByNumber[payload?.n]?.dossier ? 200 : 404);
          case "ai_quota_check": return response({ allowed, used: 15, limit: 15, tier: payload.p_tier });
          case "research_state_snapshot_v1": return response(snapshot);
          case "fn_raziel_identity": return response({ linked: !!trustedUid, user_id: trustedUid });
          case "op_trace_begin_v1": return response({ trace_id: payload.p_trace_id, root_span_id: payload.p_root_span_id });
          case "op_trace_record_span_v1":
          case "op_trace_finish_v1":
          case "op_trace_link_ai_cost_v1": return response({ ok: true });
          case "fn_raziel_persona":
          case "fn_raziel_remember":
          case "metatron_context": return response(null);
          case "fn_raziel_context": return response(legacyContext);
        }
      }
    }
    unexpected.push(call);
    throw new Error(`Unexpected mocked endpoint: ${url}`);
  };
  const env = {
    SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    SUPABASE_ANON_KEY: "synthetic-anon-key", ANTHROPIC_API_KEY: "synthetic-model-key",
  };
  const imports = [...source.matchAll(/^import .*;$/gm)].map(([line]) => line);
  assert.equal(imports.length, 7, "review any new handler dependency before mocking it");
  assert.ok(imports[0].includes('import { callClaudeReliable }'));
  assert.ok(imports[1].includes('import { selectRazielIntelligence, RAZIEL_LEVELS }'));
  assert.ok(imports[2].includes('import { whatsappSurfaceProfileText, continuationHrefFromSurface }'));
  assert.ok(imports[3].includes('import { supabaseServiceHeaders }'));
  assert.ok(imports[4].includes('import { buildRazielResultBundleConsumer }'));
  assert.ok(imports[5].includes('import { buildRazielGroundedSourceComposer }'));
  assert.ok(imports[6].includes('RAZIEL_SEMANTIC_INTENT_VERSION'));
  assert.ok(imports[6].includes('resolveExplicitNumericPairResearchSubject'));
  assert.ok(imports[6].includes('resolveExplicitNumericResearchSubject'));
  assert.ok(imports[6].includes('resolveRazielConversationalAct'));
  assert.ok(imports[6].includes('validateRazielSemanticIntent'));
  let handler;
  runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\n/gm, "")), {
    Deno: { env: { get: (key) => env[key] }, serve: (fn) => { handler = fn; } },
    fetch, Request, Response, Headers, URL, AbortSignal, TextEncoder, TextDecoder,
    crypto: { randomUUID }, selectRazielIntelligence, RAZIEL_LEVELS,
    whatsappSurfaceProfileText, continuationHrefFromSurface,
    supabaseServiceHeaders,
    buildRazielResultBundleConsumer,
    buildRazielGroundedSourceComposer,
    RAZIEL_SEMANTIC_INTENT_VERSION,
    resolveExplicitNumericPairResearchSubject,
    resolveExplicitNumericResearchSubject,
    resolveRazielConversationalAct,
    validateRazielSemanticIntent,
    callClaudeReliable: async (options) => {
      models.push(options);
      const sequence = Array.isArray(modelResults) ? modelResults : null;
      if (sequence?.length) return sequence[Math.min(models.length - 1, sequence.length - 1)];
      if (modelResult) return modelResult;
      return { text: JSON.stringify({ v: 1, agent: "raziel", answer: "Mock synthesis", facts: [], suggested_paths: [] }),
        usage: { input_tokens: 11, output_tokens: 7 }, attempts: 1, degraded: false };
    },
  }, { filename: "ai-analyze/index.ts", timeout: 5000 });
  assert.equal(typeof handler, "function");
  const res = await handler(new Request("https://fixture.invalid/functions/v1/ai-analyze", {
    method: "POST", headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify({ persona: "raziel", subject: PRIVATE, visitor_id: "fixture-visitor", ...body }),
  }));
  const result = await res.json();
  assert.deepEqual(unexpected, [], "no unmocked I/O, including errors swallowed by fail-open paths");
  return {
    status: res.status, result, calls, models,
    traces: calls.filter((c) => c.name.startsWith("op_trace_")),
    spans: calls.filter((c) => c.name === "op_trace_record_span_v1").map((c) => c.payload),
    personal: calls.filter((c) => ["research_state_snapshot_v1", "fn_research_path_resume_v1"].includes(c.name)),
  };
}
