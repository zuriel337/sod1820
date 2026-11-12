// CL-13 — connects the REAL Edge handlers to a throwaway PostgreSQL (never a live project).
// The handlers talk to the database through PostgREST and through the Supabase client; this bridge answers exactly the calls
// that touch personal memory with real SQL on the throwaway database (as the service role, like the handlers), so the functions,
// the trigger and the rows are the real ones of the proposal. Everything else a handler needs (auth, persona, traces, the model,
// the WhatsApp provider) stays a mock in the harness: those are providers, not the thing under test.
//
// The database is started by scripts/run-cl13-personal-memory-handlers-test.sh, which passes the psql command as a JSON array in
// CL13_PSQL_CMD (a local binary, or `docker exec` into the throwaway container).
import { spawnSync } from "node:child_process";

export const MEMORY_RPCS = Object.freeze(["fn_personal_memory_policy_v1", "fn_raziel_context", "fn_raziel_remember", "fn_raziel_fact", "fn_mem_add"]);
const MEMORY_COLUMNS = new Set(["id", "user_ref", "channel", "agent", "topic", "content", "data", "status", "source_table", "created_at", "updated_at", "memory_type", "source", "confidence", "visibility", "memory_scope"]);
const ident = (name) => { if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`unsafe identifier: ${name}`); return name; };
const column = (name) => { if (!MEMORY_COLUMNS.has(name)) throw new Error(`unknown column of agent_user_memory: ${name}`); return name; };
export const literal = (value) => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  return `'${String(value).replaceAll("'", "''")}'`;
};

