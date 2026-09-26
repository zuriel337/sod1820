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

async function rateLimit(req: Request, userId: string | null) {
  const forwarded = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ip = forwarded || req.headers.get("cf-connecting-ip") || "unknown";
  const ua = (req.headers.get("user-agent") || "").slice(0, 120);
  const key = await sha256(`els-search-bridge|${userId ? `user:${userId}` : `anon:${ip}:${ua}`}`);
  return await serviceRpc("edge_rate_limit_check", {
    p_key_hash: key,
    p_window_seconds: 3600,
    p_limit: userId ? 120 : 60,
  });
}

async function traceBegin(identityClass: string, operation: string, inputHash: string) {
  const traceId = crypto.randomUUID();
  const rootSpanId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  try {
    const result = await serviceRpc("op_trace_begin_v1", {
      p_trace_id: traceId,
      p_root_span_id: rootSpanId,
      p_context: {
        capability: `els:${operation}`,
        surface: "edge:els-search-bridge",
        channel: "web",
        locale: "he",
        identity_class: identityClass,
        subject_ref: "els:torah",
        owner_ref: "els_research_layer_law v3 + els_single_engine_law v2",
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

function intOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  const op = body?.op === "verify" ? "verify" : body?.op === "search" ? "search" : body?.op === "page" ? "page" : null;
  const term = typeof body?.term === "string" ? body.term.trim().slice(0, 200) : "";
  const scope = body?.scope === "tanakh" ? "tanakh" : "torah";
  if (!op || term.length < 2) return json({ error: "invalid_request" }, 400);

  const userId = await resolveUser(req);
  let rate;
  try { rate = await rateLimit(req, userId); }
  catch { return json({ error: "rate_limit_backend" }, 503); }
  if (rate?.allowed !== true) return json({ error: "rate_limited", rate }, 429);

  const inputHash = await sha256(JSON.stringify({
    op, term, scope,
    skip_min: body?.skip_min ?? null,
    skip_max: body?.skip_max ?? null,
    page_size: body?.page_size ?? null,
    after_skip: body?.after_skip ?? null,
    after_start: body?.after_start ?? null,
    after_dir: body?.after_dir ?? null,
  }));
  const trace = await traceBegin(userId ? "user" : "anon", op, inputHash);

  try {
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
        owner_ref: "els_research_layer_law v3",
        output_use: "used",
        resources: { rpc_calls: 1, latency_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)) },
        cost: { certainty: "not_billable" },
        replay: { inputRef: `sha256:${inputHash}`, ownerRuleRefs: ["els_research_layer_law v3", "els_single_engine_law v2"] },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      });
      await traceFinish(trace, "success");
      return json({ result, trace_id: trace?.traceId || null, rate });
    }

    if (op === "search") {
      const startedAt = new Date().toISOString();
      const result = await serviceRpc("els_search_regular_core_v1", {
        p_term: term,
        p_scope: scope,
        p_maxhits: 4000,
        p_selection_protocol: body?.selection_protocol || null,
      });
      const endedAt = new Date().toISOString();
      await traceSpan(trace, "els_search_regular_core_v1", startedAt, endedAt, "success", {
        capability: "els:search",
        owner_ref: "els_research_layer_law v3",
        output_use: "used",
        resources: { rpc_calls: 1, latency_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)) },
        cost: { certainty: "not_billable" },
        replay: { inputRef: `sha256:${inputHash}`, ownerRuleRefs: ["els_research_layer_law v3", "els_single_engine_law v2"] },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      });
      await traceFinish(trace, "success");
      return json({ result, trace_id: trace?.traceId || null, rate });
    }

    const skipMin = Math.max(2, intOrNull(body?.skip_min) ?? 2);
    const skipMax = intOrNull(body?.skip_max);
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
      owner_ref: "els_research_layer_law v3",
      output_use: "used",
      resources: { rpc_calls: 1, latency_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)) },
      cost: { certainty: "not_billable" },
      replay: { inputRef: `sha256:${inputHash}`, ownerRuleRefs: ["els_research_layer_law v3", "els_single_engine_law v2"] },
      privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
    });
    await traceFinish(trace, "success");
    return json({ result, trace_id: trace?.traceId || null, rate });
  } catch (error) {
    await traceFinish(trace, "failed_with_reason", "backend_error");
    return json({ error: "backend_error", detail: String(error).slice(0, 120), trace_id: trace?.traceId || null }, 503);
  }
});
