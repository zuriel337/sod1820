#!/usr/bin/env node
// PreToolUse guard for the Supabase MCP `execute_sql` tool (Claude Code).
//
// Why: execute_sql used to be pre-approved in .claude/settings.json. It can run the same DDL/DML as `apply_migration`,
// so the Human Gate on migrations could be bypassed. Claude Code permission rules cannot look inside a tool's arguments,
// so this hook does it:
//   * a single, plain read-only SELECT (the AGENTS.md startup check, work_log / work_log_current reads, catalog and
//     privilege checks) -> permissionDecision "allow"  (no prompt)
//   * anything else (INSERT/UPDATE/DELETE/DDL/GRANT, several statements, SELECT INTO, data-modifying CTE, FOR UPDATE,
//     a function that is not on the read-only allowlist, a string the parser cannot prove safe, empty/oversized input)
//     -> permissionDecision "ask": ZURIEL's explicit approval is required (CLAUDE.md 0.4); schema changes belong in apply_migration.
// The allow-list entry for execute_sql was REMOVED from settings.json, so if this script is missing or crashes the normal
// permission prompt applies: the failure mode is "ask", never "allow".
//
// This is a convenience filter, not a security boundary: a SELECT from a view whose definition calls a volatile function
// is not detectable here. The boundary stays server-side (Supabase confirmation / connector scope).
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const MAX_QUERY_CHARS = 20000;

// Statements/keywords that never appear in a plain read-only SELECT. Matched as whole words on the MASKED query
// (string literals, quoted identifiers, dollar-quoted bodies and comments removed).
const FORBIDDEN = new Set([
  "insert", "update", "delete", "merge", "create", "alter", "drop", "truncate", "grant", "revoke", "copy", "call", "do",
  "execute", "prepare", "deallocate", "set", "reset", "begin", "start", "commit", "rollback", "savepoint", "release", "lock",
  "vacuum", "analyze", "analyse", "reindex", "cluster", "refresh", "comment", "listen", "notify", "unlisten", "load",
  "security", "import", "into", "returning", "declare", "fetch", "move", "close", "discard", "abort", "checkpoint",
  "explain", "show", "values", "table", "alter", "reassign", "owned", "policy",
]);

// Keywords that can be followed by "(" without being a function call.
const NON_FUNCTION_BEFORE_PAREN = new Set([
  "in", "exists", "any", "all", "some", "from", "join", "on", "and", "or", "not", "as", "over", "filter", "within", "case",
  "when", "then", "else", "using", "lateral", "select", "with", "by", "partition", "order", "limit", "offset", "union",
  "intersect", "except", "between", "like", "ilike", "similar", "is", "array", "row", "distinct", "where", "having",
  "group", "rows", "range", "interval", "end", "recursive", "materialized", "asc", "desc", "nulls", "to", "at", "time",
  "zone", "escape", "only", "of", "unique", "similar", "cross", "inner", "left", "right", "full", "outer", "natural",
]);

// Read-only (no side effects) built-ins. Anything else - including every user-defined / SECURITY DEFINER function -> "ask".
const SAFE_FUNCTIONS = new Set([
  // aggregates / windows
  "count", "sum", "avg", "min", "max", "bool_and", "bool_or", "every", "array_agg", "string_agg", "jsonb_agg", "json_agg",
  "percentile_cont", "percentile_disc", "row_number", "rank", "dense_rank", "ntile", "lag", "lead", "first_value", "last_value",
  "nth_value", "cume_dist", "percent_rank",
  // conditional / cast
  "coalesce", "nullif", "greatest", "least", "cast",
  // text
  "lower", "upper", "length", "char_length", "octet_length", "btrim", "ltrim", "rtrim", "trim", "replace", "substr", "substring",
  "left", "right", "split_part", "concat", "concat_ws", "format", "lpad", "rpad", "repeat", "reverse", "initcap", "regexp_replace",
  "regexp_match", "regexp_matches", "regexp_split_to_array", "starts_with", "position", "strpos", "translate", "md5", "encode",
  "decode", "quote_ident", "overlay",
  // math
  "abs", "round", "ceil", "ceiling", "floor", "mod", "power", "sqrt", "sign", "trunc",
  // time (read only)
  "now", "clock_timestamp", "statement_timestamp", "date_trunc", "date_part", "extract", "age", "timezone", "make_interval",
  "to_char", "to_date", "to_timestamp", "current_timestamp", "current_date",
  // json
  "jsonb_build_object", "jsonb_build_array", "json_build_object", "json_build_array", "to_jsonb", "to_json", "row_to_json",
  "jsonb_array_elements", "jsonb_array_elements_text", "jsonb_each", "jsonb_each_text", "jsonb_object_keys", "jsonb_typeof",
  "jsonb_array_length", "jsonb_extract_path", "jsonb_extract_path_text", "jsonb_pretty", "jsonb_strip_nulls",
  // arrays / sets
  "unnest", "generate_series", "array_length", "cardinality", "array_to_string", "string_to_array", "array_position",
  // catalog / privilege / environment reads (startup + verification checks)
  "current_user", "session_user", "current_database", "current_schema", "current_schemas", "current_setting", "version",
  "has_table_privilege", "has_column_privilege", "has_function_privilege", "has_schema_privilege", "has_any_column_privilege",
  "pg_has_role", "pg_get_functiondef", "pg_get_viewdef", "pg_get_expr", "pg_get_userbyid", "obj_description", "col_description",
  "format_type", "to_regclass", "to_regproc", "to_regprocedure", "pg_table_is_visible", "pg_function_is_visible",
  "pg_relation_size", "pg_total_relation_size", "pg_size_pretty",
]);

