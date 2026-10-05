import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const mig = read("../../../supabase/migrations/20261005140000_raziel_intelligence_core_v1_phase_c_operator_read.sql");
const razielBlock = edge.slice(edge.indexOf('persona || "").toLowerCase() === "raziel"'), edge.indexOf('const isCollection = kind === "research"'));
const phaseC = edge.slice(edge.indexOf("// ── Raziel Intelligence Core v1 Phase C"), edge.indexOf("Deno.serve("));

// Execute the real pure helpers (types stripped) with stubbed runtime globals.
const stub = `const SB_URL="https://x.test", SB_ANON="anon"; const recordOperationalSpan=async()=>{}; const crypto=globalThis.crypto;\n`;
const mod = await import("data:text/javascript;base64," + Buffer.from(
  stripTypeScriptTypes(stub + phaseC + "\nexport { razielContextFromTier, razielOperatorDescriptor, razielOperatorProject, RAZIEL_OPERATOR_CAPS };")).toString("base64"));

test("Phase C: context_type is derived from the server-validated tier only", () => {
  assert.equal(mod.razielContextFromTier("admin"), "admin");
  assert.equal(mod.razielContextFromTier("user"), "authenticated_user");
  assert.equal(mod.razielContextFromTier("anon"), "public_user");
  assert.equal(mod.razielContextFromTier("ADMIN"), "public_user");
  assert.doesNotMatch(razielBlock, /body\??\.(context_type|is_admin|admin|tier)/);
});

