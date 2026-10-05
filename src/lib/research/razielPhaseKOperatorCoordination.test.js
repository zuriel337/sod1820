import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const mig = read("../../../supabase/migrations/20261005200000_raziel_intelligence_core_v1_phase_k_operator_coordination_read.sql");
const kBlock = edge.slice(edge.indexOf("// ── Raziel Intelligence Core v1 Phase K"), edge.indexOf("// ── Raziel Intelligence Core v1 Phase J"));
const callSite = edge.slice(edge.indexOf("// Phase K — coordination / attention READ"), edge.indexOf("// Phase E — one operational db_rpc/tool span"));

// Load the REAL Phase K block (types stripped by Node) with stubbed I/O. razielOperatorRpc is stubbed to return the fetch stub's result directly.
function load(fetchImpl, spans = []) {
  const code = stripTypeScriptTypes(
    `type OperationalTraceHandle = any; type RazielOperatorResult = any; type RazielOperatorCap = any; type RazielOperatorCall = any;\n` +
    `const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);\n` +
    `const razielOperatorProject = () => ({ pack: "SYS" });\n` +
    `async function razielOperatorRpc(bearer, call) { return await fetch(call.rpc, bearer); }\n${kBlock}\n`) +
    "\nreturn { RAZIEL_COORD_CAPS, razielCoordDescriptor, razielWorkLogRows, razielCoordProject, runRazielCoordination };";
  return new Function("fetch", "recordOperationalSpan", "crypto", code)(fetchImpl, async (_t, s) => { spans.push(s); }, { randomUUID: () => "uuid" });
}
const ok = (data) => ({ ok: true, data, outcome: "success", ms: 1, error: null });
const now = new Date().toISOString();
const wl = (over = {}) => ({ id: "SECRET-ID", task_key: "T1", topic: "topic t", status: "CLAIMED_WRITE", from_actor: "GPT", to_actor: "CLAUDE", assignment_mode: "WRITE",
  release_authorization_state: "BRANCH_ONLY", created_at: now, what_we_did: "x".repeat(500) + " https://leak.example/dispatch", open_threads: "OPEN-THREAD-TEXT",
  dispatch_session_url: "https://claude.ai/code/cse_x", dispatch_context: { secret: 1 }, dispatch_state: "CLAIMED", dispatch_last_error: "ERR", ...over });

test("Phase K: descriptor only for verified admin + enabled + allowlisted K capability", () => {
  const m = load(async () => ok([]));
  const d = { enabled: true, availability: "operator_read", trace: { operator: { capability: "work_now" } } };
  assert.deepEqual(m.razielCoordDescriptor(d, "admin"), { capability: "work_now", days: null });
  for (const t of ["user", "anon", "ADMIN", ""]) assert.equal(m.razielCoordDescriptor(d, t), null, t);
  assert.equal(m.razielCoordDescriptor({ ...d, enabled: false }, "admin"), null);
  assert.equal(m.razielCoordDescriptor({ ...d, trace: { operator: { capability: "traffic_count" } } }, "admin"), null);
  assert.equal(m.razielCoordDescriptor({ ...d, trace: { operator: { capability: "constructor" } } }, "admin"), null);
});

test("Phase K: non-admin → zero RPC calls (descriptor null, call-site gated on it); caller JWT only, fixed read-only allowlist", () => {
  assert.match(callSite, /if \(!rOpDesc && rCoordDesc\)/);
  assert.match(edge, /rBearer = tier === "admin"/);
  assert.doesNotMatch(kBlock, /SB_SVC|svcHeaders|service_role/);
  assert.deepEqual([...new Set(Object.values(load(async () => ok([])).RAZIEL_COORD_CAPS).flatMap((c) => c.calls.map((x) => x.rpc)))].sort(),
    ["admin_agents_dashboard", "admin_command_center", "admin_system_health", "get_work_log_current"]);
  assert.doesNotMatch(kBlock, /\/rest\/v1\/|site_visits|insert|update public|delete|vercel\.com|api\.github|raw\.githubusercontent/i);
});