/** Remove comments and string/identifier bodies. Returns { code } or { unsupported: reason }. */
export function maskSql(sql) {
  let out = "";
  let i = 0;
  const n = sql.length;
  const isIdent = c => /[A-Za-z0-9_$\u0080-￿]/.test(c);
  while (i < n) {
    const c = sql[i];
    const d = sql[i + 1];
    if (c === "-" && d === "-") { // line comment
      while (i < n && sql[i] !== "\n") i++;
      out += " ";
      continue;
    }
    if (c === "/" && d === "*") { // block comment (nests in PostgreSQL)
      let depth = 1; i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === "/" && sql[i + 1] === "*") { depth++; i += 2; }
        else if (sql[i] === "*" && sql[i + 1] === "/") { depth--; i += 2; }
        else i++;
      }
      if (depth > 0) return { unsupported: "unterminated block comment" };
      out += " ";
      continue;
    }
    if (c === "'") { // string literal; ''-escape only. Backslashes, E'..' and U&'..' are refused (version/setting dependent).
      const prev = sql[i - 1];
      if (prev && /[EeUu]/.test(prev) && (i < 2 || !isIdent(sql[i - 2]) || sql[i - 1] === "&")) return { unsupported: "E'' / U&'' string" };
      if (prev === "&") return { unsupported: "U&'' string" };
      i++;
      let closed = false;
      while (i < n) {
        if (sql[i] === "\\") return { unsupported: "backslash inside a string literal" };
        if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue; }
        if (sql[i] === "'") { i++; closed = true; break; }
        i++;
      }
      if (!closed) return { unsupported: "unterminated string literal" };
      out += "''";
      continue;
    }
    if (c === '"') { // quoted identifier
      i++;
      let closed = false;
      while (i < n) {
        if (sql[i] === '"' && sql[i + 1] === '"') { i += 2; continue; }
        if (sql[i] === '"') { i++; closed = true; break; }
        i++;
      }
      if (!closed) return { unsupported: "unterminated quoted identifier" };
      out += '"x"';
      continue;
    }
    if (c === "$" && (i === 0 || !isIdent(sql[i - 1]))) { // dollar-quoted string: $tag$ ... $tag$
      const m = /^\$([A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*)?\$/.exec(sql.slice(i, i + 80));
      if (m) {
        const end = sql.indexOf(m[0], i + m[0].length);
        if (end < 0) return { unsupported: "unterminated dollar-quoted string" };
        i = end + m[0].length;
        out += "''";
        continue;
      }
    }
    out += c;
    i++;
  }
  return { code: out };
}

const ask = reason => ({ decision: "ask", reason });
const allow = reason => ({ decision: "allow", reason });

/** Classify one SQL text. Returns { decision: "allow" | "ask", reason }. Conservative: anything not proven read-only -> ask. */
export function classifySql(sql) {
  if (typeof sql !== "string" || !sql.trim()) return ask("empty or non-text query");
  if (sql.length > MAX_QUERY_CHARS) return ask("query longer than " + MAX_QUERY_CHARS + " characters");
  if (sql.includes("\0")) return ask("NUL character in query");
  const masked = maskSql(sql);
  if (masked.unsupported) return ask("cannot prove it is read-only: " + masked.unsupported);
  const code = masked.code;

  const statements = code.split(";").map(s => s.trim()).filter(Boolean);
  if (statements.length === 0) return ask("empty statement");
  if (statements.length > 1) return ask("more than one statement");
  const stmt = statements[0];

  const first = /^[A-Za-z_]+/.exec(stmt)?.[0]?.toLowerCase();
  if (first !== "select" && first !== "with") return ask("not a plain SELECT (starts with " + (first || "a symbol") + ")");

  const tokens = stmt.match(/[A-Za-z_][A-Za-z0-9_$]*/g) || [];
  const lower = tokens.map(t => t.toLowerCase());
  for (const t of lower) if (FORBIDDEN.has(t)) return ask("contains '" + t + "'");
  if (/\bfor\s+(update|share|no\s+key|key\s+share)\b/i.test(stmt)) return ask("contains a FOR UPDATE/SHARE lock");

  const callRe = /([A-Za-z_][A-Za-z0-9_$]*(?:\s*\.\s*[A-Za-z_][A-Za-z0-9_$]*)*)\s*\(/g;
  let m;
  while ((m = callRe.exec(stmt)) !== null) {
    let name = m[1].replace(/\s+/g, "").toLowerCase();
    if (name.startsWith("pg_catalog.")) name = name.slice("pg_catalog.".length);
    if (NON_FUNCTION_BEFORE_PAREN.has(name)) continue;
    if (!SAFE_FUNCTIONS.has(name)) return ask("function '" + name + "' is not on the read-only allowlist");
  }
  return allow("single read-only SELECT");
}

function emit(decision, reason) {
  const text = decision === "allow"
    ? "execute-sql-guard: " + reason
    : "execute-sql-guard: " + reason + ". Writes/DDL need ZURIEL's explicit approval (CLAUDE.md 0.4); schema changes go through apply_migration, not execute_sql.";
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: decision, permissionDecisionReason: text } }));
}

function main() {
  let input;
  try { input = JSON.parse(readFileSync(0, "utf8")); } catch { return emit("ask", "unreadable hook input"); }
  const tool = String(input?.tool_name || "");
  if (!/(^|__)execute_sql$/.test(tool)) return; // not our tool: no opinion
  const query = input?.tool_input?.query;
  const r = classifySql(query);
  emit(r.decision, r.reason);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();
