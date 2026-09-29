// SOD1820 — public-number W2 Research Run transport v1.
//
// Thin server boundary over the canonical W2 Composer + canonical executor tree. No second Research
// engine/store/router is created here. No model/provider call. No persistence/publication decision.
// Packaging MUST keep verify_jwt=true (see scripts/package-research-run.mjs).
//
// Authority split (never collapsed):
//   - service-role REST/RPC is used ONLY for the server capability/entitlement gate and the
//     Operational Trace — both server-authoritative safety/observability boundaries;
//   - the actual research executors run with the CALLER's own Authorization credential, so caller
//     RLS/permissions apply exactly as they would from the browser. Service role is never handed to
//     a canonical executor.
//
// Bounded scope: this Golden accepts only an explicit canonical non-negative Number literal and only
// the deterministic `numeric` / `numeric_operators` capabilities (researchRunRequest.js). Identity
// inference, private research_objects, graph resolution, ELS, Gematria and any model/provider call
// are intentionally out of scope of this transport.
//
// Fail-closed trace discipline: unlike the fail-OPEN trace pattern used elsewhere (a trace hiccup
// must never block a Result the caller is otherwise entitled to), this transport treats the
// Operational Trace as a REQUIRED witness of its own execution. If the trace cannot be started, or any
// span in the gate/compose/capability chain cannot be recorded, the Result Bundle is suppressed and an
// error is returned instead — this function never returns a materially untraced Result.

import { composeResearchW2 } from "../../../src/lib/research/researchComposerW2.js";
import { createCanonicalW2Executors } from "../../../src/lib/research/researchW2ExecutorsBase.js";
import { normalizePublicNumberResearchRunRequest } from "../../../src/lib/research/researchRunRequest.js";

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || "").trim();
const ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") || "").trim();
const SERVICE_KEY = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

function safeUuid(value: unknown): string | null {
  const text = String(value || "").trim();
  return UUID_RE.test(text) ? text : null;
}

function cleanAuthHeader(req: Request): string | null {
  const value = String(req.headers.get("authorization") || "").trim();
  return /^Bearer\s+\S+$/i.test(value) ? value : null;
}

async function verifiedUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !SUPABASE_URL || !ANON_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: authHeader },
    });
    if (!r.ok) return null;
    const body = await r.json();
    return safeUuid(body?.id);
  } catch {
    return null;
  }
}