test("Phase K: work_log projection is allowlisted, max 12 rows, ≤240 summary, no URLs/ids/open_threads/dispatch fields", () => {
  const m = load(async () => ok([]));
  const rows = m.razielWorkLogRows(Array.from({ length: 30 }, (_, i) => wl({ task_key: "T" + i })));
  assert.equal(rows.length, 30);
  assert.ok(rows.every((r) => r.summary.length <= 240));
  assert.deepEqual(Object.keys(rows[0]).sort(),
    ["_dispatch_state", "assignment_mode", "created_at", "from_actor", "release_authorization_state", "status", "summary", "task_key", "to_actor", "topic"]);
  assert.doesNotMatch(JSON.stringify(rows), /leak\.example|SECRET-ID|OPEN-THREAD|claude\.ai|ERR|secret/);
  const r = m.razielCoordProject("work_active", [Array.from({ length: 30 }, (_, i) => wl({ task_key: "T" + i }))]);
  assert.equal(r.answer.split("\n").filter((l) => l.startsWith("•")).length, 12);
  assert.doesNotMatch(r.answer, /OPEN-THREAD|leak\.example|SECRET-ID|claude\.ai/);
  assert.equal(m.razielWorkLogRows({ not: "array" }), null);
  assert.equal(m.razielCoordProject("work_now", [{ not: "array" }]), null);
});

test("Phase K: coordination answers are labeled COORDINATION_REPORTED, never claim merge/deploy/production", () => {
  const m = load(async () => ok([]));
  for (const cap of ["work_now", "work_active", "work_ready", "work_today"]) {
    const r = m.razielCoordProject(cap, [[wl(), wl({ task_key: "R", status: "READY_TO_DEPLOY", dispatch_state: "COMPLETED" })]]);
    assert.equal(r.basis, "COORDINATION_REPORTED", cap);
    assert.match(r.answer, /work_log/);
    assert.match(r.answer, /COORDINATION_REPORTED/);
    assert.match(r.answer, /לא LIVE_VERIFIED/);
    assert.match(r.answer, /לא אומת/);
  }
  assert.match(m.razielCoordProject("work_ready", [[wl({ status: "READY_TO_DEPLOY", dispatch_state: "X" })]]).answer, /READY_TO_DEPLOY/);
  assert.match(m.razielCoordProject("work_today", [[wl({ created_at: "2001-01-01T00:00:00Z" })]]).answer, /אין פריטים תואמים/);
});

test("Phase K: agents dashboard → max 10 rows, safe fields only (no cost/tokens/models/cron)", () => {
  const m = load(async () => ok([]));
  const data = Array.from({ length: 25 }, (_, i) => ({ agent: "a" + i, role: "r", is_registered_bot: true, calls_1d: 1, calls_30d: 2, last_activity: now,
    cost_usd_all: 99.5, cost_ils_all: 77, in_tokens: 1234, models: "SECRETMODEL", cron: "*/5 * * * *", version: "v9" }));
  const r = m.razielCoordProject("agents_status", [data]);
  assert.equal(r.answer.split("\n").filter((l) => l.startsWith("•")).length, 10);
  assert.doesNotMatch(r.answer, /99\.5|77|1234|SECRETMODEL|\*\/5|v9/);
  assert.equal(m.razielCoordProject("agents_status", [{ x: 1 }]), null);
});