export function pgBridge(env = process.env) {
  if (!env.CL13_PSQL_CMD) return null;
  const cmd = JSON.parse(env.CL13_PSQL_CMD);
  const cwd = env.CL13_ROOT || process.cwd();   // the SQL files include each other with paths relative to the repository root
  const statements = [];   // every statement the handlers caused, for assertions
  const exec = (sqlText) => {
    const r = spawnSync(cmd[0], [...cmd.slice(1), "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-f", "-"], { input: sqlText, encoding: "utf8", cwd });
    if (r.status !== 0) {
      const message = (/ERROR:\s+(.*)/.exec(r.stderr) || [null, r.stderr.trim() || `psql exited ${r.status}`])[1];
      throw Object.assign(new Error(message), { pg: true, stderr: r.stderr });
    }
    return r.stdout.trim();
  };
  // rows of a query as JSON; `role` = the database role the statement runs as (the handlers use the service key)
  const rows = (query, role = null) => {
    const out = exec(`${role ? `set role ${ident(role)};\n` : ""}select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (${query}) t;`);
    return JSON.parse(out || "[]");
  };
  const scalar = (query, role = null) => rows(`select (${query}) as v`, role)[0].v;
  const run = (sqlText) => { exec(sqlText); };
  const file = (path) => {
    const r = spawnSync(cmd[0], [...cmd.slice(1), "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", path], { encoding: "utf8", cwd });
    if (r.status !== 0) throw new Error(`psql -f ${path}: ${r.stderr.trim().split("\n").slice(-3).join(" | ")}`);
  };

  // One database function call as the service role: { data, error } in the shape the Supabase client returns.
  const rpc = (name, args = {}) => {
    if (!MEMORY_RPCS.includes(name)) throw new Error(`not a memory function: ${name}`);
    statements.push({ kind: "rpc", name, args });
    if (!scalar(`to_regproc('public.${ident(name)}') is not null`)) {
      return { data: null, error: { code: "PGRST202", message: `Could not find the function public.${name} in the schema cache` }, status: 404 };
    }
    const named = Object.entries(args).map(([k, v]) => `${ident(k)} => ${literal(v)}`).join(", ");
    try { return { data: scalar(`to_jsonb(public.${name}(${named}))`, "service_role"), error: null, status: 200 }; }
    catch (e) { if (!e.pg) throw e; return { data: null, error: { code: "P0001", message: e.message }, status: 400 }; }
  };

  // PostgREST emulation for the exact memory routes the Edge functions use. Returns null for any other route.
  const rest = (input, init = {}) => {
    const url = new URL(String(input));
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    const rpcName = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(url.pathname)?.[1];
    if (rpcName && MEMORY_RPCS.includes(rpcName)) {
      const r = rpc(rpcName, init.body ? JSON.parse(init.body) : {});
      return json(r.error ? r.error : r.data, r.status);
    }
    if (url.pathname !== "/rest/v1/agent_user_memory") return null;
    const method = (init.method || "GET").toUpperCase();
    if (method === "POST") {
      const body = JSON.parse(init.body);
      statements.push({ kind: "insert", table: "agent_user_memory", row: body });
      const cols = Object.keys(body).map(column);
      try {
        const out = JSON.parse(exec(`set role service_role;\nwith t as (insert into public.agent_user_memory(${cols.join(", ")}) values (${cols.map((c) => literal(body[c])).join(", ")}) returning id) select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from t;`));
        return json(new Headers(init.headers).get("Prefer") === "return=representation" ? out : null, 201);
      } catch (e) { if (!e.pg) throw e; return json({ code: "P0001", message: e.message }, 400); }
    }
    if (method !== "GET") throw new Error(`unsupported method on agent_user_memory: ${method}`);
    const where = [], order = [];
    let select = "*", limit = "";
    for (const [key, value] of url.searchParams) {
      if (key === "select") select = value.split(",").map(column).join(", ");
      else if (key === "order") for (const part of value.split(",")) { const [c, dir] = part.split("."); order.push(`${column(c)} ${dir === "desc" ? "desc" : "asc"}`); }
      else if (key === "limit") limit = ` limit ${Number(value) | 0}`;
      else if (value.startsWith("eq.")) where.push(`${column(key)} = ${literal(value.slice(3))}`);
      else throw new Error(`unsupported filter on agent_user_memory: ${key}=${value}`);
    }
    statements.push({ kind: "select", table: "agent_user_memory", where });
    return json(rows(`select ${select} from public.agent_user_memory${where.length ? ` where ${where.join(" and ")}` : ""}${order.length ? ` order by ${order.join(", ")}` : ""}${limit}`, "service_role"));
  };

  // The part of the Supabase client the WhatsApp handlers use. agent_user_memory and the memory functions are real;
  // every other table is an in-memory list (its inserts are recorded), and every other function comes from `rpcMocks`.
  const supabaseClient = ({ tables = {}, rpcMocks = {} } = {}) => {
    const rpcCalls = [], inserts = [];
    const memoryQuery = () => {
      const state = { select: "*", where: [], order: [], limit: "" };
      const builder = {
        select: (cols = "*") => { state.select = cols === "*" ? "*" : cols.split(",").map((c) => column(c.trim())).join(", "); return builder; },
        eq: (c, v) => { state.where.push(`${column(c)} = ${literal(v)}`); return builder; },
        order: (c, opts = {}) => { state.order.push(`${column(c)} ${opts.ascending === false ? "desc" : "asc"}`); return builder; },
        limit: (n) => { state.limit = ` limit ${Number(n) | 0}`; return builder; },
        then: (resolve, reject) => {
          statements.push({ kind: "select", table: "agent_user_memory", where: state.where });
          return Promise.resolve().then(() => ({ data: rows(`select ${state.select} from public.agent_user_memory${state.where.length ? ` where ${state.where.join(" and ")}` : ""}${state.order.length ? ` order by ${state.order.join(", ")}` : ""}${state.limit}`, "service_role"), error: null })).then(resolve, reject);
        },
      };
      return builder;
    };
    const memoryList = (table) => {
      const list = tables[table] || (tables[table] = []);
      const builder = {
        select: () => builder, eq: () => builder, neq: () => builder, in: () => builder, gte: () => builder, lte: () => builder,
        is: () => builder, order: () => builder, limit: () => builder, update: () => builder, delete: () => builder,
        insert: (row) => { inserts.push({ table, row }); return builder; },
        upsert: (row) => { inserts.push({ table, row }); return builder; },
        maybeSingle: async () => ({ data: list[0] ?? null, error: null }),
        single: async () => ({ data: list[0] ?? null, error: null }),
        then: (resolve, reject) => Promise.resolve({ data: list, error: null, count: list.length }).then(resolve, reject),
      };
      return builder;
    };
    return {
      rpcCalls, inserts,
      from: (table) => (table === "agent_user_memory" ? memoryQuery() : memoryList(table)),
      rpc: async (name, args) => {
        rpcCalls.push({ name, args });
        if (MEMORY_RPCS.includes(name)) { const r = rpc(name, args); return { data: r.data, error: r.error }; }
        const mock = rpcMocks[name];
        return { data: typeof mock === "function" ? await mock(args) : (mock ?? null), error: null };
      },
    };
  };

  // the full content of every row that existed before the test (md5 of each row as JSON, by id) and the number of rows now
  const stamp = () => ({ original: scalar("public.cl13_stamp()"), rows: scalar("(select count(*) from public.agent_user_memory)") });
  const newRows = () => rows("select user_ref, channel, agent, memory_type, source, topic, content, data from public.agent_user_memory where id not in (select id from public.cl13_original_ids) order by created_at, content");

  return { exec, run, file, rows, scalar, rpc, rest, supabaseClient, stamp, newRows, statements };
}
