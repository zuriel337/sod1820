#!/usr/bin/env node
// Unit tests for scripts/claude-hooks/execute-sql-guard.mjs (the PreToolUse guard for the Supabase MCP `execute_sql` tool).
// Run:  node --test scripts/test-execute-sql-guard.mjs
// Not wired into CI or any workflow: it only tests a local developer-tool hook and touches no site code.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { classifySql } from "./claude-hooks/execute-sql-guard.mjs";

const GUARD = fileURLToPath(new URL("./claude-hooks/execute-sql-guard.mjs", import.meta.url));

// --- must stay UNBLOCKED (no prompt): startup check, work_log reads, catalog / privilege checks -----------------------------
const ALLOW = {
  "AGENTS.md startup read-only connection check": "select 1 as ok",
  "startup identity probe": "select current_user, current_database(), now() as at",
  "startup, trailing semicolon": "select 1;",
  "work_log_current latest rows": "select id, created_at, actor, to_actor, task_key, status from public.work_log_current order by created_at desc limit 20",
  "work_log_current for CLAUDE, last 3 days": "select * from work_log_current where to_actor = 'CLAUDE' and created_at > now() - interval '3 days' order by created_at desc limit 50",
  "work_log scan with text search": "select task_key, left(summary, 200) as s from public.work_log where task_key ilike '%MAIN_2029%' and status in ('open','blocked') order by id desc limit 10",
  "work_log count by actor": "select actor, count(*) as n, max(created_at) as last_at from public.work_log group by actor order by n desc",
  "CTE read": "with recent as (select * from public.work_log_current order by created_at desc limit 5) select actor, count(*) from recent group by actor",
  "json aggregation": "select jsonb_agg(jsonb_build_object('id', id, 'task', task_key)) from public.work_log_current limit 1",
  "privilege check": "select has_table_privilege('anon', 'public.work_log', 'insert') as anon_insert, has_table_privilege('authenticated', 'public.work_log', 'select') as auth_select",
  "function privilege check": "select has_function_privilege('anon', 'public.some_rpc(text)', 'execute')",
  "catalog read (pg_policies)": "select schemaname, tablename, policyname, cmd from pg_policies where schemaname = 'public' order by 1, 2, 3",
  "information_schema read": "select table_name from information_schema.tables where table_schema = 'public' order by 1",
  "view definition read": "select pg_get_viewdef('public.work_log_current'::regclass, true)",
  "function definition read": "select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'x'",
  "keyword inside a string literal": "select id from public.work_log where summary = 'DROP TABLE x; delete from y' limit 1",
  "keyword inside a comment": "select 1 -- insert into x values (1)\n",
  "keyword inside a block comment": "select /* update foo set a = 1; */ 2",
  "keyword inside a dollar-quoted string": "select $q$ delete from t; $q$ as txt",
  "keyword as quoted identifier": 'select "delete", "update" from public.t limit 1',
  "doubled quote inside a string": "select 'it''s; drop table t' as s",
  "cast and extract": "select cast(created_at as date), extract(epoch from now())::int from public.work_log limit 1",
  "window function": "select id, row_number() over (partition by actor order by created_at desc) from public.work_log limit 5",
};

// --- must require approval ("ask"): writes, DDL, privilege changes, multi-statement, unknown/volatile functions --------------
const ASK = {
  "INSERT": "insert into public.work_log (actor) values ('CLAUDE')",
  "INSERT with RETURNING": "insert into public.work_log (actor) values ('CLAUDE') returning id",
  "UPDATE": "update public.work_log set status = 'done' where id = 1",
  "DELETE": "delete from public.work_log where id = 1",
  "MERGE": "merge into t using s on t.id = s.id when matched then delete",
  "TRUNCATE": "truncate public.work_log",
  "CREATE TABLE": "create table public.x (id int)",
  "CREATE FUNCTION": "create or replace function public.f() returns int language sql as $$ select 1 $$",
  "ALTER TABLE": "alter table public.work_log add column z int",
  "DROP TABLE": "drop table public.work_log",
  "DROP POLICY": "drop policy p on public.work_log",
  "GRANT": "grant select on public.work_log to anon",
  "REVOKE": "revoke all on public.work_log from anon",
  "CREATE POLICY": "create policy p on public.work_log for select using (true)",
  "COMMENT ON": "comment on table public.work_log is 'x'",
  "SET ROLE": "set role postgres",
  "RESET": "reset all",
  "BEGIN": "begin",
  "COMMIT": "commit",
  "VACUUM": "vacuum public.work_log",
  "REFRESH MATERIALIZED VIEW": "refresh materialized view public.mv",
  "NOTIFY": "notify chan, 'x'",
  "COPY": "copy public.work_log to program 'cat'",
  "DO block": "do $$ begin delete from t; end $$",
  "CALL": "call public.proc()",
  "EXECUTE (prepared)": "execute stmt",
  "PREPARE": "prepare s as delete from t",
  "EXPLAIN ANALYZE of a write": "explain analyze delete from public.work_log",
  "SELECT then DROP": "select 1; drop table public.work_log",
  "DROP hidden after a comment": "select 1; -- harmless\n drop table public.work_log",
  "two plain SELECTs": "select 1; select 2",
  "data-modifying CTE (delete)": "with d as (delete from public.work_log where id = 1 returning *) select * from d",
  "data-modifying CTE (insert)": "with i as (insert into t default values returning id) select id from i",
  "SELECT INTO": "select * into public.copy_of_log from public.work_log",
  "SELECT FOR UPDATE": "select * from public.work_log where id = 1 for update",
  "SELECT FOR SHARE": "select * from public.work_log where id = 1 for share",
  "SELECT FOR NO KEY UPDATE": "select * from public.work_log for no key update",
  "TABLE shorthand": "table public.work_log",
  "VALUES shorthand": "values (1), (2)",
  "SELECT of a user-defined function": "select public.some_rpc(1)",
  "SELECT of a SECURITY DEFINER admin function": "select public.admin_set_role('x', 'admin')",
  "schema-qualified user function": "select app.do_something()",
  "pg_sleep": "select pg_sleep(30)",
  "set_config": "select set_config('role', 'postgres', false)",
  "nextval": "select nextval('public.work_log_id_seq')",
  "setval": "select setval('public.work_log_id_seq', 1)",
  "pg_terminate_backend": "select pg_terminate_backend(123)",
  "pg_advisory_lock": "select pg_advisory_lock(1)",
  "lo_import": "select lo_import('/etc/passwd')",
  "pg_read_file": "select pg_read_file('/etc/passwd')",
  "dblink": "select * from dblink('host=x', 'delete from t') as t(a int)",
  "E'' string": "select E'abc\\' ; drop table t; --'",
  "U&'' string": "select U&'\\0041'",
  "backslash in a standard string": "select 'a\\' ; drop table t; -- '",
  "backslash-quote that hides a DROP when standard_conforming_strings is off": "select '\\'' ; drop table t; --'",
  "unterminated string": "select 'abc",
  "unterminated quoted identifier": 'select "abc',
  "unterminated block comment": "select 1 /* never closed",
  "unterminated dollar quote": "select $a$ never closed",
  "NUL byte": "select 1\u0000; drop table t",
  "empty": "",
  "whitespace only": "   \n  ",
  "only a comment": "-- nothing here",
  "only a semicolon": ";",
  "non-string input (null)": null,
  "non-string input (object)": { q: "select 1" },
  "oversized": "select " + "1,".repeat(11000) + "1",
  "starts with a symbol": "(select 1)",
  "nested block comment hiding a statement": "select 1 /* /* */ ; drop table t; /* */",
};