test("Phase K: attention pack = counts / top demand / discoveries only; no recommendation evidence; coordination part labeled", () => {
  const m = load(async () => ok([]));
  const cc = { counters: { recommendations_pending: 3, demand_gaps: 2, worklog_ready_deploy: 1 }, recommendations: [{ evidence: "PRIVATE-EVIDENCE", reason: "PRIVATE-REASON" }],
    top_demand: Array.from({ length: 8 }, (_, i) => ({ key: "k" + i, label: "L" + i, visits: i })),
    recent_discoveries: Array.from({ length: 8 }, (_, i) => ({ value: 100 + i, group_size: 3, kind: "gem", sample: "PRIVATE-SAMPLE" })) };
  const r = m.razielCoordProject("attention", [cc, [wl({ status: "BLOCKED" })], { db: {} }]);
  assert.match(r.pack, /המלצות ממתינות 3/);
  assert.doesNotMatch(r.pack, /PRIVATE/);
  assert.ok((r.pack.match(/L\d\(/g) || []).length <= 5);
  assert.match(r.pack, /COORDINATION_REPORTED/);
  assert.match(r.pack, /לא אומת/);
  assert.equal(m.razielCoordProject("attention", [null, [], {}]), null);
});

test("Phase K: live deploy/repo state → fixed 'not connected' answer, zero RPC, zero spans, no inference", async () => {
  const spans = []; let calls = 0;
  const m = load(async () => { calls++; return ok([]); }, spans);
  const r = await m.runRazielCoordination({ capability: "live_external_state", days: null }, "jwt");
  assert.equal(calls, 0); assert.equal(spans.length, 0);
  assert.equal(r.ok, true); assert.equal(r.basis, "EXTERNAL_NOT_CONNECTED");
  assert.match(r.answer, /טרם מחובר/);
  assert.doesNotMatch(r.answer, /נפרס בהצלחה|מוזג בהצלחה|עלה לפרודקשן/);
});

test("Phase K: one db_rpc span per owner call with caller JWT, no payload in spans; failure → no data", async () => {
  const spans = []; const seen = [];
  const m = load(async (rpc, bearer) => { seen.push([rpc, bearer]); return ok([wl()]); }, spans);
  const r = await m.runRazielCoordination({ capability: "work_now", days: null }, "caller-jwt");
  assert.equal(r.ok, true);
  assert.deepEqual(seen, [["get_work_log_current", "caller-jwt"]]);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].kind, "db_rpc");
  assert.equal(spans[0].detail.privacy.rawPrivatePayloadLogged, false);
  assert.doesNotMatch(JSON.stringify(spans), /SECRET-ID|OPEN-THREAD|leak\.example/);
  const bad = load(async () => ({ ok: false, data: null, outcome: "access_filtered", ms: 1, error: "http_403" }), []);
  const f = await bad.runRazielCoordination({ capability: "attention", days: null }, "jwt");
  assert.equal(f.ok, false); assert.equal(f.answer, undefined); assert.equal(f.pack, undefined); assert.equal(f.outcome, "access_filtered");
});

test("Phase K: call-site answers L0 (no model); pack feeds synthesis; runs before the model call", () => {
  assert.match(callSite, /model: "none", intelligence_level: "deterministic"/);
  assert.match(callSite, /if \(op\.ok && op\.pack\) rOpPack = op\.pack/);
  assert.ok(edge.indexOf("runRazielCoordination(") < edge.indexOf("callClaudeReliable("));
});

test("Phase K: migration extends only fn_raziel_plan; grammar admin-gated; routing OFF; no tables/policies/grants/provider names", () => {
  assert.deepEqual([...mig.matchAll(/create or replace function public\.(\w+)/g)].map((x) => x[1]), ["fn_raziel_plan"]);
  assert.doesNotMatch(mig, /create table|alter table|drop |insert into|update public|grant |routing_enabled\s*=|fn_raziel_model/i);
  assert.doesNotMatch(mig, /anthropic|sonnet|opus|haiku/i);
  for (const c of ["work_now", "work_active", "work_ready", "work_today", "agents_status", "attention", "live_external_state"]) assert.match(mig, new RegExp(`v_cap := '${c}'`));
  assert.match(mig, /operator_coordination/); assert.match(mig, /operator_attention/);
  assert.match(mig, /v_urank = 2/); assert.match(mig, /operator_denied/);
  assert.match(mig, /v_cap := 'attention'[\s\S]*?v_mode := 'synthesis'/);
});
