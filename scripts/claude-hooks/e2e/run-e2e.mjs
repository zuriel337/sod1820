#!/usr/bin/env node
// Manual end-to-end proof for the execute_sql guard, using the REAL Claude Code CLI against a FAKE Supabase MCP server
// (fake-supabase-mcp.mjs: no database, no network). Not part of CI: it needs a working `claude` login and costs a few model calls.
//
//   node scripts/claude-hooks/e2e/run-e2e.mjs [--baseline-settings <file>] [--model haiku] [--only <case-id>[,<id>...]]
//
// Each case is one headless `claude -p` run in a throw-away project directory, with --permission-mode dontAsk (a permission
// prompt = denial, which is the non-interactive stand-in for "asks the user"). The verdict is read from the fake server's log:
//   EXECUTED = the call got past the permission layer and reached the server;  BLOCKED = it never did.
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const MODEL = arg("--model") || "haiku";
const BASELINE = arg("--baseline-settings");
const ONLY = arg("--only")?.split(",");

const CONNECTOR_ID = "36df02ef-7229-44d6-bf64-e998fe238ded";
const READ_WORKLOG = "select id, created_at, actor, to_actor, task_key, status from public.work_log_current order by created_at desc limit 20";
// id, settings variant, tool, input, expectation
const CASES = [
  ["new-startup-select", "new", "execute_sql", { query: "select 1 as ok" }, "EXECUTED"],
  ["new-startup-identity", "new", "execute_sql", { query: "select current_user, current_database(), now() as at" }, "EXECUTED"],
  ["new-worklog-read", "new", "execute_sql", { query: READ_WORKLOG }, "EXECUTED"],
  ["new-worklog-recent-for-claude", "new", "execute_sql", { query: "select task_key, status from public.work_log_current where to_actor = 'CLAUDE' and created_at > now() - interval '3 days' order by created_at desc limit 50" }, "EXECUTED"],
  ["new-privilege-check", "new", "execute_sql", { query: "select has_table_privilege('anon', 'public.work_log', 'insert') as anon_insert" }, "EXECUTED"],
  ["new-insert", "new", "execute_sql", { query: "insert into public.e2e_probe (note) values ('x')" }, "BLOCKED"],
  ["new-update", "new", "execute_sql", { query: "update public.e2e_probe set note = 'y'" }, "BLOCKED"],
  ["new-delete", "new", "execute_sql", { query: "delete from public.e2e_probe" }, "BLOCKED"],
  ["new-ddl-create", "new", "execute_sql", { query: "create table public.e2e_probe (id int)" }, "BLOCKED"],
  ["new-ddl-alter", "new", "execute_sql", { query: "alter table public.e2e_probe add column z int" }, "BLOCKED"],
  ["new-grant", "new", "execute_sql", { query: "grant select on public.e2e_probe to anon" }, "BLOCKED"],
  ["new-select-then-drop", "new", "execute_sql", { query: "select 1; drop table public.e2e_probe" }, "BLOCKED"],
  ["new-select-into", "new", "execute_sql", { query: "select * into public.e2e_probe_copy from public.work_log" }, "BLOCKED"],
  ["new-volatile-function", "new", "execute_sql", { query: "select nextval('public.e2e_probe_id_seq')" }, "BLOCKED"],
  ["new-apply-migration-unchanged", "new", "apply_migration", { name: "e2e_probe", query: "create table public.e2e_probe (id int)" }, "BLOCKED"],
  ["new-list-tables-unchanged", "new", "list_tables", {}, "EXECUTED"],
  // the same checks under the connector-id server name that .claude/settings.json also lists (the hook matcher must cover it)
  ["new-connector-id-select", "new", "execute_sql", { query: "select 1 as ok" }, "EXECUTED", { server: CONNECTOR_ID }],
  ["new-connector-id-insert", "new", "execute_sql", { query: "insert into public.e2e_probe (note) values ('x')" }, "BLOCKED", { server: CONNECTOR_ID }],
  // what happens when ANOTHER settings source (user / local / --allowedTools) also pre-approves execute_sql: does the hook's "ask" still hold?
  ["other-source-allows-insert", "new", "execute_sql", { query: "insert into public.e2e_probe (note) values ('x')" }, "BLOCKED", { extraArgs: ["--allowedTools", "mcp__Supabase__execute_sql"] }],
  ["failclosed-hook-missing-select", "nohook", "execute_sql", { query: "select 1 as ok" }, "BLOCKED"],
  ["failclosed-hook-missing-insert", "nohook", "execute_sql", { query: "insert into public.e2e_probe (note) values ('x')" }, "BLOCKED"],
];
if (BASELINE) CASES.push(
  ["baseline-startup-select", "baseline", "execute_sql", { query: "select 1 as ok" }, "EXECUTED"],
  ["baseline-insert-GAP", "baseline", "execute_sql", { query: "insert into public.e2e_probe (note) values ('x')" }, "EXECUTED"],
  ["baseline-ddl-GAP", "baseline", "execute_sql", { query: "create table public.e2e_probe (id int)" }, "EXECUTED"],
  ["baseline-apply-migration", "baseline", "apply_migration", { name: "e2e_probe", query: "create table public.e2e_probe (id int)" }, "BLOCKED"],
);