for (const [name, sql] of Object.entries(ALLOW)) {
  test(`allow: ${name}`, () => {
    const r = classifySql(sql);
    assert.equal(r.decision, "allow", `expected allow, got ${r.decision} (${r.reason}) for: ${String(sql).slice(0, 120)}`);
  });
}

for (const [name, sql] of Object.entries(ASK)) {
  test(`ask: ${name}`, () => {
    const r = classifySql(sql);
    assert.equal(r.decision, "ask", `expected ask, got ${r.decision} (${r.reason}) for: ${String(sql).slice(0, 120)}`);
  });
}

// --- the hook process contract (stdin JSON in, JSON decision out) ------------------------------------------------------------
function runHook(payload, raw) {
  const p = spawnSync(process.execPath, [GUARD], { input: raw ?? JSON.stringify(payload), encoding: "utf8" });
  return { status: p.status, out: p.stdout ? JSON.parse(p.stdout) : null, raw: p.stdout, err: p.stderr };
}

test("hook: read-only SELECT on the cloud MCP server name -> allow", () => {
  const r = runHook({ tool_name: "mcp__Supabase__execute_sql", tool_input: { query: "select 1" } });
  assert.equal(r.status, 0);
  assert.equal(r.out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(r.out.hookSpecificOutput.permissionDecision, "allow");
});

test("hook: read-only SELECT on the connector-id server name -> allow", () => {
  const r = runHook({ tool_name: "mcp__36df02ef-7229-44d6-bf64-e998fe238ded__execute_sql", tool_input: { query: "select * from public.work_log_current limit 3" } });
  assert.equal(r.out.hookSpecificOutput.permissionDecision, "allow");
});

test("hook: write -> ask, with the approval reason", () => {
  const r = runHook({ tool_name: "mcp__Supabase__execute_sql", tool_input: { query: "delete from public.work_log" } });
  assert.equal(r.out.hookSpecificOutput.permissionDecision, "ask");
  assert.match(r.out.hookSpecificOutput.permissionDecisionReason, /ZURIEL/);
  assert.match(r.out.hookSpecificOutput.permissionDecisionReason, /apply_migration/);
});

test("hook: DDL -> ask", () => {
  const r = runHook({ tool_name: "mcp__Supabase__execute_sql", tool_input: { query: "alter table public.work_log disable row level security" } });
  assert.equal(r.out.hookSpecificOutput.permissionDecision, "ask");
});

test("hook: missing query field -> ask", () => {
  const r = runHook({ tool_name: "mcp__Supabase__execute_sql", tool_input: {} });
  assert.equal(r.out.hookSpecificOutput.permissionDecision, "ask");
});

test("hook: unreadable input -> ask (fail closed)", () => {
  const r = runHook(null, "this is not json");
  assert.equal(r.out.hookSpecificOutput.permissionDecision, "ask");
});

test("hook: empty stdin -> ask (fail closed)", () => {
  const r = runHook(null, "");
  assert.equal(r.out.hookSpecificOutput.permissionDecision, "ask");
});

test("hook: other tools are left alone (no output, no opinion)", () => {
  for (const tool of ["mcp__Supabase__apply_migration", "mcp__Supabase__list_tables", "mcp__Supabase__deploy_edge_function", "Bash", "mcp__Supabase__execute_sql_extra"]) {
    const r = runHook({ tool_name: tool, tool_input: { query: "select 1" } });
    assert.equal(r.status, 0, tool);
    assert.equal(r.raw, "", `no output expected for ${tool}`);
  }
});

test("hook: a read-only SELECT never leaks an 'allow' for a multi-statement string", () => {
  const r = runHook({ tool_name: "mcp__Supabase__execute_sql", tool_input: { query: "select 1; insert into t values (1)" } });
  assert.equal(r.out.hookSpecificOutput.permissionDecision, "ask");
});