// Minimal { rpc(name, args) -> {data, error} } transport shared by the caller-scoped executor client
// and the server's own service-role gate/trace calls. It is intentionally the ONLY HTTP surface this
// function speaks — no second Postgres/PostgREST client is introduced.
function rpcTransport(apiKey: string, authorization: string) {
  return {
    async rpc(name: string, args: Record<string, unknown> = {}) {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${encodeURIComponent(name)}`, {
          method: "POST",
          headers: {
            apikey: apiKey,
            Authorization: authorization,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(args),
        });
        if (!r.ok) {
          const detail = await r.text().catch(() => "");
          return { data: null, error: { message: `rpc ${name} failed: ${r.status} ${detail.slice(0, 180)}` } };
        }
        const data = await r.json().catch(() => null);
        return { data, error: null };
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
      }
    },
  };
}

async function serviceRpc(name: string, args: Record<string, unknown>): Promise<any> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  const out = await rpcTransport(SERVICE_KEY, `Bearer ${SERVICE_KEY}`).rpc(name, args);
  return out.error ? null : out.data;
}

function capabilityOutcome(status: unknown): string {
  switch (String(status || "")) {
    case "executed": return "success";
    case "negative_result": return "negative_result";
    case "failed": return "tool_error";
    case "context_required": return "access_filtered";
    case "missing_adapter":
    case "unverified":
    case "skipped":
    default: return "failed_with_reason";
  }
}

function bundleOutcome(bundle: any): string {
  if (bundle?.coverage?.partial === true) return "partial";
  if ((bundle?.findings || []).length > 0) return "success";
  if (Number(bundle?.coverage?.negative_result || bundle?.coverage?.negative || 0) > 0) return "negative_result";
  return "partial";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ status: "error", error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) return json({ status: "error", error: "server_not_configured" }, 503);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ status: "error", error: "invalid_json_body" }, 400); }

  let run;
  try { run = normalizePublicNumberResearchRunRequest(body); }
  catch (error) {
    return json({ status: "error", error: "invalid_request", detail: error instanceof Error ? error.message : String(error) }, 400);
  }

  const authHeader = cleanAuthHeader(req);
  if (!authHeader) return json({ status: "error", error: "authorization_required" }, 401);

  const userId = await verifiedUserId(authHeader);
  const visitorId = userId ? null : safeUuid(run.visitor_id);
  if (!userId && !visitorId) {
    return json({ status: "error", error: "visitor_identity_required" }, 400);
  }

  const identity = userId ? `u:${userId}` : `v:${visitorId}`;
  const identityClass = userId ? "authenticated_user" : "public_user";

  // ── Operational Trace: root ─────────────────────────────────────────────────────────────
  // Service role only. Fail CLOSED: if the root trace cannot begin, no gate/compose call runs.
  const traceId = crypto.randomUUID();
  const rootSpanId = crypto.randomUUID();
  const traceStartedAt = new Date().toISOString();

  const begun = await serviceRpc("op_trace_begin_v1", {
    p_trace_id: traceId,
    p_root_span_id: rootSpanId,
    p_context: {
      interaction_id: safeUuid(run.interaction_id),
      capability: "research-w2:public-number",
      surface: run.surface_context.surface,
      channel: "web",
      locale: "he",
      identity_class: identityClass,
      subject_ref: `number:${run.number}`,
      root_name: "research-run",
      owner_ref: "research_strategy_layer_law v17 + research_workspace_law v5",
    },
    p_started_at: traceStartedAt,
  });
  if (!begun) return json({ status: "error", error: "trace_unavailable" }, 503);

  // ── Server capability / entitlement / budget gate ───────────────────────────────────────
  // Service role only, and it MUST run before any research RPC executes. Deterministic Number
  // research is not AI-metered, so budget_kind is "none" — availability/entitlement still apply.
  const gateSpanId = crypto.randomUUID();
  const gateStartedAt = new Date().toISOString();
  const gate = await serviceRpc("fn_capability_execution_gate_v1", {
    p_capability: "research-w2:public-number",
    p_flag_key: null,
    p_required_entitlement: "public",
    p_user_ref: userId,
    p_visitor: visitorId,
    p_identity: identity,
    p_budget_kind: "none",
    p_budget_tier: null,
    p_budget_limit_override: null,
  });
  const gateEndedAt = new Date().toISOString();
  const gateAllowed = gate?.allowed === true;

  const gateTraced = await serviceRpc("op_trace_record_span_v1", {
    p_trace_id: traceId,
    p_span_id: gateSpanId,
    p_parent_span_id: rootSpanId,
    p_kind: "db_rpc",
    p_name: "fn_capability_execution_gate_v1",
    p_started_at: gateStartedAt,
    p_ended_at: gateEndedAt,
    p_outcome: gate ? (gateAllowed ? "success" : "access_filtered") : "failed_with_reason",
    p_detail: {
      capability: "research-w2:public-number",
      owner_ref: "site_flags_lock_law v3 + platform_tiers_law v4 + ai_quota_law v3",
      output_use: "not_applicable",
      stop_reason: gate ? (gateAllowed ? null : "gate_denied") : "gate_unavailable",
      resources: { rpc_calls: 1 },
      cost: { certainty: "not_billable" },
      replay: { ownerRuleRefs: ["site_flags_lock_law v3", "platform_tiers_law v4", "ai_quota_law v3"] },
      privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
    },
  });

  // Fail closed on EITHER the gate itself or the trace of the gate: an unwitnessed gate decision
  // must never be trusted to authorize a research RPC.
  if (!gateTraced || !gate || !gateAllowed) {
    await serviceRpc("op_trace_finish_v1", {
      p_trace_id: traceId,
      p_root_span_id: rootSpanId,
      p_outcome: gate ? "access_filtered" : "failed_with_reason",
      p_ended_at: new Date().toISOString(),
      p_stop_reason: gate ? "gate_denied" : "gate_unavailable",
    });
    return json({
      status: "error",
      error: !gate ? "gate_unavailable" : !gateTraced ? "trace_incomplete" : "access_filtered",
      trace_id: traceId,
    }, 200);
  }

  // ── Research execution: CALLER credential only ──────────────────────────────────────────
  // Service role is never passed to the canonical executors — caller RLS/permissions apply exactly
  // as they would from a direct browser call.
  const callerRpc = rpcTransport(ANON_KEY, authHeader);
  const executors = createCanonicalW2Executors({
    supabase: callerRpc,
    serverContext: false,
  });

  const capabilityEvents: any[] = [];
  const composeSpanId = crypto.randomUUID();
  const composeStartedAt = new Date().toISOString();

  const authorizationContext = userId ? {
    verified_authority: {
      source: "supabase_auth",
      subject_verified: true,
      admin: gate?.entitlement?.is_admin === true,
    },
    entitlement_level: gate?.entitlement?.entitlement || null,
  } : null;

  let bundle: any;
  try {
    bundle = await composeResearchW2({
      question: run.question,
      intent: run.intent,
      identityCandidates: run.identity_candidates,
      rawInput: String(run.number),
      explicitTextComputation: false,
      authorizationContext,
      contextType: identityClass,
      surfaceContext: run.surface_context,
      requestedCapabilities: run.requested_capabilities,
      // No identity/text inference ever widens this transport's execution plan beyond the exact
      // capabilities the validated request asked for — even if `question` free text mentions more.
      capabilityAllowlist: run.requested_capabilities,
      requestedDepth: "golden_public_number_v1",
      executors,
      // Timestamps/status/counts only — never raw Findings/content cross this boundary.
      executionObserver: (event: any) => capabilityEvents.push(event),
    });
  } catch {
    await serviceRpc("op_trace_finish_v1", {
      p_trace_id: traceId,
      p_root_span_id: rootSpanId,
      p_outcome: "failed_with_reason",
      p_ended_at: new Date().toISOString(),
      p_stop_reason: "composer_failed",
    });
    return json({ status: "error", error: "research_failed", trace_id: traceId }, 200);
  }

  const composeEndedAt = new Date().toISOString();
  const planRef = `research-plan-v2:number:${run.number}`;
  const composeTraced = await serviceRpc("op_trace_record_span_v1", {
    p_trace_id: traceId,
    p_span_id: composeSpanId,
    p_parent_span_id: rootSpanId,
    p_kind: "router_plan",
    p_name: "composeResearchW2",
    p_started_at: composeStartedAt,
    p_ended_at: composeEndedAt,
    p_outcome: bundleOutcome(bundle),
    p_detail: {
      capability: "research-w2:public-number",
      owner_ref: "research_strategy_layer_law v17",
      plan_ref: planRef,
      routing_reason: "explicit_public_number_golden",
      output_use: "used",
      resources: { capability_count: capabilityEvents.length },
      cost: { certainty: "not_billable" },
      replay: {
        inputRef: `number:${run.number}`,
        ownerRuleRefs: ["research_strategy_layer_law v17", "research_workspace_law v5"],
        parametersRef: "public-number-research-run-v1",
      },
      privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
    },
  });

  // Root→gate→composer→per-capability spans. Every one of them must be recorded or the whole Result
  // Bundle is suppressed (fail closed) — this transport never returns a materially untraced Result.
  let traceComplete = !!composeTraced;
  for (const event of capabilityEvents) {
    const span = await serviceRpc("op_trace_record_span_v1", {
      p_trace_id: traceId,
      p_span_id: crypto.randomUUID(),
      p_parent_span_id: composeSpanId,
      p_kind: "engine",
      p_name: `w2:${event.capability}`,
      p_started_at: event.started_at,
      p_ended_at: event.ended_at,
      p_outcome: capabilityOutcome(event.status),
      p_detail: {
        capability: event.capability,
        owner_ref: event.owner || "research_strategy_layer_law v17",
        plan_ref: planRef,
        output_use: event.finding_count > 0 ? "used" : "not_applicable",
        resources: {
          findings: event.finding_count,
          bounded: event.bounded || null,
        },
        cost: { certainty: "not_billable" },
        replay: { inputRef: `number:${run.number}` },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
    if (!span) traceComplete = false;
  }

  if (!traceComplete) {
    await serviceRpc("op_trace_finish_v1", {
      p_trace_id: traceId,
      p_root_span_id: rootSpanId,
      p_outcome: "failed_with_reason",
      p_ended_at: new Date().toISOString(),
      p_stop_reason: "trace_incomplete",
    });
    // Fail closed: the Result Bundle already computed is never returned without a complete trace.
    return json({ status: "error", error: "trace_incomplete", trace_id: traceId }, 200);
  }

  const outcome = bundleOutcome(bundle);
  await serviceRpc("op_trace_finish_v1", {
    p_trace_id: traceId,
    p_root_span_id: rootSpanId,
    p_outcome: outcome,
    p_ended_at: new Date().toISOString(),
    p_stop_reason: null,
  });

  return json({
    status: "ok",
    contract: run.contract,
    trace_id: traceId,
    bundle,
  });
});
