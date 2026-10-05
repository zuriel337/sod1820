import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectRazielIntelligence, razielEscalationTrigger } from "../../../supabase/functions/_shared/razielIntelligence.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const frame = read("../../components/experience2029/SystemFrame2029.jsx");
const sel = read("../../../supabase/functions/_shared/razielIntelligence.js");
const razielBlock = edge.slice(edge.indexOf('persona || "").toLowerCase() === "raziel"'), edge.indexOf('const isCollection = kind === "research"'));

const L0 = "L0_DETERMINISTIC", L2 = "L2_FAST", L3 = "L3_DEEP";
// plan fixtures mirror razielPlanMeta() output of fn_raziel_plan v2 (Phase A/C). `det` = answered without any model/tool by plan.
const P = (capability_class, minimum_intelligence, extra = {}) => ({ capability_class, minimum_intelligence, route_intent: null, cross_check_required: false, contradictory: false, compare: false, domains: null, executed: false, ...extra });

// Golden matrix — each row: [name, plan, requested, expected selected_level, expected escalation_reason, deterministic_no_model, model_may_run]
// deterministic_no_model=true ⇒ the deterministic short-circuit answers BEFORE the selector/quota/model (selector not consulted).
const MATRIX = [
  ["gematria exact count",                 P("gematria_expression", L0), null,   L0, null, true],
  ["gematria exact + explicit deep (separate interpretive continuation)", P("gematria_expression", L0), "deep", L3, "explicit_deep_request", false],
  ["gematria + fast request",              P("gematria_expression", L0), "fast", L0, null, true],
  ["ELS exact count",                      P("els_search", L0), null,            L0, null, true],
  ["ELS interpretive continuation, no request", P("els_search", L0), null,       L2, null, false],
  ["number context question",              P("general_synthesis", L2, { route_intent: "number_context" }), null, L2, null, false],
  ["post/reading context question",        P("general_synthesis", L2, { route_intent: "reading" }), null, L2, null, false],
  ["no_match general synthesis",           P("general_synthesis", L2, { availability: "no_match" }), null, L2, null, false],
  ["expert unavailable (fail-closed to synthesis, no tool)", P("expert_unavailable", L2, { availability: "unavailable_matched" }), null, L2, null, false],
  ["registered protocol, synthesis",       P("registered_protocol", L2), null,   L2, null, false],
  ["multi_domain route intent",            P("general_synthesis", L2, { route_intent: "multi_domain" }), null, L3, "multi_domain_intent", false],
  ["multi_domain + fast request (fast cannot go below)", P("general_synthesis", L2, { route_intent: "multi_domain" }), "fast", L3, "multi_domain_intent", false],
  ["contradictory cross-check evidence",   P("registered_protocol", L2, { cross_check_required: true, contradictory: true }), null, L3, "contradictory_evidence", false],
  ["cross-check required but not contradictory", P("registered_protocol", L2, { cross_check_required: true }), null, L2, null, false],
  ["bounded compare across >1 domain",     P("general_synthesis", L2, { compare: true, domains: ["gematria", "els"] }), null, L3, "compare_multi_capability", false],
  ["compare within a single domain",       P("general_synthesis", L2, { compare: true, domains: ["gematria"] }), null, L2, null, false],
  ["admin traffic exact count (operator L0)", P("analytics_traffic", L0), null,  L0, null, true],
  ["admin traffic state synthesis",        P("analytics_traffic", L2), null,     L2, null, false],
  ["admin system overview synthesis",      P("system_live_state", L2), null,     L2, null, false],
  ["admin AI cost exact (operator L0)",    P("system_live_state", L0), null,     L0, null, true],
  ["admin research demand synthesis",      P("research_intelligence", L2), null, L2, null, false],
  ["admin system read + multi-domain+contradiction stays only on evidence", P("system_live_state", L2, { route_intent: "multi_domain" }), null, L3, "multi_domain_intent", false],
  ["non-admin asking admin question: ordinary synthesis, no admin data", P("general_synthesis", L2, { availability: "no_match" }), null, L2, null, false],
  ["explicit deep on plain question",      P("general_synthesis", L2), "deep",   L3, "explicit_deep_request", false],
  ["explicit fast on plain question",      P("general_synthesis", L2), "fast",   L2, null, false],
  ["fast request vs plan minimum L3",      P("general_synthesis", L3), "fast",   L3, null, false],
  ["long generic question: no escalation", P("general_synthesis", L2, { reason: "x".repeat(200) }), null, L2, null, false],
  ["'use all power' wording is not a selector (no plan evidence)", P("general_synthesis", L2), null, L2, null, false],
  ["missing plan: fail-closed lowest sufficient", null, null,                    L2, null, false],
  ["unknown minimum_intelligence value: lowest sufficient", P("general_synthesis", "L9_MAX"), null, L2, null, false],
];

test("Golden: matrix covers >=20 scenarios across all required families", () => {
  assert.ok(MATRIX.length >= 20);
  const names = MATRIX.map((m) => m[0]).join(" | ");
  for (const k of [/gematria/, /ELS/, /number context/, /post\/reading/, /no_match/, /compare/, /traffic/, /system/, /AI cost/, /research/, /non-admin/, /explicit deep/, /fast request vs plan minimum/]) assert.match(names, k);
});