test("Phase C: identity resolved once, BEFORE plan call, and reused by the quota check", () => {
  assert.equal((razielBlock.match(/resolveIdentity\(/g) || []).length, 1);
  assert.ok(razielBlock.indexOf("resolveIdentity(") < razielBlock.indexOf("rpc/fn_raziel_answer"));
  assert.ok(razielBlock.indexOf("det.needs_synthesis === false") < razielBlock.indexOf("checkQuota("));
  assert.match(razielBlock, /p_context_type: rCtxType, p_user_ref: rVerifiedRef/);
  assert.doesNotMatch(razielBlock, /p_context_type: "public_user"/);
});

test("Phase C: operator runs only for verified admin + flag-enabled + allowlisted capability", () => {
  const ok = { enabled: true, availability: "operator_read", trace: { operator: { capability: "traffic_count", days: 1 } } };
  assert.deepEqual(mod.razielOperatorDescriptor(ok, "admin"), { capability: "traffic_count", days: 1 });
  for (const t of ["user", "anon", "ADMIN", ""]) assert.equal(mod.razielOperatorDescriptor(ok, t), null, t);
  assert.equal(mod.razielOperatorDescriptor({ ...ok, enabled: false }, "admin"), null);
  assert.equal(mod.razielOperatorDescriptor({ ...ok, availability: "no_match" }, "admin"), null);
  assert.equal(mod.razielOperatorDescriptor({ ...ok, trace: { operator: { capability: "drop_everything" } } }, "admin"), null);
  assert.equal(mod.razielOperatorDescriptor({ ...ok, trace: { operator: { capability: "constructor" } } }, "admin"), null);
});

test("Phase C: owner RPCs use the CALLER JWT (never service role) with a fixed read-only allowlist", () => {
  const call = phaseC.slice(phaseC.indexOf("async function razielOperatorRpc"), phaseC.indexOf("function razielOperatorProject"));
  assert.match(call, /apikey: SB_ANON, Authorization: `Bearer \$\{bearer\}`/);
  assert.doesNotMatch(call, /SB_SVC|svcHeaders|service_role/);
  assert.match(razielBlock, /rBearer = tier === "admin"/);
  assert.deepEqual([...new Set(Object.values(mod.RAZIEL_OPERATOR_CAPS).map((c) => c.rpc))].sort(),
    ["admin_ai_tokens", "admin_system_health", "admin_traffic", "fn_raziel_research_intel_scoped"]);
  assert.doesNotMatch(phaseC, /site_visits|\/rest\/v1\/(?!rpc)|\.from\(|insert|update public|delete/i);
});

test("Phase C: every owner call is a db_rpc span with owner, outcome, latency, output-use and no private payload", () => {
  const run = phaseC.slice(phaseC.indexOf("async function runRazielOperator"));
  assert.match(run, /kind: "db_rpc"/);
  assert.match(run, /owner_ref: cap\.owner/);
  assert.match(run, /latency_ms: r\.ms/);
  assert.match(run, /output_use: ok \? "used" : "not_applicable"/);
  assert.match(run, /rawPrivatePayloadLogged: false/);
  assert.match(phaseC, /access_filtered/);
});

test("Phase C: exact traffic count is a deterministic projection; no invented number", () => {
  const d = { total_visitors: 120, total_visits: 340, today: 17 };
  const today = mod.razielOperatorProject("traffic_count", d, 1);
  assert.match(today.answer, /17 מבקרים ייחודיים/);
  assert.match(today.answer, /UTC/);
  const week = mod.razielOperatorProject("traffic_count", d, 7);
  assert.match(week.answer, /120 מבקרים/);
  assert.equal(mod.razielOperatorProject("traffic_count", { today: "17" }, 1), null);
  assert.equal(mod.razielOperatorProject("traffic_count", null, 1), null);
});

test("Phase C: AI cost keeps EXACT/UNKNOWN labels and never invents ILS or cost", () => {
  const full = mod.razielOperatorProject("ai_cost_week", { total: { calls: 10, cost_usd: 1.2, cost_ils: 4.4, priced_calls: 10, unpriced_calls: 0, pricing_complete: true } }, 7);
  assert.equal(full.basis, "EXACT");
  assert.match(full.answer, /₪4\.4/);
  const noIls = mod.razielOperatorProject("ai_cost_week", { total: { calls: 10, cost_usd: 1.2, cost_ils: 0, priced_calls: 10, unpriced_calls: 0, pricing_complete: true } }, 7);
  assert.match(noIls.answer, /לא ידוע/);
  assert.ok(noIls.facts.some((f) => f.value === "UNKNOWN"));
  const part = mod.razielOperatorProject("ai_cost_week", { total: { calls: 10, cost_usd: 0.5, cost_ils: 1.8, priced_calls: 4, unpriced_calls: 6, pricing_complete: false } }, 7);
  assert.equal(part.basis, "EXACT_PRICED_ONLY");
  assert.match(part.answer, /6 קריאות ללא תמחור/);
  assert.equal(mod.razielOperatorProject("ai_cost_week", { total: { calls: 3, cost_usd: 0, cost_ils: 0, priced_calls: 0, unpriced_calls: 3, pricing_complete: false } }, 7).basis, "UNKNOWN");
  assert.equal(mod.razielOperatorProject("ai_cost_week", { total: {} }, 7), null);
});

test("Phase C: research demand fails closed unless the owner itself confirmed admin", () => {
  assert.equal(mod.razielOperatorProject("research_demand", { authorized_admin: false, public: { x: 1 } }, null), null);
  assert.equal(mod.razielOperatorProject("research_demand", { public: { x: 1 } }, null), null);
  assert.ok(mod.razielOperatorProject("research_demand", { authorized_admin: true, public: { x: 1 }, admin: { pending_candidates: 2 } }, null).pack);
});

test("Phase C: system pack is bounded aggregates (no job commands, no chat ids, no object paths)", () => {
  const h = { db: { connections: 5, max_connections: 60 }, cron: [{ job_name: "a", active: true, failures_24h: 2, command: "SECRET" }],
    bots: { outbox_pending: 1, outbox_failed: 0 }, security: { unacked: 0 }, usage: { ai_cost_usd_7d: 3, ai_cost_basis: "EXACT" }, media: { storage: { x: 1 } } };
  const r = mod.razielOperatorProject("system_overview", h, null);
  assert.ok(r.pack.length <= 1800);
  assert.match(r.pack, /a×2/);
  assert.doesNotMatch(r.pack, /SECRET|command/);
});

test("Phase C: failure path = no admin data; operator span, then ordinary synthesis; L0 answers skip the model", () => {
  assert.match(razielBlock, /if \(op\.ok && op\.answer\)/);
  assert.match(razielBlock, /model: "none", intelligence_level: "deterministic"/);
  assert.ok(razielBlock.indexOf("runRazielOperator(") > razielBlock.indexOf("beginOperationalTrace("));
  assert.ok(razielBlock.indexOf("runRazielOperator(") > razielBlock.indexOf("checkQuota("));
  assert.ok(razielBlock.indexOf("runRazielOperator(") < razielBlock.indexOf("callClaudeReliable("));
  assert.match(edge, /אין נתוני-מפעיל; אל תמציא נתונים/);
});

test("Phase C: migration extends only fn_raziel_plan; no tables/policies/registries; routing stays OFF; no provider names", () => {
  const defs = [...mig.matchAll(/create or replace function public\.(\w+)/g)].map((m) => m[1]);
  assert.deepEqual(defs, ["fn_raziel_plan"]);
  assert.doesNotMatch(mig, /create table|alter table|drop |insert into|update public|grant |routing_enabled\s*=|fn_raziel_model/i);
  assert.doesNotMatch(mig, /claude|anthropic|sonnet|opus|haiku|gpt/i);
  assert.match(mig, /v_urank = 2/);
  assert.match(mig, /operator_denied/);
});

test("Phase C: out of scope stays out — no writes/actions, no roadmap/github/vercel integration, global routing OFF", () => {
  assert.doesNotMatch(phaseC, /roadmap|github|vercel\.com|api\.vercel/i);
  assert.doesNotMatch(razielBlock, /routing_enabled\s*=|fn_raziel_model/);
});
