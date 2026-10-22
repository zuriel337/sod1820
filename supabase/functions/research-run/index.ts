// SOD1820 — bounded W2 Research Run transport v1.
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
// Bounded contracts:
//   - public-number-research-run-v1 keeps its exact deterministic numeric/numeric_operators path;
//   - public-expression-crossing-run-v1 admits one bounded Hebrew expression for one canonical
//     gematria_api calculation and one existing strongest_crossings public-corpus call;
//   - personal-gematria-pair-run-v1 admits exactly two personal expressions for one canonical
//     fn_relation_candidate call by an authenticated user.
// Identity inference, private research_objects, graph/ELS dispatch, persistence and every
// model/provider call remain out of scope.
//
// Fail-closed trace discipline: unlike the fail-OPEN trace pattern used elsewhere (a trace hiccup
// must never block a Result the caller is otherwise entitled to), this transport treats the
// Operational Trace as a REQUIRED witness of its own execution. If the trace cannot be started, or any
// span in the gate/compose/capability chain cannot be recorded, or finalization cannot persist,
// the Result Bundle is suppressed and an
// error is returned instead — this function never returns a materially untraced Result.

import { composeResearchW2 } from "../../../src/lib/research/researchComposerW2.js";
import { createCanonicalW2Executors as createPublicNumberW2Executors } from "../../../src/lib/research/researchW2ExecutorsBase.js";
import { createGematriaW2Executor } from "../../../src/lib/research/gematriaW2Executor.js";
import { createGematriaCorpusCrossingW2Executor } from "../../../src/lib/research/gematriaCorpusCrossingW2Executor.js";
import { createGematriaRelationW2Executor, GEMATRIA_RELATION_PAIR_MODE } from "../../../src/lib/research/gematriaRelationW2Executor.js";
import { PERSONAL_GEMATRIA_PAIR_CAPABILITY, PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT, PUBLIC_EXPRESSION_CROSSING_CAPABILITY, PUBLIC_EXPRESSION_CROSSING_RESEARCH_RUN_CONTRACT, normalizeResearchRunRequest } from "../../../src/lib/research/researchRunRequest.js";
import { mergeNumberPhrasePresentationOrder, NUMBER_PHRASE_PRESENTATION_AUTHORITY, NUMBER_PHRASE_PRESENTATION_LIMIT } from "../../../src/lib/research/numberPhrasePresentationOrder.js";

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
// The site's long-lived anonymous identity predates UUID visitor ids (`v` + bounded base36 text).
// It is an opaque rate/trace key, not authentication. Keep accepting UUIDs while admitting only the
// existing bounded browser form; arbitrary free text, whitespace and contact data remain rejected.
const VISITOR_ID_RE = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|v[a-z0-9_-]{7,79})$/i;

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

