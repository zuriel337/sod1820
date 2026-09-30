const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function serviceRpc(name: string, args: Record<string, unknown>) {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("server_config");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`rpc_${name}_${r.status}`);
  return await r.json();
}

async function resolveUser(req: Request): Promise<string | null> {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ") || !SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, authorization },
    });
    if (!r.ok) return null;
    const data = await r.json();
    return typeof data?.id === "string" ? data.id : null;
  } catch {
    return null;
  }
}

async function rateLimit(req: Request, userId: string | null, op = "page") {
  const forwarded = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ip = forwarded || req.headers.get("cf-connecting-ip") || "unknown";
  const ua = (req.headers.get("user-agent") || "").slice(0, 120);
  // verify_batch has its own bucket/limits: one governed search fans out to a few batches (regular 1,
  // cross 1/term, FORMS up to 8) and must not starve the page/verify budget.
  const batch = op === "verify_batch";
  const key = await sha256(`els-search-bridge${batch ? "|verify_batch" : ""}|${userId ? `user:${userId}` : `anon:${ip}:${ua}`}`);
  return await serviceRpc("edge_rate_limit_check", {
    p_key_hash: key,
    p_window_seconds: 3600,
    p_limit: batch ? (userId ? 600 : 240) : (userId ? 120 : 60),
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Client may correlate one action via interaction_id only; trace_id/root_span_id stay server-issued.
function safeInteractionId(value: unknown): string | null {
  const text = String(value || "").trim();
  return UUID_RE.test(text) ? text : null;
}

async function traceBegin(identityClass: string, operation: string, inputHash: string, interactionId: string | null) {
  const traceId = crypto.randomUUID();
  const rootSpanId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  try {
    const result = await serviceRpc("op_trace_begin_v1", {
      p_trace_id: traceId,
      p_root_span_id: rootSpanId,
      p_context: {
        interaction_id: interactionId,
        capability: `els:${operation}`,
        surface: "edge:els-search-bridge",
        channel: "web",
        locale: "he",
        identity_class: identityClass,
        subject_ref: "els:torah",
        owner_ref: "els_research_layer_law v9 + els_single_engine_law v2",
        root_name: "els-search-bridge",
        replay: { inputRef: `sha256:${inputHash}` },
      },
      p_started_at: startedAt,
    });
    return result ? { traceId, rootSpanId, startedAt } : null;
  } catch {
    return null;
  }
}

async function traceSpan(trace: any, name: string, startedAt: string, endedAt: string, outcome: string, detail: Record<string, unknown>) {
  if (!trace) return;
  try {
    await serviceRpc("op_trace_record_span_v1", {
      p_trace_id: trace.traceId,
      p_span_id: crypto.randomUUID(),
      p_parent_span_id: trace.rootSpanId,
      p_kind: "db_rpc",
      p_name: name,
      p_started_at: startedAt,
      p_ended_at: endedAt,
      p_outcome: outcome,
      p_detail: detail,
    });
  } catch { /* trace fail-open */ }
}

// Like traceSpan but reports whether the span was durably recorded (used to fail closed on the gate).
async function recordSpan(trace: any, name: string, startedAt: string, endedAt: string, outcome: string, detail: Record<string, unknown>) {
  if (!trace) return false;
  try {
    const r = await serviceRpc("op_trace_record_span_v1", {
      p_trace_id: trace.traceId,
      p_span_id: crypto.randomUUID(),
      p_parent_span_id: trace.rootSpanId,
      p_kind: "db_rpc",
      p_name: name,
      p_started_at: startedAt,
      p_ended_at: endedAt,
      p_outcome: outcome,
      p_detail: detail,
    });
    return !!r;
  } catch {
    return false;
  }
}

async function traceFinish(trace: any, outcome: string, reason: string | null = null) {
  if (!trace) return;
  try {
    await serviceRpc("op_trace_finish_v1", {
      p_trace_id: trace.traceId,
      p_root_span_id: trace.rootSpanId,
      p_outcome: outcome,
      p_ended_at: new Date().toISOString(),
      p_stop_reason: reason,
    });
  } catch { /* trace fail-open */ }
}

// B0 (G3): direct compatibility page search is bounded at this Edge policy boundary. The canonical
// SQL engine (els_search_page_core_v1) semantics are untouched; exact verify is NOT subject to this
// ceiling (it is a single explicit occurrence replay, e.g. skip 1820/10065).
const PAGE_SKIP_MAX_CEILING = 500;
const ELS_LOCK_FLAG = "lock_els";
const GATE_OWNER_REFS = ["site_flags_lock_law v3", "platform_tiers_law v5", "ai_quota_law v3"];

// verify_batch: candidate discovery is a browser-side execution strategy; every candidate is re-verified
// by the canonical set-wise verifier (els_verify_batch_v1). The caps here mirror the DB caps.
const BATCH_MAX_CANDIDATES = 4000;
const BATCH_MAX_LETTER_CHECKS = 64000;
const BATCH_MAX_REQUEST_BYTES = 256 * 1024;
const CORPUS_ID_RE = /^[0-9a-f]{16}([0-9a-f]{48})?$/;

function normalizeTerm(term: string) {
  return term.replace(/[^א-ת]/g, "").replace(/ך/g, "כ").replace(/ם/g, "מ").replace(/ן/g, "נ").replace(/ף/g, "פ").replace(/ץ/g, "צ");
}

// Strategy is provenance only: a small allowlisted object, never an authority input.
function safeStrategy(value: any) {
  if (!value || typeof value !== "object") return null;
  const str = (v: unknown, n = 48) => (typeof v === "string" ? v.replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, n) : null);
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null);
  return {
    policy: str(value.policy),
    strategy: str(value.strategy),
    version: str(value.version),
    probe_pairs: num(value.probe_pairs),
    probe_hits: num(value.probe_hits),
    extended: value.extended === true,
  };
}

function intOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try {
    const raw = await req.text();
    // Hard request cap (known cap-4000 candidate payload is ~155KB); applies to every op.
    // UTF-8 byte length (not UTF-16 code units): multi-byte terms must not slip past the cap.
    if (new TextEncoder().encode(raw).byteLength > BATCH_MAX_REQUEST_BYTES) return json({ error: "payload_too_large", limit: BATCH_MAX_REQUEST_BYTES }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: "invalid_json" }, 400); }

  const op = body?.op === "verify" ? "verify" : body?.op === "page" ? "page" : body?.op === "verify_batch" ? "verify_batch" : null;
  const term = typeof body?.term === "string" ? body.term.trim().slice(0, 200) : "";
  const scope = body?.scope === "tanakh" ? "tanakh" : "torah";
  if (!op || term.length < 2) return json({ error: "invalid_request" }, 400);

  const userId = await resolveUser(req);
  let rate;
  try { rate = await rateLimit(req, userId, op); }
  catch { return json({ error: "rate_limit_backend" }, 503); }
  if (rate?.allowed !== true) return json({ error: "rate_limited", rate }, 429);

  // verify_batch: validate shape/caps before spending a trace; the trace input hash binds the FULL
  // normalized term/scope/corpus_id/candidate list/strategy (not just a count).
  let batchCandidates: Array<{ skip: number; dir: number; start: number }> = [];
  let batchCorpusId = "";
  const batchStrategy = op === "verify_batch" ? safeStrategy(body?.strategy) : null;
  if (op === "verify_batch") {
    batchCorpusId = typeof body?.corpus_id === "string" ? body.corpus_id : "";
    const list = body?.candidates;
    if (!CORPUS_ID_RE.test(batchCorpusId) || !Array.isArray(list) || list.length === 0) return json({ error: "invalid_request" }, 400);
    if (list.length > BATCH_MAX_CANDIDATES) return json({ error: "budget_exceeded", limit: BATCH_MAX_CANDIDATES }, 400);
    const termLen = normalizeTerm(term).length;
    if (termLen < 2 || list.length * termLen > BATCH_MAX_LETTER_CHECKS) return json({ error: "budget_exceeded", limit: BATCH_MAX_LETTER_CHECKS }, 400);
    for (const c of list) {
      const skip = intOrNull(c?.skip), dir = intOrNull(c?.dir), start = intOrNull(c?.start);
      if (skip == null || skip < 2 || (dir !== 1 && dir !== -1) || start == null || start < 0) return json({ error: "invalid_candidates" }, 400);
      batchCandidates.push({ skip, dir, start });
    }
  }

  const inputHash = await sha256(JSON.stringify(op === "verify_batch" ? {
    op, term: normalizeTerm(term), scope, corpus_id: batchCorpusId,
    candidates: batchCandidates.map(c => [c.skip, c.dir, c.start]),
    strategy: batchStrategy,
  } : {
    op, term, scope,
    skip_min: body?.skip_min ?? null,
    skip_max: body?.skip_max ?? null,
    page_size: body?.page_size ?? null,
    after_skip: body?.after_skip ?? null,
    after_start: body?.after_start ?? null,
    after_dir: body?.after_dir ?? null,
  }));
  const trace = await traceBegin(userId ? "user" : "anon", op, inputHash, safeInteractionId(body?.interaction_id));
  // Fail closed: the gate decision must be witnessed by a server-issued trace root.
  if (!trace) return json({ error: "trace_unavailable" }, 503);

  try {
    // ── Server capability gate: MUST run before any canonical ELS engine RPC ─────────────────
    const gateStartedAt = new Date().toISOString();
    let gate: any = null;
    try {
      gate = await serviceRpc("fn_capability_execution_gate_v1", {
        p_capability: `els:${op}`,
        p_flag_key: ELS_LOCK_FLAG,
        p_required_entitlement: "public",
        p_user_ref: userId,
        p_visitor: null,
        p_identity: null,
        p_budget_kind: "none",
        p_budget_tier: null,
        p_budget_limit_override: null,
      });
    } catch { gate = null; }
    const gateEndedAt = new Date().toISOString();
    const gateAllowed = gate?.allowed === true;
    const gateStop = gate ? (gateAllowed ? null : "gate_denied") : "gate_unavailable";
    const gateTraced = await recordSpan(trace, "fn_capability_execution_gate_v1", gateStartedAt, gateEndedAt,
      gate ? (gateAllowed ? "success" : "access_filtered") : "failed_with_reason", {
        capability: `els:${op}`,
        owner_ref: GATE_OWNER_REFS.join(" + "),
        output_use: "not_applicable",
        stop_reason: gateStop,
        resources: { rpc_calls: 1 },
        cost: { certainty: "not_billable" },
        replay: { inputRef: `sha256:${inputHash}`, ownerRuleRefs: GATE_OWNER_REFS },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      });
    // Fail closed on the gate itself AND on an unwitnessed gate decision.
    if (!gate || !gateAllowed || !gateTraced) {
      const reason = !gate ? "gate_unavailable" : !gateAllowed ? "gate_denied" : "trace_incomplete";
      await traceFinish(trace, gate ? "access_filtered" : "failed_with_reason", reason);
      // Privacy-safe: no entitlement/identity detail is echoed to the caller.
      return json(
        { error: !gate ? "gate_unavailable" : !gateAllowed ? "access_filtered" : "trace_incomplete", trace_id: trace.traceId },
        !gate || !gateTraced ? 503 : 403,
      );
    }

    if (op === "verify_batch") {
      const startedAt = new Date().toISOString();
      const result = await serviceRpc("els_verify_batch_v1", {
        p_term: term, p_scope: scope, p_corpus_id: batchCorpusId,
        p_candidates: batchCandidates, p_strategy: batchStrategy,
      });
      const endedAt = new Date().toISOString();
      await traceSpan(trace, "els_verify_batch_v1", startedAt, endedAt, "success", {
        capability: "els:verify_batch",
        owner_ref: "els_research_layer_law v9",
        output_use: "used",
        resources: { rpc_calls: 1, latency_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)), candidates: batchCandidates.length },
        cost: { certainty: "not_billable" },
        replay: { inputRef: `sha256:${inputHash}`, ownerRuleRefs: ["els_research_layer_law v9", "els_single_engine_law v2"] },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      });
      await traceFinish(trace, "success");
      return json({ result, trace_id: trace?.traceId || null, rate });
    }

    if (op === "verify") {
      const skip = intOrNull(body?.skip);
      const dir = intOrNull(body?.dir);
      const start = intOrNull(body?.start);
      if (skip == null || skip < 2 || ![-1, 1].includes(dir as number) || start == null || start < 0) {
        await traceFinish(trace, "failed_with_reason", "invalid_replay_coordinates");
        return json({ error: "invalid_replay_coordinates", trace_id: trace?.traceId || null }, 400);
      }

      const startedAt = new Date().toISOString();
      const result = await serviceRpc("els_verify_occurrence_v1", {
        p_term: term, p_scope: scope, p_skip: skip, p_dir: dir, p_start: start,
      });
      const endedAt = new Date().toISOString();
      await traceSpan(trace, "els_verify_occurrence_v1", startedAt, endedAt, "success", {
        capability: "els:verify",
        owner_ref: "els_research_layer_law v9",
        output_use: "used",
        resources: { rpc_calls: 1, latency_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)) },
        cost: { certainty: "not_billable" },
        replay: { inputRef: `sha256:${inputHash}`, ownerRuleRefs: ["els_research_layer_law v9", "els_single_engine_law v2"] },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      });
      await traceFinish(trace, "success");
      return json({ result, trace_id: trace?.traceId || null, rate });
    }

    const skipMin = Math.max(2, intOrNull(body?.skip_min) ?? 2);
    const skipMax = intOrNull(body?.skip_max);
    // Explicit bounded search contract: null/missing skip_max must never expand to full_domain.
    if (skipMax == null || skipMax < skipMin) {
      await traceFinish(trace, "failed_with_reason", "skip_max_required");
      return json({ error: "skip_max_required", ceiling: PAGE_SKIP_MAX_CEILING, trace_id: trace.traceId }, 400);
    }
    if (skipMax > PAGE_SKIP_MAX_CEILING) {
      await traceFinish(trace, "failed_with_reason", "budget_exceeded");
      return json({ error: "budget_exceeded", ceiling: PAGE_SKIP_MAX_CEILING, trace_id: trace.traceId }, 400);
    }
    const pageSize = Math.max(1, Math.min(intOrNull(body?.page_size) ?? 250, 500));
    const afterSkip = intOrNull(body?.after_skip);
    const afterStart = intOrNull(body?.after_start);
    const afterDir = intOrNull(body?.after_dir);
    const cursorCount = [afterSkip, afterStart, afterDir].filter(x => x != null).length;
    if (cursorCount !== 0 && cursorCount !== 3) {
      await traceFinish(trace, "failed_with_reason", "invalid_cursor");
      return json({ error: "invalid_cursor", trace_id: trace?.traceId || null }, 400);
    }

    const startedAt = new Date().toISOString();
    const result = await serviceRpc("els_search_page_core_v1", {
      p_term: term,
      p_scope: scope,
      p_skip_min: skipMin,
      p_skip_max: skipMax,
      p_page_size: pageSize,
      p_after_skip: afterSkip,
      p_after_start: afterStart,
      p_after_dir: afterDir,
      p_selection_protocol: body?.selection_protocol || null,
    });
    const endedAt = new Date().toISOString();
    await traceSpan(trace, "els_search_page_core_v1", startedAt, endedAt, "success", {
      capability: "els:page",
      owner_ref: "els_research_layer_law v9",
      output_use: "used",
      resources: { rpc_calls: 1, latency_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)) },
      cost: { certainty: "not_billable" },
      replay: { inputRef: `sha256:${inputHash}`, ownerRuleRefs: ["els_research_layer_law v9", "els_single_engine_law v2"] },
      privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
    });
    await traceFinish(trace, "success");
    return json({ result, trace_id: trace?.traceId || null, rate });
  } catch (error) {
    await traceFinish(trace, "failed_with_reason", "backend_error");
    return json({ error: "backend_error", detail: String(error).slice(0, 120), trace_id: trace?.traceId || null }, 503);
  }
});
