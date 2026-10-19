// Read-only MCP gateway logic for the SOD1820 coordination reader (inter_agent_coordination_law v17).
// Pure and dependency-injected so it is unit-testable in Node and runs unchanged in the Edge runtime.
// The caller's own Supabase Auth JWT is forwarded to Postgres; this module never sees a service key.
export const TOOL = {
  name: "coordination_check",
  description:
    "Read-only check of active writers / scope overlap in SOD1820 work_log_current (law v17). " +
    "Returns bounded rows; cannot write. Call before any WRITE task.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      task_key: { type: "string", maxLength: 200 },
      scope_terms: { type: "array", maxItems: 10, items: { type: "string", minLength: 3, maxLength: 120 } },
      active_only: { type: "boolean", default: true },
      limit: { type: "integer", minimum: 1, maximum: 50, default: 25 },
      exclude_task_key: { type: "string", maxLength: 200 },
    },
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};

const PROTOCOL = "2025-06-18";
const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const ok = (id, result) => ({ jsonrpc: "2.0", id, result });

export function bearerOf(req) {
  const m = /^Bearer\s+([A-Za-z0-9._~+/-]+=*)$/.exec(req.headers.get("authorization") || "");
  return m ? m[1] : null;
}

// deps.rpc(token, args) -> { data, error }
export async function handleMcp(body, token, deps) {
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") return [400, rpcError(null, -32600, "invalid request")];
  const { id, method, params } = body;
  if (id === undefined) return [202, null]; // notification
  if (method === "initialize")
    return [200, ok(id, { protocolVersion: PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: "sod1820-coordination", version: "1.0.0" } })];
  if (method === "ping") return [200, ok(id, {})];
  if (method === "tools/list") return [200, ok(id, { tools: [TOOL] })];
  if (method !== "tools/call") return [200, rpcError(id, -32601, "method not found")];
  if (params?.name !== TOOL.name) return [200, rpcError(id, -32602, "unknown tool")];
  if (!token) return [401, rpcError(id, -32001, "authentication required")];

  const a = params.arguments ?? {};
  const terms = a.scope_terms;
  if (
    (a.task_key !== undefined && (typeof a.task_key !== "string" || a.task_key.length > 200)) ||
    (terms !== undefined && (!Array.isArray(terms) || terms.length > 10 || terms.some((t) => typeof t !== "string" || t.length < 3 || t.length > 120))) ||
    (a.active_only !== undefined && typeof a.active_only !== "boolean") ||
    (a.limit !== undefined && (!Number.isInteger(a.limit) || a.limit < 1 || a.limit > 50)) ||
    (a.exclude_task_key !== undefined && (typeof a.exclude_task_key !== "string" || a.exclude_task_key.length > 200))
  ) return [200, rpcError(id, -32602, "invalid arguments")];

  let res;
  try {
    res = await withTimeout(deps.rpc(token, {
      p_task_key: a.task_key ?? null,
      p_scope_terms: terms ?? null,
      p_active_only: a.active_only ?? true,
      p_limit: a.limit ?? 25,
      p_exclude_task_key: a.exclude_task_key ?? null,
    }), deps.timeoutMs ?? 8000);
  } catch {
    return failClosed(id, 502, "reader unavailable");
  }
  const { data, error } = res ?? {};
  if (error) {
    const denied = error.code === "42501" || /JWT|expired|not authorized/i.test(error.message || "");
    return failClosed(id, denied ? 403 : 502, denied ? "access denied or token expired" : "reader unavailable");
  }
  const bad = validatePayload(data, a.limit ?? 25, deps.now?.() ?? Date.now());
  if (bad) return failClosed(id, 502, "invalid reader response: " + bad);

  // Completeness: a capped page is NEVER reported as "no overlap".
  if (data.truncated) {
    return [200, ok(id, { isError: true, content: [{ type: "text", text: JSON.stringify({
      verdict: "COORDINATION_INCOMPLETE", reason: "result truncated; narrow scope_terms and retry",
      total_matches: data.total_matches, returned: data.returned }) }] })];
  }
  const activeOnly = a.active_only ?? true;
  const scoped = Array.isArray(terms) && terms.length > 0;
  const verdict = !activeOnly ? "HISTORY_READ_NO_OVERLAP_CLAIM"
    : data.total_matches > 0 ? "ACTIVE_WRITER_OVERLAP"
    : scoped ? "NO_ACTIVE_OVERLAP_FOUND" : "NO_ACTIVE_WRITERS_LISTED";
  return [200, ok(id, { content: [{ type: "text", text: JSON.stringify({
    verdict, checked_at: data.checked_at, total_matches: data.total_matches, rows: data.rows }) }] })];
}

const FORBIDDEN_KEYS = /^(what_we_did|dispatch_.*)$/;
const ROW_KEYS = ["id", "created_at", "task_key", "status"];
function validatePayload(d, reqLimit, nowMs) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return "not an object";
  if (!Number.isInteger(d.total_matches) || d.total_matches < 0) return "total_matches";
  if (!Number.isInteger(d.returned) || d.returned < 0) return "returned";
  if (!Number.isInteger(d.limit) || d.limit < 1 || d.limit > 50) return "limit";
  if (typeof d.truncated !== "boolean") return "truncated";
  if (!Array.isArray(d.rows) || d.rows.length !== d.returned || d.rows.length > 50 || d.rows.length > d.limit) return "rows";
  if (d.limit > Math.max(1, Math.min(reqLimit, 50))) return "limit exceeds request";
  if (d.truncated !== (d.returned < d.total_matches)) return "truncated inconsistent";
  if (d.returned > d.total_matches) return "returned > total";
  const t = Date.parse(d.checked_at);
  if (!Number.isFinite(t) || Math.abs(nowMs - t) > 60_000) return "stale or missing checked_at";
  for (const r of d.rows) {
    if (!r || typeof r !== "object") return "row";
    for (const k of ROW_KEYS) if (typeof r[k] !== "string") return "row." + k;
    if (Object.keys(r).some((k) => FORBIDDEN_KEYS.test(k))) return "forbidden column";
  }
  return null;
}

function failClosed(id, status, why) {
  return [status, ok(id, { isError: true, content: [{ type: "text", text: JSON.stringify({ verdict: "COORDINATION_UNVERIFIED", reason: why }) }] })];
}

function withTimeout(p, ms) {
  let t;
  return Promise.race([Promise.resolve(p), new Promise((_, rej) => { t = setTimeout(() => rej(new Error("timeout")), ms); })]).finally(() => clearTimeout(t));
}