function safeVisitorId(value: unknown): string | null {
  const text = String(value || "").trim();
  return VISITOR_ID_RE.test(text) ? text : null;
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
// and the server's own service-role gate/trace calls. No second database client is introduced.
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

// One bounded caller-scoped presentation read over the SAME public gematria_words authority already
// used by Legacy and Number 2029. RLS and grants are evaluated with the original caller credential;
// service role never reaches this query. Failure is presentation-only and falls back to the canonical
// numeric order, while the surrounding numeric capability trace still witnesses the attempt.
async function fetchNumberPhrasePresentationRows(apiKey: string, authorization: string, number: number) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/gematria_words`);
  url.searchParams.set("select", "id,phrase,ragil,lead_rank,is_verified,is_published,is_encrypted,node_id,created_at");
  url.searchParams.set("ragil", `eq.${number}`);
  url.searchParams.set("is_verified", "eq.true");
  url.searchParams.set("is_published", "eq.true");
  // Match the existing public RLS boundary exactly: historical null and explicit false are public;
  // true is excluded even for an admin caller so public answer quality stays role-independent.
  url.searchParams.set("or", "(is_encrypted.eq.false,is_encrypted.is.null)");
  url.searchParams.set("lead_rank", "not.is.null");
  url.searchParams.set("order", "lead_rank.asc.nullslast,created_at.desc.nullslast");
  url.searchParams.set("limit", String(NUMBER_PHRASE_PRESENTATION_LIMIT));
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { apikey: apiKey, Authorization: authorization },
    });
    if (!response.ok) return { rows: [], status: "unavailable", http_status: response.status };
    const data = await response.json().catch(() => null);
    if (!Array.isArray(data)) return { rows: [], status: "unavailable", http_status: response.status };
    return { rows: data, status: "available", http_status: response.status };
  } catch {
    return { rows: [], status: "unavailable", http_status: null };
  }
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
  try { run = normalizeResearchRunRequest(body); }
  catch (error) {
    return json({ status: "error", error: "invalid_request", detail: error instanceof Error ? error.message : String(error) }, 400);
  }

  const authHeader = cleanAuthHeader(req);
  if (!authHeader) return json({ status: "error", error: "authorization_required" }, 401);

  const userId = await verifiedUserId(authHeader);
  const personalPair = run.contract === PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT;
  const expressionCrossing = run.contract === PUBLIC_EXPRESSION_CROSSING_RESEARCH_RUN_CONTRACT;
  const publicNumber = !personalPair && !expressionCrossing;
  // Pair input is personal research. A visitor id is never an authentication substitute and the
  // rejection happens before trace/gate/relation I/O.
  if (personalPair && !userId) {
    return json({ status: "error", error: "authenticated_user_required" }, 401);
  }
  const visitorId = userId ? null : safeVisitorId(run.visitor_id);
  if (!userId && !visitorId) {
    return json({ status: "error", error: "visitor_identity_required" }, 400);
  }

  const identity = userId ? `u:${userId}` : `v:${visitorId}`;
  const identityClass = userId ? "authenticated_user" : "public_user";
  const executionCapability = personalPair
    ? "research-w2:gematria-relations"
    : expressionCrossing
      ? "research-w2:public-expression-crossings"
      : "research-w2:public-number";
  // Expression text is never copied into operational trace/replay. It exists only in the ephemeral
  // caller-scoped composition input and the response returned to that caller.
  const subjectRef = personalPair
    ? "expression-pair:ephemeral"
    : expressionCrossing
      ? "expression:ephemeral-public-query"
      : `number:${run.number}`;
  const routingReason = personalPair
    ? "explicit_authenticated_personal_gematria_pair_v1"
    : expressionCrossing
      ? "explicit_public_expression_crossing_v1"
      : "explicit_public_number_golden";
  const replayInputRef = subjectRef;

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
      capability: executionCapability,
      surface: run.surface_context.surface,
      channel: "web",
      locale: "he",
      identity_class: identityClass,
      subject_ref: subjectRef,
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
    p_capability: executionCapability,
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
      capability: executionCapability,
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
  // The public Number Golden remains on the exact base executor tree. The pair transport adds only
  // the canonical relation adapter it is allowed to execute, avoiding the wider browser/runtime
  // executor graph and retaining a hard one-RPC budget.
  const baseExecutors = createPublicNumberW2Executors({
    supabase: callerRpc,
    serverContext: false,
  });
  let presentationRanking: any[] = [];
  const numericExecutor = baseExecutors.numeric;
  const publicExecutors = publicNumber && typeof numericExecutor === "function"
    ? Object.freeze({
        ...baseExecutors,
        numeric: async (args: any) => {
          const [numeric, presentationRead] = await Promise.all([
            numericExecutor(args),
            fetchNumberPhrasePresentationRows(ANON_KEY, authHeader, run.number),
          ]);
          if (numeric?.status !== "executed" || presentationRead.status !== "available") {
            return {
              ...numeric,
              trace: {
                ...(numeric?.trace || {}),
                presentation_order: {
                  authority: NUMBER_PHRASE_PRESENTATION_AUTHORITY.ref,
                  scope: NUMBER_PHRASE_PRESENTATION_AUTHORITY.scope,
                  status: presentationRead.status,
                  row_count: 0,
                  added_finding_count: 0,
                  rpc_calls: 1,
                  ai_calls: 0,
                  retry_count: 0,
                },
              },
            };
          }
          const projected = mergeNumberPhrasePresentationOrder({
            findings: numeric.findings,
            rows: presentationRead.rows,
            number: run.number,
          });
          presentationRanking = [...projected.ranking];
          return {
            ...numeric,
            findings: projected.findings,
            sourceRefs: [...new Set([...(numeric.sourceRefs || []), NUMBER_PHRASE_PRESENTATION_AUTHORITY.ref])],
            versionRefs: [...new Set([...(numeric.versionRefs || []), `number-phrase-presentation-order:v${NUMBER_PHRASE_PRESENTATION_AUTHORITY.version}`])],
            trace: {
              ...(numeric.trace || {}),
              presentation_order: {
                authority: NUMBER_PHRASE_PRESENTATION_AUTHORITY.ref,
                scope: NUMBER_PHRASE_PRESENTATION_AUTHORITY.scope,
                status: "available",
                row_count: projected.row_count,
                added_finding_count: projected.added_count,
                rpc_calls: 1,
                ai_calls: 0,
                retry_count: 0,
              },
            },
          };
        },
      })
    : baseExecutors;
  const executors = personalPair
    ? Object.freeze({
        ...baseExecutors,
        [PERSONAL_GEMATRIA_PAIR_CAPABILITY]: createGematriaRelationW2Executor({
          supabase: callerRpc,
          pairMode: GEMATRIA_RELATION_PAIR_MODE.INTAKE_DIRECT_PAIR,
          maxRepresentations: 2,
          maxPairs: 1,
        }),
      })
    : expressionCrossing
      ? Object.freeze({
          gematria: createGematriaW2Executor({
            supabase: callerRpc,
            maxRepresentations: 1,
            controls: false,
          }),
          [PUBLIC_EXPRESSION_CROSSING_CAPABILITY]: createGematriaCorpusCrossingW2Executor({
            supabase: callerRpc,
            limit: 8,
          }),
        })
      : publicExecutors;

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
      rawInput: personalPair ? null : expressionCrossing ? run.expression : String(run.number),
      intake: personalPair ? run.intake : null,
      explicitTextComputation: expressionCrossing,
      authorizationContext,
      contextType: identityClass,
      surfaceContext: run.surface_context,
      requestedCapabilities: run.requested_capabilities,
      // No identity/text inference ever widens this transport's execution plan beyond the exact
      // capabilities the validated request asked for — even if `question` free text mentions more.
      capabilityAllowlist: run.requested_capabilities,
      requestedDepth: personalPair
        ? "personal_gematria_pair_v1"
        : expressionCrossing
          ? "public_expression_crossing_v1"
          : "golden_public_number_v1",
      executors,
      rankingResolver: publicNumber ? () => presentationRanking : null,
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
  const planRef = personalPair
    ? "research-plan-v2:personal-gematria-pair"
    : expressionCrossing
      ? "research-plan-v2:public-expression-crossing"
      : `research-plan-v2:number:${run.number}`;
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
      capability: executionCapability,
      owner_ref: "research_strategy_layer_law v17",
      plan_ref: planRef,
      routing_reason: routingReason,
      output_use: "used",
      resources: { capability_count: capabilityEvents.length },
      cost: { certainty: "not_billable" },
      replay: {
        inputRef: replayInputRef,
        ownerRuleRefs: ["research_strategy_layer_law v17", "research_workspace_law v5"],
        parametersRef: run.contract,
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
        replay: { inputRef: replayInputRef },
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
  const finished = await serviceRpc("op_trace_finish_v1", {
    p_trace_id: traceId,
    p_root_span_id: rootSpanId,
    p_outcome: outcome,
    p_ended_at: new Date().toISOString(),
    p_stop_reason: null,
  });
  if (!finished) {
    // Computed Findings are not a completed Result until the root trace is finalized.
    return json({ status: "error", error: "trace_incomplete", trace_id: traceId }, 200);
  }

  return json({
    status: "ok",
    contract: run.contract,
    trace_id: traceId,
    bundle,
  });
});