for (const [name, plan, requested, level, reason, deterministic] of MATRIX) {
  test(`Golden: ${name}`, () => {
    const r = selectRazielIntelligence({ plan, requested });
    const expectedLevel = deterministic ? L0 : level;
    if (deterministic) {
      // The deterministic short-circuit owns this case in ai-analyze (before selector/quota/model). If the selector is ever
      // consulted for an L0 plan it must never pick an LLM tier above L2 without an explicit deep request.
      assert.ok(plan.minimum_intelligence === L0);
      assert.ok(r.selected_level === L2 || r.selected_level === L3);
      assert.equal(r.escalation_reason, requested === "deep" ? "explicit_deep_request" : null);
      return;
    }
    assert.equal(r.selected_level, expectedLevel);
    assert.equal(r.escalation_reason, reason);
    assert.equal(r.model_tier, expectedLevel === L3 ? "deep" : "fast");
    assert.equal(r.may_run_model, true);                       // selector only runs once model path is legitimately reached
    assert.equal(r.requested_level, requested === "deep" ? L3 : requested === "fast" ? L2 : null);
  });
}

test("Golden: explicit fast never lowers below plan minimum; flagged as overridden", () => {
  const r = selectRazielIntelligence({ plan: P("general_synthesis", L3), requested: "fast" });
  assert.equal(r.selected_level, L3);
  assert.equal(r.request_overridden, true);
  assert.equal(r.requested_level, L2);
  const ok = selectRazielIntelligence({ plan: P("general_synthesis", L2), requested: "fast" });
  assert.equal(ok.request_overridden, false);
});

test("Golden: L0 deterministic is never auto-promoted to an LLM; only an explicit deep continuation raises it", () => {
  for (const extra of [{ route_intent: "multi_domain" }, { compare: true, domains: ["a", "b"] }, { cross_check_required: true, contradictory: true }]) {
    const r = selectRazielIntelligence({ plan: P("gematria_expression", L0, extra), requested: null });
    assert.equal(r.selected_level, L2);
    assert.equal(r.escalation_reason, null);
  }
});

test("Golden: selector is semantic-only — no tier/admin/length/subscription/provider/L4/L5 inputs", () => {
  const code = sel.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(code, /\btier\b|admin|subscri|identity|\.length > \d{2,}|claude|anthropic|sonnet|haiku|opus|L4|L5|process\.env|Deno|fetch\(/i);
  assert.equal(razielEscalationTrigger({ route_intent: "single" }), null);
  assert.equal(razielEscalationTrigger(null), null);
});

test("Golden: wiring — selector decides after deterministic path, before quota/model; L2→FAST_MODEL, L3→MODEL", () => {
  const iDet = razielBlock.indexOf("det.needs_synthesis === false");
  const iSel = razielBlock.indexOf("selectRazielIntelligence(");
  const iQuota = razielBlock.indexOf("checkQuota(");
  const iModel = razielBlock.indexOf("callClaudeReliable(");
  assert.ok(iDet > 0 && iDet < iSel && iSel < iQuota && iQuota < iModel);
  assert.match(razielBlock, /rFast \? FAST_MODEL : MODEL/);
  assert.match(razielBlock, /requested_level: rSel\.requested_level, selected_level: rSel\.selected_level, escalation_reason: rSel\.escalation_reason/);
  assert.match(razielBlock, /\.\.\.rSelMeta/);                       // operational trace span detail
  assert.match(razielBlock, /intelligence_selection: rSelMeta/);     // response (both contract and string paths)
  assert.match(razielBlock, /contract\.intelligence_selection = rSelMeta/);
});

test("Golden: smart routing stays OFF — no fn_raziel_model / routing_enabled / L4-L5 execution in the request path", () => {
  assert.doesNotMatch(razielBlock, /fn_raziel_model|routing_enabled|L4|L5|sandalphon|research_intel/i);
  assert.doesNotMatch(edge, /routing_enabled\s*=\s*true/);
  assert.equal((edge.match(/callClaudeReliable\(/g) || []).length, 1);
  assert.equal((razielBlock.match(/fetchRazielPersona\(/g) || []).length, 1);
  assert.equal((razielBlock.match(/fetchMetatronContext\(/g) || []).length, 1);
  assert.ok(razielBlock.indexOf("checkQuota(") > 0);
  assert.match(razielBlock, /razielRemember\(/);
});

test("Golden: no model/tool call on chat open; bounded semantic surface context; model only on send", () => {
  const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
  assert.doesNotMatch(chat, /useEffect/);
  assert.match(chat, /surfaceSemantic: buildSurfaceSemantic\(\)/);
  const fn = edge.slice(edge.indexOf("function razielSemanticSurfaceText"), edge.indexOf("function razielPlanMeta"));
  assert.match(fn, /\.slice\(0, 700\)/);
  assert.doesNotMatch(fn, /innerHTML|pageText/);
});

test("Golden: no false tool-run claim — plan stays executed:false and the guidance block says nothing ran", () => {
  assert.match(edge, /executed: false/);
  assert.match(edge, /שום כלי לא הורץ/);
  assert.match(edge, /לא הורצה בבקשה זו — אל תציג ערך מחושב ואל תטען שהרצת כלי/);
});

test("Golden: non-admin denial fails closed — operator descriptor requires verified admin tier and allowlisted capability", () => {
  const fn = edge.slice(edge.indexOf("function razielOperatorDescriptor"), edge.indexOf("async function razielOperatorRpc"));
  assert.match(fn, /tier !== "admin"[\s\S]*return null/);
  assert.match(fn, /RAZIEL_OPERATOR_CAPS, cap/);
});

test("Golden: plan metadata additions stay semantic (no provider names)", () => {
  const meta = edge.slice(edge.indexOf("function razielPlanMeta"), edge.indexOf("function razielPlanBlockText"));
  assert.match(meta, /route_intent/);
  assert.doesNotMatch(meta, /claude|anthropic|sonnet|opus|haiku|gpt/i);
});
