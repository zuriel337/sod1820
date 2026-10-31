import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ordinaryRazielStages } from "./helpers/raziel-ordinary-stages.mjs";
import { runAiAnalyze, USER_JWT, UID } from "./helpers/ai-analyze-handler.mjs";

// Real handler; only external identity, owner RPCs and model responses are fakes.
// No live network, account, provider call or product DB write occurs in this file.
const edge = readFileSync(new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");
const route = edge.slice(edge.indexOf('if (String(body?.persona || "").toLowerCase() === "raziel")'),
  edge.indexOf('const isCollection = kind === "research"'));
const budgetCalls = run => run.calls.filter(call => call.name === "ai_quota_check");
const plan = () => ({ capability_class: "general_synthesis", strategy: "fixture-plan-guidance",
  minimum_intelligence: "L2_FAST", availability: "available" });
const ordinary = { subject: "הסבר את המושג חסד", facts: "" };
const operatorPlan = () => ({ ...plan(), enabled: true, availability: "operator_read",
  trace: { operator: { capability: "traffic_count", days: 1 } } });

test("ordinary stage anchors reject missing/duplicated quota and model boundaries", () => {
  const stages = ordinaryRazielStages(route);
  assert.ok(stages.deterministic < stages.selector && stages.selector < stages.quota);
  assert.ok(stages.quota < stages.trace && stages.trace < stages.model);
  const quota = "const q = await checkQuota(rBudgetIdentity, tier, rLimitOverride);";
  assert.throws(() => ordinaryRazielStages(route.replace(quota, "")), /boundary missing/);
  assert.throws(() => ordinaryRazielStages(route + quota), /ambiguous boundary/);
  const model = "const rel = await callClaudeReliable({\n        apiKey: ANTHROPIC_KEY, model: rModel, system: rzSys, user,";
  assert.throws(() => ordinaryRazielStages(route.replace(model, "")), /boundary missing/);
  assert.throws(() => ordinaryRazielStages(route + model), /ambiguous boundary/);
});

for (const capability of ["gematria", "els"]) {
  test(`ordinary deterministic ${capability}: zero model and zero AI quota despite a deep request`, async () => {
    const answer = { enabled: true, mode: "deterministic", needs_synthesis: false,
      answer: "תשובת כלי בדיקה", facts: [{ label: capability, value: 73 }], source_of_truth: "synthetic-engine" };
    const run = await runAiAnalyze({ answer, bearer: USER_JWT, verifiedUid: UID, allowed: false,
      body: { ...ordinary, intelligence_level: "deep" } });
    assert.equal(run.status, 200);
    assert.equal(run.models.length, 0);
    assert.equal(budgetCalls(run).length, 0);
    assert.equal(run.calls.filter(call => call.name === "user").length, 1);
    assert.equal(run.calls.filter(call => call.name === "fn_raziel_answer").length, 1);
    assert.equal(run.result.model, "none");
    assert.equal(run.result.raziel.deterministic, true);
    assert.equal(run.result.raziel.facts[0].label, capability);
    assert.equal(run.result.raziel.facts[0].value, 73);
  });
}

for (const fallback of [false, true]) {
  test(`ordinary ${fallback ? "fallback" : "reused"} plan reaches one synthesis after verified identity and quota`, async () => {
    const run = await runAiAnalyze({ answer: fallback ? null : plan(), allowed: true,
      bearer: USER_JWT, verifiedUid: UID,
      body: { ...ordinary, is_admin: true, tier: "admin", context_type: "admin", user_ref: "spoofed-user" },
      extraRoute: ({ url }) => url.pathname.endsWith("/fn_raziel_plan")
        ? new Response(JSON.stringify(plan())) : null });
    assert.equal(run.models.length, 1);
    assert.equal(budgetCalls(run).length, 1);
    assert.equal(run.calls.filter(call => call.name === "user").length, 1);
    const answerCall = run.calls.find(call => call.name === "fn_raziel_answer");
    assert.equal(answerCall.payload.p_context_type, "authenticated_user");
    assert.equal(answerCall.payload.p_user_ref, UID);
    assert.equal(budgetCalls(run)[0].payload.p_tier, "user");
    assert.equal(budgetCalls(run)[0].payload.p_identity, `u:${UID}:f`);
    assert.equal(run.calls.filter(call => call.name === "fn_raziel_plan").length, fallback ? 1 : 0);
    assert.ok(run.calls.findIndex(call => call.name === "user") < run.calls.indexOf(answerCall));
    assert.ok(run.calls.indexOf(answerCall) < run.calls.indexOf(budgetCalls(run)[0]));
    assert.match(run.models[0].user, /fixture-plan-guidance/);
    assert.match(run.models[0].user, /לא אמת, לא תוצאת-כלי/);
    assert.equal(run.result.raziel.plan_meta.executed, false);
  });
}

test("ordinary quota denial cannot be bypassed by client admin/tier flags", async () => {
  const run = await runAiAnalyze({ answer: plan(), allowed: false, bearer: USER_JWT, verifiedUid: UID,
    body: { ...ordinary, is_admin: true, tier: "admin" } });
  assert.equal(run.models.length, 0);
  assert.equal(budgetCalls(run).length, 1);
  assert.equal(budgetCalls(run)[0].payload.p_tier, "user");
  assert.equal(run.result.error, "quota");
  assert.equal(run.result.analysis, null);
  assert.equal(run.result.tier, "user");
});

test("ordinary semantic pack preserves bounded public context, strips tags and drops raw private fields", async () => {
  const run = await runAiAnalyze({ answer: plan(), allowed: true, body: { ...ordinary,
    surface_semantic: { surface: "post", subject: { type: "post", label: "<b>כותרת גלויה</b>",
      body: "PRIVATE-BODY-SENTINEL" }, html: "RAW-HTML-SENTINEL", privateWorkspace: "PRIVATE-WORKSPACE-SENTINEL" } } });
  assert.equal(run.models.length, 1);
  assert.match(run.models[0].user, /כותרת גלויה/);
  assert.doesNotMatch(run.models[0].user, /<b>|PRIVATE-BODY-SENTINEL|RAW-HTML-SENTINEL|PRIVATE-WORKSPACE-SENTINEL/);
  assert.doesNotMatch(JSON.stringify(run.traces), /כותרת גלויה|PRIVATE-BODY-SENTINEL|PRIVATE-WORKSPACE-SENTINEL/);
});

test("ordinary operator capability is unavailable to a non-admin even when client/plan claim admin", async () => {
  const run = await runAiAnalyze({ answer: operatorPlan(), allowed: true,
    bearer: USER_JWT, verifiedUid: UID, body: { ...ordinary, is_admin: true, tier: "admin" } });
  assert.equal(run.models.length, 1);
  assert.equal(run.calls.some(call => call.name === "admin_entries_daily"), false);
  assert.match(run.models[0].user, /אין נתוני-מפעיל/);
});

test("ordinary admin owner denial uses caller JWT, redacts error body, and synthesizes without private data", async () => {
  const run = await runAiAnalyze({ answer: operatorPlan(), allowed: true, role: "admin",
    bearer: USER_JWT, verifiedUid: UID, body: ordinary,
    extraRoute: ({ url }) => url.pathname.endsWith("/admin_entries_daily")
      ? new Response("PRIVATE-OWNER-ERROR-SENTINEL", { status: 403 }) : null });
  const owner = run.calls.filter(call => call.name === "admin_entries_daily");
  assert.equal(owner.length, 1);
  assert.equal(owner[0].headers.authorization, `Bearer ${USER_JWT}`);
  assert.equal(owner[0].headers.apikey, "synthetic-anon-key");
  assert.equal(run.models.length, 1);
  assert.match(run.models[0].user, /אין נתוני-מפעיל/);
  assert.doesNotMatch(JSON.stringify([run.models, run.traces, run.result]), /PRIVATE-OWNER-ERROR-SENTINEL/);
  assert.ok(run.calls.findIndex(call => call.name === "op_trace_begin_v1") < run.calls.indexOf(owner[0]));
});