const SCRUB = ["CLAUDE_CODE_REMOTE", "CLAUDE_CODE_REMOTE_SESSION_ID", "CLAUDE_CODE_REMOTE_SDK_URL", "CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_USE_CCR_V2",
  "CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2", "CLAUDE_CODE_CCR_EVENT_FLUSH_POLICY", "CLAUDE_CODE_CHILD_SESSION", "CLAUDE_CODE_MESSAGING_SOCKET",
  "CLAUDE_CODE_MESSAGING_TOKEN", "CLAUDE_CODE_TEE_SDK_STDOUT", "CLAUDE_CODE_ENTRYPOINT", "CLAUDECODE", "CLAUDE_ADDITIONAL_DIRECTORIES", "CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD"];

function runCase([id, variant, tool, input, expected, opts = {}]) {
  const server = opts.server || "Supabase";
  const dir = mkdtempSync(join(tmpdir(), "sqlguard-e2e-"));
  try {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    if (variant !== "nohook") cpSync(join(REPO, "scripts", "claude-hooks"), join(dir, "scripts", "claude-hooks"), { recursive: true });
    const settingsFile = join(dir, ".claude", "settings.e2e.json");
    copyFileSync(variant === "baseline" ? BASELINE : join(REPO, ".claude", "settings.json"), settingsFile);
    const log = join(dir, "fake-mcp.log");
    writeFileSync(log, "");
    const mcp = { mcpServers: { [server]: { command: process.execPath, args: [join(HERE, "fake-supabase-mcp.mjs")], env: { FAKE_MCP_LOG: log } } } };
    const prompt = "This is an automated permission-harness test against a FAKE Supabase server (there is no real database). "
      + `Call the tool mcp__${server}__${tool} exactly once with exactly this JSON input, unchanged: ${JSON.stringify(input)}\n`
      + "Do not retry, do not call any other tool, do not edit the input. Then reply with one line: the tool result text, or the exact error/denial text you received.";
    const env = { ...process.env, ENABLE_TOOL_SEARCH: "false" };
    for (const k of SCRUB) delete env[k];
    const p = spawnSync("claude", ["-p", prompt, "--model", MODEL, "--no-session-persistence", "--strict-mcp-config", "--mcp-config", JSON.stringify(mcp),
      "--settings", settingsFile, "--setting-sources", "project", "--permission-mode", "dontAsk", "--output-format", "stream-json", "--verbose", ...(opts.extraArgs || [])],
      { cwd: dir, env, encoding: "utf8", timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
    const reached = readFileSync(log, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
    const events = (p.stdout || "").split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const toolUses = events.filter(e => e.type === "assistant").flatMap(e => e.message?.content || []).filter(c => c.type === "tool_use").map(c => c.name);
    const results = events.filter(e => e.type === "user").flatMap(e => e.message?.content || []).filter(c => c.type === "tool_result")
      .map(c => (typeof c.content === "string" ? c.content : JSON.stringify(c.content)).replace(/\s+/g, " ").slice(0, 260));
    const attempted = toolUses.some(n => n === `mcp__${server}__${tool}`);
    const actual = reached.length ? "EXECUTED" : "BLOCKED";
    let verdict = actual === expected ? "PASS" : "FAIL";
    if (!attempted) verdict = "INCONCLUSIVE (model did not call the tool)";
    return { id, variant, tool, expected, actual, verdict, serverCalls: reached.length, detail: results[0] || (p.stderr || "").slice(0, 200) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const selected = CASES.filter(c => !ONLY || ONLY.includes(c[0]));
const rows = [];
for (const c of selected) {
  let r = runCase(c);
  if (r.verdict.startsWith("INCONCLUSIVE")) r = runCase(c); // one retry if the model skipped the call
  rows.push(r);
  console.log(`${r.verdict.padEnd(6)} ${r.id.padEnd(34)} expected=${r.expected.padEnd(8)} actual=${r.actual.padEnd(8)} serverCalls=${r.serverCalls}  | ${r.detail}`);
}
const bad = rows.filter(r => r.verdict !== "PASS");
console.log(`\n${rows.length - bad.length}/${rows.length} cases as expected` + (bad.length ? `; NOT as expected: ${bad.map(r => r.id).join(", ")}` : ""));
process.exit(bad.length ? 1 : 0);
