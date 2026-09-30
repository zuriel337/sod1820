// SOD1820 — G3 D2 public-material-path hardening helper.
//
// EXTEND_EXISTING only. This module is a thin transport over the already-live owners:
//   - fn_capability_execution_gate_v1   (availability + entitlement + budget; service_role only)
//   - op_trace_begin/record_span/finish/link_ai_cost_v1   (Operational Trace)
//   - ai_token_log (+ trace_id/span_id correlation columns)
// It creates NO registry, entitlement store, quota store, trace store or cost store.
//
// Discipline (mirrors ai-analyze / research-run):
//   - the execution gate FAILS CLOSED: an unavailable or unparsable gate never authorizes provider spend;
//   - trace persistence is fail-OPEN (an observability hiccup must not break a public UX the caller is
//     entitled to), except that a trace that could not begin simply yields no spans;
//   - only bounded refs / counts / ids are logged — never prompts, user text, images or model output.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GATE_OWNER_REF = "site_flags_lock_law v3 + platform_tiers_law v4 + ai_quota_law v3";

function safeUuid(value) {
  const v = String(value || "").trim();
  return UUID_RE.test(v) ? v : null;
}

export function createMaterialGate({
  supabaseUrl,
  serviceKey,
  anonKey = "",
  fetchImpl = (...a) => fetch(...a),
  uuid = () => crypto.randomUUID(),
  now = () => new Date().toISOString(),
} = {}) {
  const url = String(supabaseUrl || "").trim();
  const key = String(serviceKey || "").trim();
  const anon = String(anonKey || "").trim();

  async function serviceRpc(name, args) {
    if (!url || !key) return null;
    try {
      const r = await fetchImpl(`${url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  // Caller identity. A real (non-anon-key) bearer is verified against Supabase Auth; admin is read from
  // public.users.role exactly as ai-analyze does. Guests fall back to visitor_id, then client IP.
  async function resolveCaller(req, body = {}) {
    const token = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (token && token !== anon && token !== key && url) {
      try {
        const r = await fetchImpl(`${url}/auth/v1/user`, { headers: { apikey: anon || token, Authorization: `Bearer ${token}` } });
        if (r.ok) {
          const u = await r.json();
          const uid = safeUuid(u?.id);
          if (uid) {
            let tier = "user";
            try {
              const rr = await fetchImpl(`${url}/rest/v1/users?id=eq.${uid}&select=role`, {
                headers: { apikey: key, Authorization: `Bearer ${key}` },
              });
              const rows = rr.ok ? await rr.json() : [];
              if (rows?.[0]?.role === "admin") tier = "admin";
            } catch { /* default user */ }
            return { userRef: uid, visitor: null, identity: `u:${uid}`, tier, verified: true };
          }
        }
      } catch { /* fall through to guest */ }
    }
    const vid = String(body?.visitor_id || "").slice(0, 60);
    if (vid) return { userRef: null, visitor: vid, identity: `v:${vid}`, tier: "anon", verified: false };
    const ip = String(req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    return { userRef: null, visitor: null, identity: ip ? `ip:${ip}` : "", tier: "anon", verified: false };
  }

  async function beginTrace({ capability, surface, ownerRef, identityClass, rootName, interactionId = null, subjectRef = null }) {
    const traceId = uuid();
    const rootSpanId = uuid();
    const startedAt = now();
    const result = await serviceRpc("op_trace_begin_v1", {
      p_trace_id: traceId,
      p_root_span_id: rootSpanId,
      p_context: {
        interaction_id: safeUuid(interactionId),
        capability,
        surface,
        channel: "web",
        locale: "he",
        identity_class: identityClass,
        subject_ref: subjectRef,
        owner_ref: ownerRef,
        root_name: rootName,
      },
      p_started_at: startedAt,
    });
    if (!result) return null;
    return {
      traceId: safeUuid(result?.trace_id) || traceId,
      rootSpanId: safeUuid(result?.root_span_id) || rootSpanId,
      startedAt,
    };
  }

  async function recordSpan(trace, { spanId = uuid(), parentSpanId = null, kind, name, startedAt, endedAt, outcome, detail = {} }) {
    if (!trace) return null;
    await serviceRpc("op_trace_record_span_v1", {
      p_trace_id: trace.traceId,
      p_span_id: spanId,
      p_parent_span_id: parentSpanId || trace.rootSpanId,
      p_kind: kind,
      p_name: name,
      p_started_at: startedAt,
      p_ended_at: endedAt,
      p_outcome: outcome,
      p_detail: detail,
    });
    return spanId;
  }

  async function finishTrace(trace, outcome, stopReason = null) {
    if (!trace) return;
    await serviceRpc("op_trace_finish_v1", {
      p_trace_id: trace.traceId,
      p_root_span_id: trace.rootSpanId,
      p_outcome: outcome,
      p_ended_at: now(),
      p_stop_reason: stopReason,
    });
  }

  // Server capability / entitlement / budget gate. MUST be awaited before any provider call.
  // Returns { state: "allowed" | "denied" | "unavailable", gate, denial }.
  //   unavailable -> fail closed (gate RPC missing/erroring); denial -> which sub-owner refused.
  async function runGate(trace, { capability, caller, flagKey = null, requiredEntitlement = "public", budgetKind = "none", budgetTier = null, budgetLimitOverride = null, budgetIdentity = null }) {
    const spanId = uuid();
    const startedAt = now();
    const gate = await serviceRpc("fn_capability_execution_gate_v1", {
      p_capability: capability,
      p_flag_key: flagKey,
      p_required_entitlement: requiredEntitlement,
      p_user_ref: caller?.userRef || null,
      p_visitor: caller?.visitor || null,
      p_identity: budgetIdentity ?? caller?.identity ?? "",
      p_budget_kind: budgetKind,
      p_budget_tier: budgetTier,
      p_budget_limit_override: budgetLimitOverride,
    });
    const endedAt = now();
    const allowed = gate?.allowed === true;
    await recordSpan(trace, {
      spanId,
      kind: "db_rpc",
      name: "fn_capability_execution_gate_v1",
      startedAt,
      endedAt,
      outcome: !gate ? "failed_with_reason" : allowed ? "success" : "access_filtered",
      detail: {
        capability,
        owner_ref: GATE_OWNER_REF,
        output_use: "not_applicable",
        stop_reason: !gate ? "gate_unavailable" : allowed ? null : "gate_denied",
        resources: { rpc_calls: 1, latency_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)) },
        cost: { certainty: "not_billable" },
        replay: { ownerRuleRefs: ["site_flags_lock_law v3", "platform_tiers_law v4", "ai_quota_law v3"] },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
    if (!gate) {
      await finishTrace(trace, "failed_with_reason", "gate_unavailable");
      return { state: "unavailable", gate: null, denial: "gate_unavailable" };
    }
    if (!allowed) {
      const denial = gate?.availability?.allowed === false ? "availability"
        : gate?.entitlement?.allowed === false ? "entitlement"
        : gate?.budget?.allowed === false ? "quota" : "access";
      await finishTrace(trace, "access_filtered", denial);
      return { state: "denied", gate, denial };
    }
    return { state: "allowed", gate, denial: null };
  }

  // ai_token_log insert, correlated to the model span (same on-conflict idempotency as ai-analyze).
  async function logTokens({ source, kind, model, usage, userRef = null, visitor = null, trace = null, spanId = null }) {
    try {
      if (!url || !key || !usage) return null;
      const hasTrace = !!(trace?.traceId && spanId);
      const legacyRow = {
        source, kind, model,
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        user_id: userRef, visitor,
      };
      const insert = (withTrace) => fetchImpl(
        `${url}/rest/v1/ai_token_log${withTrace ? "?on_conflict=trace_id,span_id&select=id" : "?select=id"}`,
        {
          method: "POST",
          headers: {
            apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
            Prefer: withTrace ? "resolution=ignore-duplicates,return=representation" : "return=representation",
          },
          body: JSON.stringify(withTrace ? { ...legacyRow, trace_id: trace.traceId, span_id: spanId } : legacyRow),
        },
      );
      let r = await insert(hasTrace);
      if (!r.ok && hasTrace) r = await insert(false); // trace correlation must never break the cost log
      if (!r.ok) return null;
      const rows = await r.json().catch(() => []);
      const id = Number(Array.isArray(rows) ? rows?.[0]?.id : rows?.id);
      return Number.isFinite(id) && id > 0 ? id : null;
    } catch {
      return null;
    }
  }

  // Wraps ONE material provider execution in a `model_call` span, logs tokens, links exact cost.
  // `run()` resolves to { error?: string|null, usage?: {input_tokens,output_tokens}, ...payload }.
  // A throw is recorded as provider_error and re-thrown to the caller unchanged.
  async function providerSpan(trace, { capability, name, ownerRef, provider = "anthropic", model, source, kind, caller = null, run }) {
    const spanId = uuid();
    const startedAt = now();
    let out;
    let thrown = null;
    try { out = await run(); } catch (e) { thrown = e; out = { error: "exception" }; }
    const endedAt = now();
    const failed = !!(thrown || out?.error);
    await recordSpan(trace, {
      spanId,
      kind: "model_call",
      name,
      startedAt,
      endedAt,
      outcome: failed ? (out?.error === "refusal" ? "failed_with_reason" : "provider_error") : "success",
      detail: {
        capability,
        owner_ref: ownerRef,
        provider,
        model,
        output_use: failed ? "not_applicable" : "used",
        stop_reason: failed ? String(out?.error || "exception").slice(0, 60) : null,
        retry_ordinal: 0,
        resources: {
          input_tokens: out?.usage?.input_tokens ?? null,
          output_tokens: out?.usage?.output_tokens ?? null,
          api_calls: Number(out?.api_calls ?? 1),
          latency_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
        },
        cost: { certainty: "unknown" },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
    if (out?.usage && source) {
      const tokenLogId = await logTokens({
        source, kind, model, usage: out.usage,
        userRef: caller?.userRef || null, visitor: caller?.visitor || null, trace, spanId,
      });
      if (trace && tokenLogId) {
        await serviceRpc("op_trace_link_ai_cost_v1", {
          p_trace_id: trace.traceId,
          p_span_id: spanId,
          p_ai_token_log_id: tokenLogId,
        });
      }
    }
    if (thrown) throw thrown;
    return out;
  }

  return { serviceRpc, resolveCaller, beginTrace, recordSpan, finishTrace, runGate, logTokens, providerSpan };
}

// Quota policy reuse: ai-analyze's existing *conversational anti-loop* numbers ("guide" surface).
// Not final G5 allocation — see the AFTER residuals.
export const CONVERSATIONAL_ANTI_LOOP = { anon: 40, user: 300 };
export function conversationalLimit(tier) {
  return tier === "anon" ? CONVERSATIONAL_ANTI_LOOP.anon : tier === "user" ? CONVERSATIONAL_ANTI_LOOP.user : null;
}
