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
    (a.limit !== undefined && (!Number.isInteger(a.limit) || a.limit < 1 || a.limit > 50))
  ) return [200, rpcError(id, -32602, "invalid arguments")];

  const { data, error } = await deps.rpc(token, {
    p_task_key: a.task_key ?? null,
    p_scope_terms: terms ?? null,
    p_active_only: a.active_only ?? true,
    p_limit: a.limit ?? 25,
  });
  if (error) {
    const denied = error.code === "42501" || /JWT|expired|not authorized/i.test(error.message || "");
    // Fail closed: never return partial data and never leak the DB message.
    return [denied ? 403 : 502, ok(id, { isError: true, content: [{ type: "text", text: denied ? "COORDINATION_UNVERIFIED: access denied or token expired" : "COORDINATION_UNVERIFIED: reader unavailable" }] })];
  }
  const rows = Array.isArray(data) ? data : [];
  return [200, ok(id, { content: [{ type: "text", text: JSON.stringify({ checked_at: new Date().toISOString(), count: rows.length, rows }) }] })];
}
